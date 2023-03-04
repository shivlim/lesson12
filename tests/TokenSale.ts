import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { MyToken, MyToken__factory, TokenSale, TokenSale__factory } from "../typechain-types";

const TEST_TOKEN_RATIO = 1;
const TEST_TOKEN_MINT = ethers.utils.parseEther("1");

describe("NFT Shop", async () => {

    let tokenSaleContract:TokenSale;
    let tokenContract:MyToken;
    let deployer:SignerWithAddress;
    let account1:SignerWithAddress;
    let account2:SignerWithAddress;

  beforeEach(async () => {
    [deployer,account1,account2] = await ethers.getSigners();

    const tokenContractfactory = new MyToken__factory(deployer);
    tokenContract = await tokenContractfactory.deploy();
    await tokenContract.deployed();


    const tokenSaleContractFactory = new TokenSale__factory(deployer);
    tokenSaleContract = await tokenSaleContractFactory.deploy(TEST_TOKEN_RATIO,tokenContract.address);
    await tokenSaleContract.deployed();

    const minterRole = await tokenContract.MINTER_ROLE();
    const giveTokenMintRoleTx = await tokenContract.grantRole(minterRole,tokenSaleContract.address);
    await giveTokenMintRoleTx.wait()

  });

  describe("When the Shop contract is deployed", async () => {
    it("defines the ratio as provided in parameters", async () => {
        const ratio = tokenSaleContract.ratio();
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

    });
  });

  describe("When a user burns an ERC20 at the Shop contract", async () => {
    it("gives the correct amount of ETH", async () => {
      throw new Error("Not implemented");
    });

    it("burns the correct amount of tokens", async () => {
      throw new Error("Not implemented");
    });
  });

  describe("When a user buys an NFT from the Shop contract", async () => {
    it("charges the correct amount of ERC20 tokens", async () => {
      throw new Error("Not implemented");
    });

    it("gives the correct NFT", async () => {
      throw new Error("Not implemented");
    });
  });

  describe("When a user burns their NFT at the Shop contract", async () => {
    it("gives the correct amount of ERC20 tokens", async () => {
      throw new Error("Not implemented");
    });
  });

  describe("When the owner withdraws from the Shop contract", async () => {
    it("recovers the right amount of ERC20 tokens", async () => {
      throw new Error("Not implemented");
    });

    it("updates the owner pool account correctly", async () => {
      throw new Error("Not implemented");
    });
  });
});