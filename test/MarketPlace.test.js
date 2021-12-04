
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { boolean } = require('hardhat/internal/core/params/argumentTypes');
const MarketPlace = artifacts.require('MarketPlace');

// Start test block
contract('MarketPlace', function ([owner, user1, user2, user3, user4, user5, user6]) {

    const marketName = 'EA_GAMES';
    const publishFee = new BN(100000);

    beforeEach(async function () {
        this.market = await MarketPlace.new(marketName, publishFee, { from: owner });
    });

    it('emit ListingRequestReceived event', async function () {
        //given
        const productId = "1234";
        const token = "eych";
        const price = new BN(100000);

        //when
        const receipt = await this.market.requestNewListing(productId, token, price, { from: user1, value: publishFee })

        //then
        expectEvent(receipt, 'ListingRequestReceived', { productId: productId, owner: user1, price: price, token: token });
    });

    it('revert requestNewListing call when publish fee is insufficient', async function () {

        //when
        const result = this.market.requestNewListing("1234", "eych", new BN(100000), { from: user1, value: 1 })

        //then
        await expectRevert(result, 'Insufficient publish fee');
    });

    it('revert requestNewListing call when market contract is deactivated', async function () {
        //given
        await deactivate(this.market)

        //when
        const result = this.market.requestNewListing("1234", "eych", new BN(100000), { from: user1, value: 1 })

        //then
        await expectRevert(result, 'The markets is not active');
    });

    it('emit ListingRequestApproved event', async function () {
        //given
        const productId = "1234";
        const token = "eych";
        const price = new BN(100000);
        await this.market.requestNewListing(productId, token, price, { from: user1, value: publishFee })

        //when
        const receipt = await this.market.approveRequestListing(productId, { from: owner })

        //then
        expectEvent(receipt, 'ListingRequestApproved', { productId: productId, owner: user1, price: price });
    });

    it('revert approveRequestListing call when productId is not found', async function () {
        //given
        const productId = "1234";

        //when
        const result = this.market.approveRequestListing(productId, { from: owner })

        //then
        await expectRevert(result, 'The product is not exist');
    });
    /*
    it('get Products which are inSale', async function () {
        //given
        await addItemForSale(this.market, 'product-1', 'token-1', new BN(100000), user1);
        await addItemForSale(this.market, 'product-2', 'token-2', new BN(100000), user2);
        await addItemForSale(this.market, 'product-3', 'token-3', new BN(100000), user3);
        this receipt addItemForSale(this.market, 'product-4', 'token-4', new BN(100000), user4);

        //when

        console.log(this.market.filters.ContractEvent())

        //then
        expect(result).to.have.lengthOf(4);
    });
    */

    it('emit ProductSold', async function () {
        //given
        const productId = 'product-1';
        const price = new BN(1000);
        await addItemForSale(this.market, productId, 'token-1', price, user1);

        //when
        const receipt = await this.market.buy(productId, { from: user2, value: price })

        //then
        expectEvent(receipt, 'ProductSold', { productId: productId, seller: user1, buyer: user2, price: price });
    });

    it('revert Insufficient msg.value to buy', async function () {
        //given
        const productId = 'product-1';
        const price = new BN(1000);
        await addItemForSale(this.market, productId, 'token-1', price, user1);

        //when
        const result = this.market.buy(productId, { from: user2, value: 0 })

        //then
        await expectRevert(result, 'Insufficient msg.value to buy');

    });

    it('revert The product is not exist', async function () {
        //given
        const productId = 'product-1';

        //when
        const result = this.market.buy(productId, { from: user1, value: new BN(1000) })

        //then
        await expectRevert(result, 'The product is not exist');
    });

    it('revert The product is not OnSale status', async function () {
        //given
        const productId = 'product-1';
        const price = new BN(1000);
        await addItemForSale(this.market, productId, 'token-1', price, user1);
        await this.market.buy(productId, { from: user2, value: price })

        //when
        const result = this.market.buy(productId, { from: user5, value: price })

        //then
        await expectRevert(result, 'The product is not OnSale');

    });

    it('emit MarketDeactivated event', async function () {
        //when
        const receipt = await deactivate(this.market)

        //then
        expectEvent(receipt, 'MarketDeactivated', {});
    });

    it('emit MarketActivated event', async function () {
        //given
        await deactivate(this.market)

        //when
        const receipt = await activate(this.market)
        //then
        expectEvent(receipt, 'MarketActivated', {});
    });

    it('revert ActivateMarket call when market is already activated', async function () {
        //when
        const receipt = activate(this.market)

        //then
        await expectRevert(receipt, 'Market is already activated');
    });

    it('revert Deactivate call when caller is not owner', async function () {
        //when
        const receipt = this.market.activate({ from: user5 });

        //then
        await expectRevert(receipt, 'Ownable: caller is not the owner');
    });

    it('emit ListingRemoved event', async function () {
        const productId = 'product-1';
        const price = new BN(1000);
        await addItemForSale(this.market, productId, 'token-1', price, user1);
        await buy(this.market, productId, user2, price)

        const removeToken = 'buyToken';

        //when
        const receipt = await this.market.removeFromListing(productId, removeToken, { from: user2 });

        //then
        expectEvent(receipt, 'ListingRemoved', { productId: productId, token: removeToken, owner: user2 });
    });

    it('revert removeFromListing call when product is not saled', async function () {
        const productId = 'product-1';
        const price = new BN(1000);
        await addItemForSale(this.market, productId, 'token-1', price, user1);

        //when
        const receipt = this.market.removeFromListing(productId, "buyToken", { from: user1 });

        //then
        await expectRevert(receipt, 'This productId is not expected state');
    });

    it('revert removeFromListing call when product owner is not matched', async function () {
        const productId = 'product-1';
        const price = new BN(1000);
        await addItemForSale(this.market, productId, 'token-1', price, user1);
        await buy(this.market, productId, user2, price)

        const removeToken = 'buyToken';

        //when
        const receipt = this.market.removeFromListing(productId, removeToken, { from: user5 });

        //then
        await expectRevert(receipt, 'Only owner of product remove from listing');
    });


    async function addItemForSale(contract, productId, token, price, user) {
        await contract.requestNewListing(productId, token, price, { from: user, value: publishFee })
        await contract.approveRequestListing(productId, { from: owner })
    }
    async function buy(contract, productId, user, price) {
        await contract.buy(productId, { from: user, value: price })
    }
    async function deactivate(contract) {
        return await contract.deactivate({ from: owner })
    }
    async function activate(contract) {
        return await contract.activate({ from: owner })
    }
});