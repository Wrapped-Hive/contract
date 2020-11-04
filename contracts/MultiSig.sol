pragma solidity >=0.4.22 <0.7.0;

contract MultiSig {
    event Deposit(address indexed sender, uint256 amount, uint256 balance);
    event AddedOwner(address indexed owner);
    event RemovedOwner(address indexed owner);
    event SubmitTransaction(
        address indexed owner,
        uint256 indexed txIndex,
        address indexed to,
        bytes data
    );
    event SubmitModifyOwner(
        address indexed owner,
        uint256 indexed modifyOwnerIndex,
        bool indexed add
    );
    event ExecuteTransaction(address indexed owner, uint256 indexed txIndex);

    mapping(address => bool) public isOwner;
    uint256 public numOwners;

    struct Transaction {
        address to;
        bytes data;
        bool executed;
        mapping(address => bool) isConfirmed;
        uint256 numConfirmations;
    }

    struct ModifyOwner {
        address owner;
        bool executed;
        bool add;
        mapping(address => bool) isConfirmed;
        uint256 numConfirmations;
    }

    Transaction[] public transactions;
    ModifyOwner[] public modifyOwners;

    constructor(address[] memory _owners) public {
        require(_owners.length > 0, "Owners required");

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];

            require(owner != address(0), "Invalid owner");
            require(!isOwner[owner], "Owner not unique");

            isOwner[owner] = true;
            numOwners++;
        }
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

    modifier modifyOwnerExists(uint256 _modifyOwnerIndex) {
        require(
            _modifyOwnerIndex < modifyOwners.length,
            "Modify Owner does not exists"
        );
        _;
    }

    modifier modifyOwnerNotExecuted(uint256 _modifyOwnerIndex) {
        require(
            !modifyOwners[_modifyOwnerIndex].executed,
            "Modify Owner already executed"
        );
        _;
    }

    function eightyPercentSigned(uint256 sigsCount)
        internal
        view
        returns (bool)
    {
        uint256 eightyPercentRequiredConfirmations = (numOwners * 80) / 100;
        return sigsCount >= eightyPercentRequiredConfirmations;
    }

    function submitModifyOwner(address _owner, bool add) public onlyOwner {
        uint256 mOwnerIndex = modifyOwners.length;

        modifyOwners.push(
            ModifyOwner({
                owner: _owner,
                add: add,
                executed: false,
                numConfirmations: 0
            })
        );

        emit SubmitModifyOwner(_owner, mOwnerIndex, add);
    }

    function modifyOwner(
        uint256 _mOwnerIndex,
        uint8[] memory sigV,
        bytes32[] memory sigR,
        bytes32[] memory sigS
    )
        public
        onlyOwner
        modifyOwnerExists(_mOwnerIndex)
        modifyOwnerNotExecuted(_mOwnerIndex)
    {
        ModifyOwner storage modifingOwner = modifyOwners[_mOwnerIndex];
        address owner = modifingOwner.owner;

        for (uint256 i = 0; i < sigR.length; i++) {
            address recovered = verifyModifyOwnerSigs(
                owner,
                modifingOwner.add,
                sigV[i],
                sigR[i],
                sigS[i]
            );

            if (isOwner[recovered]) {
                require(
                    !modifingOwner.isConfirmed[recovered],
                    "Duplicate signer for modifying owner"
                );

                modifingOwner.isConfirmed[recovered] = true;
                modifingOwner.numConfirmations += 1;
            }
        }

        bool pass = eightyPercentSigned(modifingOwner.numConfirmations);
        require(pass, "Not enough confirmation signatures");

        if (modifingOwner.add == true) {
            require(!isOwner[owner], "Already a owner");

            isOwner[owner] = true;
            numOwners++;
            emit AddedOwner(owner);
        } else {
            isOwner[owner] = false;
            numOwners--;
            emit RemovedOwner(owner);
        }

        modifingOwner.executed = true;
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

    function execute(
        uint256 _txIndex,
        uint8[] memory sigV,
        bytes32[] memory sigR,
        bytes32[] memory sigS
    ) public onlyOwner txExists(_txIndex) notExecuted(_txIndex) {
        require(sigV.length == sigR.length, "Signatures mismatch");
        require(sigR.length == sigS.length, "Signatures mismatch");

        bool pass = eightyPercentSigned(sigV.length);
        require(pass, "Cannot execute tx, not enough confirmation signatures");

        Transaction storage transaction = transactions[_txIndex];

        for (uint256 i = 0; i < sigV.length; i++) {
            address recovered = verify(
                transaction.to,
                transaction.data,
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

        bool passII = eightyPercentSigned(transaction.numConfirmations);
        require(
            passII,
            "Cannot execute tx, not enough confirmation signatures"
        );

        (bool success, ) = transaction.to.call.value(0)(transaction.data);

        require(success, "Tx failed");
        transaction.executed = true;

        emit ExecuteTransaction(msg.sender, _txIndex);
    }

    function verify(
        address _to,
        bytes memory data,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS
    ) internal pure returns (address) {
        // This recreates the message hash that was signed on the client.
        bytes32 hash = keccak256(abi.encodePacked(_to, data));
        bytes32 messageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
        );

        address signer = ecrecover(messageHash, sigV, sigR, sigS);
        return signer;
    }

    function verifyModifyOwnerSigs(
        address owner,
        bool _modifyOwner,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS
    ) internal pure returns (address) {
        // This recreates the message hash that was signed on the client.
        bytes32 hash = keccak256(
            abi.encodePacked(owner, _modifyOwner)
        );
        bytes32 messageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
        );

        address signer = ecrecover(messageHash, sigV, sigR, sigS);
        return signer;
    }
}
