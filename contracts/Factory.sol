// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "./UpgradeableProxy.sol";

contract Factory {
    address public admin;

    event ProxyCreated(address proxy);

    constructor() public {
        admin = msg.sender;
    }

    function deploy(uint256 _salt) external returns (address) {
        require(msg.sender == admin, "Not admin");
        address payable addr;
        bytes memory code = type(UpgradeableProxy).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(_salt, admin));

        assembly {
            addr := create2(0, add(code, 0x20), mload(code), salt)
            // if iszero(extcodesize(addr)) {
            //     revert(0, 0)
            // }
        }

        UpgradeableProxy proxy = UpgradeableProxy(addr);

        emit ProxyCreated(address(proxy));

        return address(proxy);
    }
}
