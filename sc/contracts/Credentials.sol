// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract Credentials {
    constructor() {}

    mapping(address => string) public credentials;

    event SetCredential(address account, string did);

    function setCredential(string memory did) public {
         require(bytes(did).length != 0, "Improper DID");
        address sender = msg.sender;
        credentials[sender] = did;
        emit SetCredential(sender, did);
    }
}
