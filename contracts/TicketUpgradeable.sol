// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";

contract TicketUpgradeable is ERC721EnumerableUpgradeable, OwnableUpgradeable {
    using Strings for uint256;

    bool public paused;

    string public baseURI;
    string public baseExtension;

    address[] private players;
    address[] private winners;

    uint256 public ticketPrice; // For test
    uint256 public startDate;
    uint256 public endDate;

    event BuyTicket(
        address indexed buyer,
        uint256 indexed ticketId,
        uint256 createdAt
    );

    event PickWinner(
        address indexed winner,
        uint256 createdAt
    );

    function initialize(
        string memory _initBaseURI,
        uint256 _startDate,
        uint256 _endDate,
        uint256 _ticketPrice
    ) initializer public {
        __ERC721_init("NFTLottery", "NL");
        __Ownable_init();

        baseURI = _initBaseURI;
        startDate = _startDate;
        endDate = _endDate;
        ticketPrice = _ticketPrice;

        paused = false;
        baseExtension = ".json";
    }

    function buyTicket() external payable {
        require(msg.value >= ticketPrice, "Invalid price");
        require(!paused, "Sale is paused");
        require(block.timestamp >= startDate && block.timestamp <= endDate, "Can't buy now");

        uint256 supply = totalSupply();
        _mint(msg.sender, supply);
        players.push(msg.sender);

        emit BuyTicket(msg.sender, supply, block.timestamp);
    }

    function pickWinner() external onlyOwner {
        require(block.timestamp > endDate, "Not finished lottery");
        require(players.length > 0, "No buyer");

        uint index = random(players.length);
        address newWinner = players[index];
        // Transfer 50% of the gathered funds to the winner
        (bool sent, ) = payable(newWinner).call{value: address(this).balance / 2}("");
        require(sent);
        // Add a new winner to the list of winners
        winners.push(newWinner);
        // Empty the old lottery ticket and start a new lottery ticket
        players = new address[](0);

        emit PickWinner(newWinner, block.timestamp);
    }

    // This function defines a specific range for the random number generator.
    // For example, if you input 100 as a "_number", it will generate any random number ranging from 0-99.
    function random(uint _number) public view returns (uint) {
        return uint(keccak256(abi.encodePacked(block.timestamp, block.difficulty, address(this)))) % _number;
    }

    function getPlayers() external view returns (address[] memory) {
        return players;
    }

    function getWinners() external view returns (address[] memory) {
        return winners;
    }

    // Functions that only the owner can call
    function pause(bool _state) external onlyOwner {
        paused = _state;
    }

    function setTicketPrice(uint256 _newPrice) external onlyOwner {
        ticketPrice = _newPrice;
    }

    function setSaleDate(uint256 _startDate, uint256 _endDate)
        external
        onlyOwner
    {
        require(
            _endDate > _startDate,
            "startDate should be less than endDate"
        );
        startDate = _startDate;
        endDate = _endDate;
    }

    function setBaseURI(string memory _newBaseURI) external onlyOwner {
        baseURI = _newBaseURI;
    }

    function setBaseExtension(string memory _newBaseExtension)
        external
        onlyOwner
    {
        baseExtension = _newBaseExtension;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );

        string memory currentBaseURI = _baseURI();
        return
            bytes(currentBaseURI).length > 0
                ? string(
                    abi.encodePacked(
                        currentBaseURI,
                        tokenId.toString(),
                        baseExtension
                    )
                )
                : "";
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }
}
