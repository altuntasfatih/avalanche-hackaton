//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract MarketPlace is Ownable {
    string _name;
    bool _isActive;
    uint256 _publishFee;

    mapping(string => Product) _waitingProducts;

    Product[] _inSaleProducts;
    Product[] _soldProdcuts;

    enum ProductState {
        WAITING,
        INSALE,
        SOLD
    }
    struct Product {
        string id;
        address owner;
        ProductState status;
        uint256 price;
    }

    constructor(string memory name, uint256 publishFee) {
        _name = name;
        _publishFee = publishFee;
        _isActive = true;
        emit MarketPlaceCreated(name, _msgSender(), publishFee);
    }

    function getCurrent()
        public
        view
        returns (
            string memory,
            bool,
            uint256,
            address,
            Product[] memory,
            Product[] memory
        )
    {
        return (
            _name,
            _isActive,
            _publishFee,
            owner(),
            _inSaleProducts,
            _soldProdcuts
        );
    }

    function PutOnSale(
        string memory id,
        string memory authToken,
        uint256 price
    ) public payable onlyMarketActive {
        require(msg.value == _publishFee, "Insufficient publish fee");
        Product memory product = Product(
            id,
            _msgSender(),
            ProductState.WAITING,
            price
        );
        _waitingProducts[id] = product;
        emit PutOnSaleRequestReceived(id, _msgSender(), price, authToken);
    }

    function approveSaleRequest(string memory productId) public onlyOwner {
        require(isInWaitList(productId), "This productId is invalid");
        Product memory product = _waitingProducts[productId];
        product.status = ProductState.INSALE;
        _inSaleProducts.push(product);

        emit PutOnSaleRequestApproved(productId, product.owner, product.price);
    }

    function changeMarketStatus(bool newState) public onlyOwner {
        require(_isActive != newState, "State is already same");
        _isActive = newState;
        emit MarketPlaceStateChanged(newState);
    }

    function isInWaitList(string memory id) public view returns (bool) {
        return _waitingProducts[id].owner != address(0x0);
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

    event PutOnSaleRequestReceived(
        string id,
        address owner,
        uint256 price,
        string token
    );
    event PutOnSaleRequestApproved(string id, address owner, uint256 price);
    event MarketPlaceStateChanged(bool newState);
}
