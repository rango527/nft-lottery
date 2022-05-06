const { ethers, upgrades } = require("hardhat");

async function main() {
  const TicketUpgradeable = await ethers.getContractFactory("TicketUpgradeable");
  const block = await ethers.provider.getBlock("latest");
  const ticketPrice = ethers.utils.parseEther("0.1"); // 0.1 ether = 100000000000000000

  const ticket = await upgrades.deployProxy(
    TicketUpgradeable,
    [
      "http://localhost:3000/",
      block.timestamp,
      block.timestamp + 86400,
      ticketPrice
    ]
  );

  await ticket.deployed();

  console.log("Ticket proxy contract deployed to:", ticket.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
