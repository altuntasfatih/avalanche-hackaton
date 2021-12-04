
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

    it('get current state of market place', async function () {
        //when
        const result = await this.market.getCurrent()

        //then
        expect(result['0']).to.eq(marketName)
        expect(result['1']).to.be.true
        expect(result['2']).to.be.bignumber.equal(publishFee)
        expect(result['3']).to.eq(owner)
        expect(result['4']).to.eql([])
        expect(result['5']).to.eql([])
    });

    it('emit PutOnSaleRequestReceived event', async function () {
        //given
        const prodcutId = "1234";
        const token = "eych";
        const price = new BN(100000);

        //when
        const receipt = await this.market.putOnSale(prodcutId, token, price, { from: user1, value: publishFee })

        //then
        expectEvent(receipt, 'PutOnSaleRequestReceived', { id: prodcutId, owner: user1, price: price, token: token });
    });

    it('revert PutOnSale call when publish fee is insufficient', async function () {
        //given
        const prodcutId = "1234";
        const token = "eych";
        const price = new BN(100000);

        //when
        const result = this.market.putOnSale(prodcutId, token, price, { from: user1, value: 1 })

        //then
        await expectRevert(result, 'Insufficient publish fee');
    });

    it('revert PutOnSale call when isNotActive', async function () {
        //given
        const receipt = await this.market.changeMarketStatus(false, { from: owner })
        const prodcutId = "1234";
        const token = "eych";
        const price = new BN(100000);

        //when
        const result = this.market.putOnSale(prodcutId, token, price, { from: user1, value: 1 })

        //then
        await expectRevert(result, 'The markets is not active');
    });

    it('emit MarketPlaceStateChanged event', async function () {
        //given
        const newState = false;

        //when
        const receipt = await this.market.changeMarketStatus(newState, { from: owner })

        //then
        expectEvent(receipt, 'MarketPlaceStateChanged', { newState: newState });
    });

    it('revert ChangeMarketStatus call when state is already same', async function () {
        //when
        const receipt = this.market.changeMarketStatus(true, { from: owner })

        //then
        await expectRevert(receipt, 'State is already same');
    });

    it('revert ChangeMarketStatus call when caller is not owner', async function () {
        //when
        const receipt = this.market.changeMarketStatus(true, { from: user5 })

        //then
        await expectRevert(receipt, 'Ownable: caller is not the owner');
    });

    it('emit PutOnSaleRequestApproved event', async function () {
        //given
        const prodcutId = "1234";
        const token = "eych";
        const price = new BN(100000);
        await this.market.putOnSale(prodcutId, token, price, { from: user1, value: publishFee })

        //when
        const receipt = await this.market.approveSaleRequest(prodcutId, { from: owner })

        //then
        expectEvent(receipt, 'PutOnSaleRequestApproved', { id: prodcutId, owner: user1, price: price });
    });

    it('revert PutOnSaleRequestApprove call when id is not found', async function () {
        //given
        const prodcutId = "1234";

        //when
        const result = this.market.approveSaleRequest(prodcutId, { from: owner })

        //then
        await expectRevert(result, 'This productId is invalid');
    });

    it('get Products which are inSale', async function () {
        //given
        await addItemForSale(this.market, 'product-1', 'token-1', new BN(100000), user1);
        await addItemForSale(this.market, 'product-2', 'token-2', new BN(100000), user2);
        await addItemForSale(this.market, 'product-3', 'token-3', new BN(100000), user3);
        await addItemForSale(this.market, 'product-4', 'token-4', new BN(100000), user4);

        //when
        const result = await this.market.getProductList();

        //then
        expect(result).to.have.lengthOf(4);
    });

    async function addItemForSale(market, productId, token, price, user) {
        await market.putOnSale(productId, token, price, { from: user, value: publishFee })
        await market.approveSaleRequest(productId, { from: owner })
    }
});