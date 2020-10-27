pragma solidity ^0.5.11;

contract MultiSig {
    event SubmitTransaction(address indexed owner, uint indexed txIndex, address indexed to, bytes data);
    event ConfirmTransaction(address indexed owner, uint  indexed txIndex);
    event RevokeConfirmation(address indexed owner, uint  indexed txIndex);
    event ExecuteTransaction(address indexed owner, uint  indexed txIndex);
    
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint public numConfirmationsRequired;
    
    struct Transaction {
        address to;
        bytes data;
        bool executed;
        mapping(address => bool) isConfirmed;
        uint numConfirmations;
    }
    
    Transaction[] public transactions;
    
    constructor(address[] memory _owners, uint _numConfirmationsRequired) {
        require(_owners.length > 0, "Owners required");
        require(_numConfirmationsRequired > 0 &&  _numConfirmationsRequired <= _owners.length, "Invalid number of required confirmations");
        
        for (uint i = 0;  i < _owners.length; i++) {
            address owner = _owners[i];
            
            require(owner != address(0), "Invalid owner");
            require(!isOwner[owner], "Owner not unique");
            
            isOwner[owner] = true;
            owners.push(owner);
        }
        
        numConfirmationsRequired = _numConfirmationsRequired;
    }
    
    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not owner");
        _;
    }
    
    function submitTransaction(address _to, bytes memory _data) public onlyOwner {
        uint txIndex = transactions.length;
        
        transactions.push(Transaction({
            to: _to,
            data: _data,
            executed:  false,
            numConfirmations: 0
        }));
        
        emit SubmitTransaction(msg.sender, txIndex, _to, _data);
    }

    modifier txExists(uint256 _txIndex) {
        require(_txIndex < transactions.length, "Tx does not exists");
        _;
    }

    modifier notExecuted(uint256 _txIndex) {
        require(!transactions[_txIndex].executed, "Tx already executed");
        _;
    }

    function splitSignature(bytes memory _sig) public pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(_sig.length == 65, "Invalid signatures length");

        // Divide the signature in r, s and v variables
        assembly {
            r := mload(add(_sig, 32))
            s := mload(add(_sig, 64))
            v := byte(0, mload(add(_sig, 96)))
        }
    }

    function execute(bytes32[] hashes, uint8[] signatures, uint256 _txIndex) public {
        require(signatures.length >= numConfirmationsRequired, "Invalid number of required signatures");

        Transaction storage transaction = transactions[_txIndex];

        for (uint i = 0; i < numConfirmationsRequired; i++) {
            bytes32 signedMsgHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hashes[i]));
            (bytes32 r, bytes32 s, uint8 v) = splitSignature(signatures[i]);
            address recovered = ecrecover(signedMsgHash, v, r, s);

            if (isOwner[recovered]) {
                require(
                    !transactions[_txIndex].isConfirmed[recovered,
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

        (bool success, ) = transaction.to.call.value(0)(
            transaction.data
        );

        require(success, "Tx failed");
        transaction.executed = true;

        emit ExecuteTransaction(msg.sender, _txIndex);
    }

}