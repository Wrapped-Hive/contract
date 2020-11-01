pragma solidity >=0.4.22 <0.7.0;

contract MultiSig {
    event Deposit(address indexed sender, uint256 amount, uint256 balance);
    event SubmitTransaction(
        address indexed owner,
        uint256 indexed txIndex,
        address indexed to,
        bytes data
    );
    event ConfirmTransaction(address indexed owner, uint256 indexed txIndex);
    event RevokeConfirmation(address indexed owner, uint256 indexed txIndex);
    event ExecuteTransaction(address indexed owner, uint256 indexed txIndex);

    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public numConfirmationsRequired;
    mapping(address => mapping(uint256 => bool)) seenNonces;

    struct Transaction {
        address to;
        bytes data;
        bool executed;
        mapping(address => bool) isConfirmed;
        uint256 numConfirmations;
    }

    Transaction[] public transactions;

    constructor(address[] memory _owners, uint256 _numConfirmationsRequired)
        public
    {
        require(_owners.length > 0, "Owners required");
        require(
            _numConfirmationsRequired > 0 &&
                _numConfirmationsRequired <= _owners.length,
            "Invalid number of required confirmations"
        );

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];

            require(owner != address(0), "Invalid owner");
            require(!isOwner[owner], "Owner not unique");

            isOwner[owner] = true;
            owners.push(owner);
        }

        numConfirmationsRequired = _numConfirmationsRequired;
    }

    function() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    function receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not owner");
        _;
    }

    modifier txExists(uint256 _txIndex) {
        require(_txIndex < transactions.length, "Tx does not exists");
        _;
    }

    modifier notExecuted(uint256 _txIndex) {
        require(!transactions[_txIndex].executed, "Tx already executed");
        _;
    }

    function submitTransaction(address _to, bytes memory _data)
        public
        onlyOwner
    {
        uint256 txIndex = transactions.length;

        transactions.push(
            Transaction({
                to: _to,
                data: _data,
                executed: false,
                numConfirmations: 0
            })
        );

        emit SubmitTransaction(msg.sender, txIndex, _to, _data);
    }

    function confirmTransaction(uint256 _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];

        transaction.isConfirmed[msg.sender] = true;
        transaction.numConfirmations += 1;

        emit ConfirmTransaction(msg.sender, _txIndex);
    }

    function revokeConfirmation(uint256 _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];

        transaction.isConfirmed[msg.sender] = false;
        transaction.numConfirmations -= 1;

        emit RevokeConfirmation(msg.sender, _txIndex);
    }

    function executeTransaction(uint256 _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];

        require(
            transaction.numConfirmations >= numConfirmationsRequired,
            "Cannot execute tx"
        );

        transaction.executed = true;

        (bool success, ) = transaction.to.call.value(0)(transaction.data);
        require(success, "Tx failed");

        emit ExecuteTransaction(msg.sender, _txIndex);
    }

    function executeWithOffChainSigs(
        uint256 nonce,
        uint256 _txIndex,
        uint8[] memory sigV,
        bytes32[] memory sigR,
        bytes32[] memory sigS
    ) public txExists(_txIndex) notExecuted(_txIndex) {
        require(
            sigV.length >= numConfirmationsRequired,
            "Invalid number of required signatures"
        );

        Transaction storage transaction = transactions[_txIndex];

        for (uint256 i = 0; i < numConfirmationsRequired; i++) {
            address recovered = verify(
                nonce,
                _txIndex,
                sigV[i],
                sigR[i],
                sigS[i]
            );

            if (isOwner[recovered]) {
                require(
                    !transactions[_txIndex].isConfirmed[recovered],
                    "Duplicate signer for one transaction"
                );

                transaction.isConfirmed[recovered] = true;
                transaction.numConfirmations += 1;
            }
        }

        require(
            transaction.numConfirmations >= numConfirmationsRequired,
            "Cannot execute tx, not enough confirmations"
        );

        (bool success, ) = transaction.to.call.value(0)(transaction.data);

        require(success, "Tx failed");
        transaction.executed = true;

        emit ExecuteTransaction(msg.sender, _txIndex);
    }

    function verify(
        uint256 nonce,
        uint256 _txIndex,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS
    ) public returns (address) {
        // This recreates the message hash that was signed on the client.
        bytes32 hash = keccak256(abi.encodePacked(nonce, _txIndex));
        bytes32 messageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
        );

        // Verify that the message's signer is the owner of the order

        // address signer = recover(messageHash, signature);
        address signer = ecrecover(messageHash, sigV, sigR, sigS);

        require(!seenNonces[signer][nonce], "Duplicate nonce");
        seenNonces[signer][nonce] = true;
        return signer;
    }
}
