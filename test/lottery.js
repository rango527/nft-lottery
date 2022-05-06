const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("NFT Lottery contract test", function () {
    let ticketContract;
    let ceo;
    let user1;
    let user2;
    let user3;
    let user4;
    let user5;
    let users = [];
    let block;

    const initBaseURI = "http://localhost:3000/";
    const limitTime = 86400; // 1 day
    const ticketPrice = ethers.utils.parseEther("0.1"); // 0.1 eth

    beforeEach(async function () {
        [ceo, user1, user2, user3, user4, user5, ...addrs] =
            await ethers.getSigners();
        users = [user1, user2, user3, user4, user5];

        block = await ethers.provider.getBlock("latest");
        const TicketContract = await ethers.getContractFactory("Ticket");
        ticketContract = await TicketContract.deploy(initBaseURI, block.timestamp, block.timestamp + limitTime);

        // set new ticket price
        await ticketContract.connect(ceo).setTicketPrice(ticketPrice);
        expect(await ticketContract.ticketPrice()).to.equal(ticketPrice);
    });

    describe("BuyTicket", function () {
        describe("Success cases", function () {
            it("Should buy ticket", async function () {
                // initial contract balance after deployment should be 0
                expect(await ethers.provider.getBalance(ticketContract.address)).to.equal(0);

                block = await ethers.provider.getBlock("latest");
                // execute buyTicket and check BuyTicket event
                expect(await ticketContract.connect(user1).buyTicket({ value: ticketPrice })).to.emit(
                    ticketContract, "BuyTicket"
                ).withArgs(user1.address, 0, block.timestamp);

                // check the contract balance after executing buyTicket
                expect(await ethers.provider.getBalance(ticketContract.address)).to.equal(
                    ticketPrice
                );

                // check the players storage variable
                let players = await ticketContract.getPlayers();
                expect(players.length).to.equal(1);
                expect(players[0]).to.equal(user1.address);

                await ticketContract.connect(user2).buyTicket({ value: ticketPrice });
                // check the contract balance
                expect(await ethers.provider.getBalance(ticketContract.address)).to.equal(
                    ticketPrice.mul(2)
                );

                // check the players storage variable
                players = await ticketContract.getPlayers();
                expect(players.length).to.equal(2);
                expect(players[1]).to.equal(user2.address);
            });
            it("Should pick winner", async function () {
                const playersBalance = [];
                for (let index = 0; index < users.length; index++) {
                    await ticketContract.connect(users[index]).buyTicket({ value: ticketPrice });
                    // save all player's eth balance before choosing a winner
                    // this is necessary because every player's eth balance is
                    // different after purchasing a ticket due to transaction gas fees
                    playersBalance[users[index].address] =
                        await ethers.provider.getBalance(users[index].address);
                }

                // check the players storage variable
                let players = await ticketContract.getPlayers();
                expect(players.length).to.equal(5);

                // estimate the reward awarded to the winner
                // 50% of the gathered funds
                const totalFunds = await ethers.provider.getBalance(
                    ticketContract.address
                );
                const rewardsToWinner = totalFunds.div(2);

                // increase time by limit time to end the ticket sales period
                await ethers.provider.send("evm_increaseTime", [limitTime]);
                await ethers.provider.send("evm_mine", []);

                let tx = await ticketContract.connect(ceo).pickWinner();
                let receipt = await tx.wait();
                let winnerAddress;
                // get PickWinner event
                receipt.events?.filter(async (x) => {
                    expect(x.event).to.equal("PickWinner");
                    winnerAddress = x.args?.winner;
                });

                // check the contract's balance
                expect(await ethers.provider.getBalance(ticketContract.address)).to.equal(
                    rewardsToWinner
                );
                // check the winner's balance
                expect(await ethers.provider.getBalance(winnerAddress)).to.equal(
                    playersBalance[winnerAddress].add(rewardsToWinner)
                );
                // check the winners storage variable
                const winners = await ticketContract.getWinners();
                expect(winners.length).to.equal(1);
                expect(winners[0]).to.equal(winnerAddress);
                // check the players storage variable
                players = await ticketContract.getPlayers();
                expect(players.length).to.equal(0);
            });
            it("Should users can purchase multiple tickets", async function () {
                await ticketContract.connect(user1).buyTicket({ value: ticketPrice });
                await ticketContract.connect(user1).buyTicket({ value: ticketPrice });
                await ticketContract.connect(user1).buyTicket({ value: ticketPrice });
                // check the players storage variable
                let players = await ticketContract.getPlayers();
                expect(players.length).to.equal(3);
                expect(players[0]).to.equal(user1.address);
                expect(players[1]).to.equal(user1.address);
                expect(players[2]).to.equal(user1.address);
            });
        });

        describe("Fail cases", function () {
            it("Should fail if try to buy at a price lower than the ticket price", async function () {
                await expect(
                    ticketContract.connect(user1).buyTicket({ value: ticketPrice.div(2) })
                ).to.be.revertedWith("Invalid price");
            });
            it("Should fail if sale is paused", async function () {
                await ticketContract.connect(ceo).pause(true);

                await expect(
                    ticketContract.connect(user1).buyTicket({ value: ticketPrice })
                ).to.be.revertedWith("Sale is paused");
            });
            it("Should fail if try to purchase a ticket outside of a limited time period.", async function () {
                // set the purchase time as not yet started
                await ticketContract.connect(ceo).setSaleDate(block.timestamp + 100, block.timestamp + 1000);
                await expect(
                    ticketContract.connect(user1).buyTicket({ value: ticketPrice })
                ).to.be.revertedWith("Can't buy now");

                // set the purchase time ends
                await ticketContract.connect(ceo).setSaleDate(block.timestamp - 1000, block.timestamp - 100);
                await expect(
                    ticketContract.connect(user1).buyTicket({ value: ticketPrice })
                ).to.be.revertedWith("Can't buy now");
            });
            it("Should fail if try to pick a winner before ending limited time", async function () {
                // set the purchase time as not yet started
                await ticketContract.connect(ceo).setSaleDate(block.timestamp, block.timestamp + 1000);
                await expect(
                    ticketContract.connect(ceo).pickWinner()
                ).to.be.revertedWith("Not finished lottery");
            });
            it("Should fail if try to pick a winner without player", async function () {
                await ticketContract.connect(ceo).setSaleDate(block.timestamp - 1000, block.timestamp - 100);
                await expect(
                    ticketContract.connect(ceo).pickWinner()
                ).to.be.revertedWith("No buyer");
            });
            it("Should fail if try to pick a winner again after picking a winner", async function () {
                // set buy a ticket
                await ticketContract.connect(user1).buyTicket({ value: ticketPrice });
                // increase time by limit time to end the ticket sales period
                await ethers.provider.send("evm_increaseTime", [limitTime]);
                await ethers.provider.send("evm_mine", []);
                // first pick a winner
                await ticketContract.connect(ceo).pickWinner();
                // second pick a winner should be fail
                await expect(
                    ticketContract.connect(ceo).pickWinner()
                ).to.be.revertedWith("No buyer");
            });
        });
    });
});
