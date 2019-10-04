pragma solidity ^0.4.24;
/* pragma experimental ABIEncoderV2; */

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/apps-token-manager/contracts/TokenManager.sol";

contract AirdropDuo is AragonApp {

    struct Airdrop {
      bytes32 root;
      string dataURI;
      mapping(address => bool) awarded;
    }

    /// Events
    event Start(uint id);
    event Award(uint id, address recipient, uint token0Amount, uint token1Amount);

    /// State
    mapping(uint => Airdrop) public airdrops;
    TokenManager public token0Manager;
    TokenManager public token1Manager;
    uint public airdropsCount;

    /// ACL
    bytes32 constant public START_ROLE = keccak256("START_ROLE");

    // Errors
    string private constant ERROR = "ERROR";
    string private constant ERROR_PERMISSION = "PERMISSION";
    string private constant ERROR_NOT_FOUND = "NOT_FOUND";
    string private constant ERROR_INVALID = "INVALID";

    function initialize(address _token0Manager, address _token1Manager) onlyInit public {
        initialized();

        token0Manager = TokenManager(_token0Manager);
        token1Manager = TokenManager(_token1Manager);
    }

    /**
     * @notice Start a new airdrop `_root` / `_dataURI`
     * @param _root New airdrop merkle root
     * @param _dataURI Data URI for airdrop data
     */
    function start(bytes32 _root, string _dataURI) auth(START_ROLE) public {
        _start(_root, _dataURI);
    }

    function _start(bytes32 _root, string _dataURI) internal returns(uint id){
        id = ++airdropsCount;    // start at 1
        airdrops[id] = Airdrop(_root, _dataURI);
        emit Start(id);
    }

    /**
     * @notice Award from airdrop
     * @param _id Airdrop id
     * @param _recipient Recepient of award
     * @param _token0Amount The token0 amount
     * @param _token1Amount The token1 amount
     * @param _proof Merkle proof to correspond to data supplied
     */
    function award(uint _id, address _recipient, uint256 _token0Amount, uint256 _token1Amount, bytes32[] _proof) public {
        Airdrop storage airdrop = airdrops[_id];

        bytes32 hash = keccak256(_recipient, _token0Amount, _token1Amount);
        require( validate(airdrop.root, _proof, hash), ERROR_INVALID );

        require( !airdrops[_id].awarded[_recipient], ERROR_PERMISSION );

        airdrops[_id].awarded[_recipient] = true;

        token0Manager.mint(_recipient, _token0Amount);
        token1Manager.mint(_recipient, _token1Amount);

        emit Award(_id, _recipient, _token0Amount, _token1Amount);
    }

    /**
     * @notice Award from airdrop
     * @param _ids Airdrop ids
     * @param _recipient Recepient of award
     * @param _token0Amounts The token0 amounts
     * @param _token1Amounts The currency amount
     * @param _proofs Merkle proofs
     * @param _proofLengths Merkle proof lengths
     */
    function awardFromMany(uint[] _ids, address _recipient, uint[] _token0Amounts, uint[] _token1Amounts, bytes _proofs, uint[] _proofLengths) public {

        uint totalToken0Amount;
        uint totalToken1Amount;

        uint marker = 32;

        for (uint i = 0; i < _ids.length; i++) {
            uint id = _ids[i];

            bytes32[] memory proof = extractProof(_proofs, marker, _proofLengths[i]);
            marker += _proofLengths[i]*32;

            bytes32 hash = keccak256(_recipient, _token0Amounts[i], _token1Amounts[i]);
            require( validate(airdrops[id].root, proof, hash), ERROR_INVALID );

            require( !airdrops[id].awarded[_recipient], ERROR_PERMISSION );

            airdrops[id].awarded[_recipient] = true;

            totalToken0Amount += _token0Amounts[i];
            totalToken1Amount += _token1Amounts[i];

            emit Award(id, _recipient, _token0Amounts[i], _token1Amounts[i]);
        }

        token0Manager.mint(_recipient, totalToken0Amount);
        token1Manager.mint(_recipient, totalToken1Amount);

    }

    /**
     * @notice Award from airdrop
     * @param _id Airdrop ids
     * @param _recipients Recepients of award
     * @param _token0Amounts The karma amount
     * @param _token1Amounts The currency amount
     * @param _proofs Merkle proofs
     * @param _proofLengths Merkle proof lengths
     */
    function awardToMany(uint _id, address[] _recipients, uint[] _token0Amounts, uint[] _token1Amounts, bytes _proofs, uint[] _proofLengths) public {

        uint marker = 32;

        for (uint i = 0; i < _recipients.length; i++) {
            address recipient = _recipients[i];

            if( airdrops[_id].awarded[recipient] )
                continue;

            airdrops[_id].awarded[recipient] = true;

            bytes32[] memory proof = extractProof(_proofs, marker, _proofLengths[i]);
            marker += _proofLengths[i]*32;

            bytes32 hash = keccak256(recipient, _token0Amounts[i], _token1Amounts[i]);
            if( !validate(airdrops[_id].root, proof, hash) )
                continue;

            token0Manager.mint(recipient, _token0Amounts[i]);
            token1Manager.mint(recipient, _token1Amounts[i]);

            emit Award(_id, recipient, _token0Amounts[i], _token1Amounts[i]);
        }

    }

    function extractProof(bytes _proofs, uint _marker, uint proofLength) public pure returns (bytes32[] proof) {

        proof = new bytes32[](proofLength);

        bytes32 el;

        for (uint j = 0; j < proofLength; j++) {
            assembly {
                el := mload(add(_proofs, _marker))
            }
            proof[j] = el;
            _marker += 32;
        }

    }

    function validate(bytes32 root, bytes32[] proof, bytes32 hash) public pure returns (bool) {

        for (uint i = 0; i < proof.length; i++) {
            if (hash < proof[i]) {
                hash = keccak256(hash, proof[i]);
            } else {
                hash = keccak256(proof[i], hash);
            }
        }

        return hash == root;
    }

    /**
     * @notice Check if address:`_recipient` claimed in airdrop:`_id`
     * @param _id Airdrop id
     * @param _recipient Recipient to check
     */
    function awarded(uint _id, address _recipient) public view returns(bool) {
        return airdrops[_id].awarded[_recipient];
    }

    function bytes32ToBytes(bytes32 data) public pure returns (bytes result) {
        uint len = 0;
        while (len < 32 && uint(data[len]) != 0) {
            ++len;
        }

        assembly {
            result := mload(0x40)
            mstore(0x40, add(result, and(add(add(len, 0x20), 0x1f), not(0x1f))))
            mstore(result, len)
            mstore(add(result, 0x20), data)
        }
    }
}
