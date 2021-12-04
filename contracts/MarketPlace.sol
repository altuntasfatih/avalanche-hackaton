//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract MarketPlace is Ownable {
    string _name;
    bool _isActive;
    uint256 _publishFee;

    mapping(string => Product) _products;

    enum ProductState {
        WAITING,
        ONSALE,
        SOLD
    }
    struct Product {
        string id;
        address owner;
        ProductState state;
        uint256 price;
    }

    constructor(string memory name, uint256 publishFee) {
        _name = name;
        _publishFee = publishFee;
        _isActive = true;
        emit MarketPlaceCreated(name, _msgSender(), publishFee);
    }

    function requestNewListing(
        string memory productId,
        string memory authToken,
        uint256 price
    ) public payable onlyMarketActive {
        require(msg.value == _publishFee, "Insufficient publish fee");
        Product memory product = Product(
            productId,
            _msgSender(),
            ProductState.WAITING,
            price
        );
        _products[productId] = product;
        emit ListingRequestReceived(productId, _msgSender(), price, authToken);
    }

    function putListing(string memory productId, uint256 price) public payable {
        require(msg.value == _publishFee, "Insufficient publish fee");
        Product storage product = _getProduct(productId);
        require(
            product.state == ProductState.SOLD,
            "This productId is not expected state"
        );
        require(
            product.owner == _msgSender(),
            "Only owner of product put on listing"
        );
        product.price = price;
        product.state = ProductState.ONSALE;
        emit ProductListed(productId, _msgSender(), price);
    }

    function approveRequestListing(string memory productId) public onlyOwner {
        Product storage product = _getProduct(productId);
        require(
            product.state == ProductState.WAITING,
            "This productId is not expected state"
        );
        product.state = ProductState.ONSALE;
        emit ListingRequestApproved(productId, product.owner, product.price);
    }

    function removeFromListing(string memory productId, string memory token)
        public
    {
        Product storage product = _getProduct(productId);
        require(
            product.state == ProductState.SOLD,
            "This productId is not expected state"
        );
        require(
            product.owner == _msgSender(),
            "Only owner of product remove from listing"
        );
        emit ListingRemoved(productId, token, _msgSender());
    }

    function buy(string memory productId) public payable onlyMarketActive {
        Product storage product = _getProduct(productId);
        require(
            product.state == ProductState.ONSALE,
            "The product is not OnSale status"
        );
        require(msg.value == product.price, "Insufficient msg.value to buy");
        address seller = product.owner;

        payable(seller).transfer(product.price);

        product.owner = _msgSender();
        product.state = ProductState.SOLD;

        emit ProductSold(productId, seller, _msgSender(), msg.value);
    }

    function deactivate() public onlyOwner {
        require(_isActive == true, "Market is already deactivated");
        _isActive = false;
        emit MarketDeactivated();
    }

    function activate() public onlyOwner {
        require(_isActive == false, "Market is already activated");
        _isActive = true;
        emit MarketActivated();
    }

    function getProduct(string memory productId)
        public
        view
        returns (Product memory)
    {
        return getProduct(productId);
    }

    function _getProduct(string memory productId)
        private
        view
        returns (Product storage)
    {
        Product storage product = _products[productId];
        require(product.owner != address(0x0), "The product is not exist");
        return product;
    }

    modifier onlyMarketActive() {
        require(_isActive, "The markets is not active");
        _;
    }

    event MarketPlaceCreated(
        string marketName,
        address owner,
        uint256 publishFee
    );
    event MarketDeactivated();
    event MarketActivated();
    event ListingRequestReceived(
        string productId,
        address owner,
        uint256 price,
        string token
    );
    event ListingRequestApproved(
        string productId,
        address owner,
        uint256 price
    );
    event ProductListed(string productId, address owner, uint256 price);
    event ListingRemoved(string productId, string token, address owner);

    event ProductSold(
        string productId,
        address seller,
        address buyer,
        uint256 price
    );
}
