import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { MyNFT, MyNFT__factory, MyToken, MyToken__factory, TokenSale, TokenSale__factory } from "../typechain-types";

const TEST_TOKEN_RATIO = 1;
const TEST_TOKEN_PRICE = ethers.utils.parseEther("0.02");
const TEST_TOKEN_MINT = ethers.utils.parseEther("1");
const TEST_NFT_ID = 42;

describe("NFT Shop", async () => {

    let tokenSaleContract:TokenSale;
    let tokenContract:MyToken;
    let nftContract:MyNFT;
    let deployer:SignerWithAddress;
    let account1:SignerWithAddress;
    let account2:SignerWithAddress;

  beforeEach(async () => {
    [deployer,account1,account2] = await ethers.getSigners();

    const tokenContractfactory = new MyToken__factory(deployer);
    tokenContract = await tokenContractfactory.deploy();
    await tokenContract.deployed();

    const nftContractfactory = new MyNFT__factory(deployer);
    nftContract = await nftContractfactory.deploy();
    await nftContract.deployed();


    const tokenSaleContractFactory = new TokenSale__factory(deployer);
    tokenSaleContract = await tokenSaleContractFactory.deploy(TEST_TOKEN_RATIO,TEST_TOKEN_PRICE,tokenContract.address,nftContract.address);
    await tokenSaleContract.deployed();

    const minterRole = await tokenContract.MINTER_ROLE();
    const giveTokenMintRoleTx = await tokenContract.grantRole(minterRole,tokenSaleContract.address);
    await giveTokenMintRoleTx.wait()


    const nftMinterRole = await nftContract.MINTER_ROLE();
    const giveNftMintRoleTx = await nftContract.grantRole(nftMinterRole,tokenSaleContract.address);
    await giveNftMintRoleTx.wait()

  });

  describe("When the Shop contract is deployed", async () => {
    it("defines the ratio as provided in parameters", async () => {
        const ratio = await tokenSaleContract.ratio();
      expect(ratio).to.eq(TEST_TOKEN_RATIO)
    });

    it("uses a valid ERC20 as payment token", async () => {
        const tokenAddress = await tokenSaleContract.tokenAddress()
        const tokenContractfactory = new MyToken__factory(deployer)
        const tokenUsedInContract = tokenContractfactory.attach(tokenAddress)
      await expect(tokenUsedInContract.totalSupply()).to.not.be.reverted;
      await expect(tokenUsedInContract.balanceOf(account1.address)).to.not.be.reverted;
      await expect(tokenUsedInContract.transfer(account1.address,1)).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });
  });

  describe("When a user buys an ERC20 from the Token contract", async () => {
    let tokenBalanceBeforeMint: BigNumber;
    let ethBalanceBeforeMint: BigNumber;
    let mintTxGasCost:BigNumber;
    beforeEach(async () => {
      tokenBalanceBeforeMint = await tokenContract.balanceOf(account1.address)
      ethBalanceBeforeMint = await account1.getBalance()
      const buyTokensTx = await tokenSaleContract.connect(account1).buyTokens({value:TEST_TOKEN_MINT});
      const buyTokensTxReceipt = await buyTokensTx.wait();
      mintTxGasCost = buyTokensTxReceipt.gasUsed.mul(buyTokensTxReceipt.effectiveGasPrice)



    });

    it("charges the correct amount of ETH", async () => {
      const ethBalanceAfterMint = await account1.getBalance()
      const expected = TEST_TOKEN_MINT.add(mintTxGasCost);
      const diff = ethBalanceBeforeMint.sub(ethBalanceAfterMint)
      const error = diff.sub(expected);
      expect(error).to.eq(0)
    });

    it("gives the correct amount of tokens", async () => {

      const tokenBalanceAftereMint = await tokenContract.balanceOf(account1.address)

      expect(tokenBalanceAftereMint.sub(tokenBalanceBeforeMint)).to.eq(TEST_TOKEN_MINT.mul(TEST_TOKEN_RATIO));
      console.log(await tokenContract.balanceOf(account1.address))

    });
  

  describe("When a user burns an ERC20 at the Shop contract", async () => {
    let tokenBalanceBeforeBurn:BigNumber;
    let burnAmount:BigNumber;
    let ethBalanceBeforeBurn:BigNumber;
    let burnTxGasCost:BigNumber;
    let allowTxGasCost:BigNumber;
    beforeEach(async () => {
       tokenBalanceBeforeBurn = await tokenContract.balanceOf(account1.address)
       ethBalanceBeforeBurn = await account1.getBalance()
       burnAmount = tokenBalanceBeforeBurn.div(2)

      const allowTx = await tokenContract.connect(account1).approve(tokenSaleContract.address,burnAmount)
      const allowTxeceipt = await allowTx.wait()
      allowTxGasCost = allowTxeceipt.gasUsed.mul(allowTxeceipt.effectiveGasPrice)

      const burnTx = await tokenSaleContract.connect(account1).burnTokens(burnAmount)
      const burnTxReceipt = await burnTx.wait()
      burnTxGasCost = burnTxReceipt.gasUsed.mul(burnTxReceipt.effectiveGasPrice)




    });
    it("gives the correct amount of ETH", async () => {
      const ethBalanceAfterBurn = await account1.getBalance()
      const diff = ethBalanceAfterBurn.sub(ethBalanceBeforeBurn)
      const costs = allowTxGasCost.add(burnTxGasCost)
      expect(diff).to.eq(burnAmount.div(TEST_TOKEN_RATIO).sub(costs))

      
    });

    it("burns the correct amount of tokens", async () => {
      const tokenBalanceAfterBurn = await tokenContract.balanceOf(account1.address)
      const diff = tokenBalanceBeforeBurn.sub(tokenBalanceAfterBurn);
      expect(diff).to.eq(burnAmount);


    });
  });

  describe("When a user buys an NFT from the Shop contract", async () => {
    let tokenBalanceBeforeBuyNFT:BigNumber

    beforeEach(async () => {

      tokenBalanceBeforeBuyNFT = await tokenContract.balanceOf(account1.address);

      const allowTx = await tokenContract.connect(account1).approve(tokenSaleContract.address,TEST_TOKEN_PRICE)
      const allowTxeceipt = await allowTx.wait()

      const buyTx = await tokenSaleContract.connect(account1).buyNFT(TEST_NFT_ID);
      await buyTx.wait();

    });
    it("charges the correct amount of ERC20 tokens", async () => {
      const tokenBalanceAfterBuyNFT = await tokenContract.balanceOf(account1.address);
      const diff = tokenBalanceBeforeBuyNFT.sub(tokenBalanceAfterBuyNFT)
      expect(diff).to.eq(TEST_TOKEN_PRICE)
    });

    it("gives the correct NFT", async () => {
      const nftOwner = await nftContract.ownerOf(TEST_NFT_ID)
      expect(nftOwner).to.eq(account1.address)
    });

    it("updates the owner pool account correctly", async () => {
      const withdrawableAMount = await tokenSaleContract.withdrawableAmount()
      expect(withdrawableAMount).to.eq(TEST_TOKEN_PRICE.div(2));
     
    });


  });


});

});