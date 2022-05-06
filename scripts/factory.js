const { ethers } = require("hardhat");

async function main() {
    const Ticket = await ethers.getContractFactory("Ticket");
    const block = await ethers.provider.getBlock("latest");
    const ticket = await Ticket.deploy(
        "http://localhost:3000/",
        block.timestamp,
        block.timestamp + 86400
    );

    await ticket.deployed();
    console.log('Ticket contract deployed to:', ticket.address);

    const Factory = await ethers.getContractFactory("Factory");
    const factory = await Factory.deploy();
    await factory.deployed();
    console.log('Factory contract deployed to:', factory.address);

    const upgradeProxy = await factory.deploy(1);
    console.log('Upgradeable Proxy contract: ', upgradeProxy);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
