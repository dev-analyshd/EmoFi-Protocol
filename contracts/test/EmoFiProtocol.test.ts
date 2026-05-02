import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { parseEther } from "ethers";

// ─── Token ID mapping (mirrors EmoFiToken.sol) ────────────────────────────────
const T = {
  HAPPINESS:    0n,
  SADNESS:      1n,
  BEAUTIFUL:    2n,
  GOOD_THOUGHT: 3n,
  BAD_THOUGHT:  4n,
  INTELLIGENCE: 5n,
  TALENT:       6n,
  SPIRITUALITY: 7n,
  SITUATIONAL:  8n,
};

// ─── Fixture ──────────────────────────────────────────────────────────────────
async function deployEmoFiFixture() {
  const [owner, user1, user2, treasury, team, liquidity, reserve] = await ethers.getSigners();

  // ── EMO governance token (5 distribution addresses) ──────────────────────
  const EMOToken = await ethers.getContractFactory("EMOToken");
  const emoToken = await EMOToken.deploy(
    owner.address,     // admin
    treasury.address,  // daoTreasury
    team.address,      // teamMultisig
    liquidity.address, // liquidityPool
    reserve.address    // strategicReserve
  );

  // ── ERC-1155 attribute token (admin, baseUri) ─────────────────────────────
  const EmoFiToken = await ethers.getContractFactory("EmoFiToken");
  const emoFiToken = await EmoFiToken.deploy(owner.address, "https://api.emofi.io/tokens/{id}.json");

  // ── RIVault (emoFiToken, emoToken) ────────────────────────────────────────
  const RIVault = await ethers.getContractFactory("RIVault");
  const riVault = await RIVault.deploy(await emoFiToken.getAddress(), await emoToken.getAddress());

  // ── EmoMarketplace (emoFiToken, emoToken, feeRecipient) ───────────────────
  const EmoMarketplace = await ethers.getContractFactory("EmoMarketplace");
  const marketplace = await EmoMarketplace.deploy(
    await emoFiToken.getAddress(),
    await emoToken.getAddress(),
    treasury.address
  );

  // ── EmoStaking (emoFiToken, emoToken) ─────────────────────────────────────
  const EmoStaking = await ethers.getContractFactory("EmoStaking");
  const staking = await EmoStaking.deploy(await emoFiToken.getAddress(), await emoToken.getAddress());

  // ── TimelockController (required by EmoGovernor) ──────────────────────────
  const TimelockController = await ethers.getContractFactory("TimelockController");
  const timelock = await TimelockController.deploy(
    0,                    // minDelay = 0 for testing
    [owner.address],      // proposers
    [owner.address],      // executors
    owner.address         // admin
  );

  // ── EmoGovernor (IVotes token, TimelockController timelock) ───────────────
  const EmoGovernor = await ethers.getContractFactory("EmoGovernor");
  const governor = await EmoGovernor.deploy(await emoToken.getAddress(), await timelock.getAddress());

  // ── Post-setup: grant minter roles ────────────────────────────────────────
  const MINTER_ROLE = await (emoFiToken as any).MINTER_ROLE();
  await (emoFiToken as any).grantRole(MINTER_ROLE, owner.address);
  await (emoFiToken as any).grantRole(MINTER_ROLE, await riVault.getAddress());
  await (emoFiToken as any).grantRole(MINTER_ROLE, await staking.getAddress());

  // Fund staking with EMO from treasury
  const treasuryBalance = await (emoToken as any).balanceOf(treasury.address);
  await (emoToken as any).connect(treasury).transfer(await staking.getAddress(), treasuryBalance / 10n);

  // Fund user2 with EMO from treasury for buying on marketplace
  await (emoToken as any).connect(treasury).transfer(user2.address, parseEther("50000"));

  // Setup a staking pair: HAPPINESS → BEAUTIFUL at 0.01/day
  await (staking as any).addPair(T.HAPPINESS, T.BEAUTIFUL, parseEther("0.01"));

  // Approve marketplace for user1's ERC1155 tokens
  await (emoFiToken as any).connect(user1).setApprovalForAll(await marketplace.getAddress(), true);
  // Approve staking for user1's ERC1155 tokens
  await (emoFiToken as any).connect(user1).setApprovalForAll(await staking.getAddress(), true);

  return { owner, user1, user2, treasury, team, liquidity, reserve, emoToken, emoFiToken, riVault, marketplace, staking, governor, timelock };
}

// Helper: mint attribute tokens to user via the owner minter role
async function mintToUser(emoFiToken: any, to: string, tokenId: bigint, amount: bigint) {
  await emoFiToken.mint(to, tokenId, amount, "0x");
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("EMOToken (ERC-20 Governance)", () => {
  it("should deploy with correct name, symbol, and distributed supply", async () => {
    const { emoToken, treasury } = await loadFixture(deployEmoFiFixture);
    expect(await (emoToken as any).name()).to.equal("EmoFi Governance");
    expect(await (emoToken as any).symbol()).to.equal("EMO");
    const treasuryBal = await (emoToken as any).balanceOf(treasury.address);
    expect(treasuryBal).to.be.gt(0n);
  });

  it("should allow transfers between accounts", async () => {
    const { emoToken, treasury, user1 } = await loadFixture(deployEmoFiFixture);
    await (emoToken as any).connect(treasury).transfer(user1.address, parseEther("1000"));
    expect(await (emoToken as any).balanceOf(user1.address)).to.equal(parseEther("1000"));
  });

  it("should have all 1,000,000 EMO distributed at construction (max supply = total supply)", async () => {
    const { emoToken } = await loadFixture(deployEmoFiFixture);
    const MAX_SUPPLY = parseEther("1000000");
    expect(await (emoToken as any).totalSupply()).to.equal(MAX_SUPPLY);
    // Minting beyond max supply must revert
    await expect(
      (emoToken as any).mint(ethers.ZeroAddress, 1n)
    ).to.be.revertedWith("EMO: max supply exceeded");
  });
});

describe("EmoFiToken (ERC-1155 Attributes)", () => {
  it("should return a URI containing emofi.io", async () => {
    const { emoFiToken } = await loadFixture(deployEmoFiFixture);
    expect(await (emoFiToken as any).uri(T.HAPPINESS)).to.include("emofi.io");
  });

  it("should allow minting by MINTER_ROLE", async () => {
    const { emoFiToken, user1 } = await loadFixture(deployEmoFiFixture);
    await mintToUser(emoFiToken, user1.address, T.HAPPINESS, 100n);
    expect(await (emoFiToken as any).balanceOf(user1.address, T.HAPPINESS)).to.equal(100n);
  });

  it("should block minting by unauthorized address", async () => {
    const { emoFiToken, user1, user2 } = await loadFixture(deployEmoFiFixture);
    await expect(
      (emoFiToken as any).connect(user1).mint(user2.address, T.HAPPINESS, 100n, "0x")
    ).to.be.reverted;
  });

  it("should allow batch minting", async () => {
    const { emoFiToken, user1 } = await loadFixture(deployEmoFiFixture);
    await (emoFiToken as any).mintBatch(user1.address, [T.HAPPINESS, T.INTELLIGENCE], [50n, 80n], "0x");
    expect(await (emoFiToken as any).balanceOf(user1.address, T.HAPPINESS)).to.equal(50n);
    expect(await (emoFiToken as any).balanceOf(user1.address, T.INTELLIGENCE)).to.equal(80n);
  });
});

describe("RIVault (Reality-Integrated Vault)", () => {
  it("should create a vault and emit VaultCreated", async () => {
    const { riVault, user1 } = await loadFixture(deployEmoFiFixture);
    await expect(
      (riVault as any).connect(user1).createVault(T.HAPPINESS, "Happiness Reserve", false)
    )
      .to.emit(riVault as any, "VaultCreated")
      .withArgs(1n, user1.address, T.HAPPINESS, "Happiness Reserve");
  });

  it("should allow depositing (mintToVault) and track balance", async () => {
    const { riVault, emoFiToken, user1 } = await loadFixture(deployEmoFiFixture);
    await mintToUser(emoFiToken, user1.address, T.HAPPINESS, 500n);
    await (emoFiToken as any).connect(user1).setApprovalForAll(await riVault.getAddress(), true);

    await (riVault as any).connect(user1).createVault(T.HAPPINESS, "Test Vault", false);
    await (riVault as any).connect(user1).mintToVault(1n, 200n);

    const vault = await (riVault as any).vaults(1n);
    expect(vault.balance).to.equal(200n);
  });

  it("should allow staking tokens inside a vault", async () => {
    const { riVault, emoFiToken, user1 } = await loadFixture(deployEmoFiFixture);
    await mintToUser(emoFiToken, user1.address, T.HAPPINESS, 500n);
    await (emoFiToken as any).connect(user1).setApprovalForAll(await riVault.getAddress(), true);

    await (riVault as any).connect(user1).createVault(T.HAPPINESS, "Staker Vault", false);
    await (riVault as any).connect(user1).mintToVault(1n, 300n);
    await (riVault as any).connect(user1).stakeInVault(1n, 100n);

    const vault = await (riVault as any).vaults(1n);
    expect(vault.balance).to.equal(200n);
    expect(vault.stakedBalance).to.equal(100n);
  });

  it("should revert deposit to non-existent vault", async () => {
    const { riVault, user1 } = await loadFixture(deployEmoFiFixture);
    await expect(
      (riVault as any).connect(user1).mintToVault(999n, 100n)
    ).to.be.reverted;
  });
});

describe("EmoMarketplace", () => {
  async function fixtureWithListing() {
    const ctx = await loadFixture(deployEmoFiFixture);
    const { marketplace, emoFiToken, emoToken, user1, user2 } = ctx;

    // Mint HAPPINESS tokens to user1
    await mintToUser(emoFiToken, user1.address, T.HAPPINESS, 500n);

    // user2 approves marketplace to spend EMO
    await (emoToken as any).connect(user2).approve(await marketplace.getAddress(), parseEther("50000"));

    // user1 creates listing: 200 HAPPINESS for 100 EMO each, no expiry
    await (marketplace as any).connect(user1).createListing(T.HAPPINESS, 200n, parseEther("100"), 0);

    return { ...ctx, listingId: 1n };
  }

  it("should create a listing and emit Listed", async () => {
    const { marketplace, emoFiToken, user1 } = await loadFixture(deployEmoFiFixture);
    await mintToUser(emoFiToken, user1.address, T.HAPPINESS, 300n);
    await expect(
      (marketplace as any).connect(user1).createListing(T.HAPPINESS, 100n, parseEther("50"), 0)
    ).to.emit(marketplace as any, "Listed");
  });

  it("should allow buying from a listing", async () => {
    const ctx = await fixtureWithListing();
    const { marketplace, emoFiToken, user2, listingId } = ctx;

    await (marketplace as any).connect(user2).buy(listingId, 50n);
    expect(await (emoFiToken as any).balanceOf(user2.address, T.HAPPINESS)).to.equal(50n);
  });

  it("should emit Traded event on purchase", async () => {
    const ctx = await fixtureWithListing();
    await expect(
      (ctx.marketplace as any).connect(ctx.user2).buy(ctx.listingId, 10n)
    ).to.emit(ctx.marketplace as any, "Traded");
  });

  it("should allow seller to cancel a listing", async () => {
    const ctx = await fixtureWithListing();
    await expect(
      (ctx.marketplace as any).connect(ctx.user1).cancelListing(ctx.listingId)
    ).to.emit(ctx.marketplace as any, "ListingCancelled");
  });

  it("should return unsold tokens on cancel", async () => {
    const ctx = await fixtureWithListing();
    const { marketplace, emoFiToken, user1, listingId } = ctx;
    const before = await (emoFiToken as any).balanceOf(user1.address, T.HAPPINESS);
    await (marketplace as any).connect(user1).cancelListing(listingId);
    const after = await (emoFiToken as any).balanceOf(user1.address, T.HAPPINESS);
    expect(after).to.equal(before + 200n);
  });
});

describe("EmoStaking", () => {
  it("should allow staking and emit Staked event", async () => {
    const { staking, emoFiToken, user1 } = await loadFixture(deployEmoFiFixture);
    await mintToUser(emoFiToken, user1.address, T.HAPPINESS, 1000n);

    // Pair 1 = HAPPINESS → BEAUTIFUL (set up in fixture)
    await expect(
      (staking as any).connect(user1).stake(1n, 500n)
    ).to.emit(staking as any, "Staked");
  });

  it("should accumulate ERC-1155 reward tokens over time", async () => {
    // Pair 1: HAPPINESS → BEAUTIFUL (set up by EmoStaking constructor)
    const { staking, emoFiToken, user1 } = await loadFixture(deployEmoFiFixture);
    await mintToUser(emoFiToken, user1.address, T.HAPPINESS, 1000n);
    await (staking as any).connect(user1).stake(1n, 500n); // pair 1

    // Advance 30 days to accrue BEAUTIFUL rewards
    await time.increase(30 * 24 * 60 * 60);

    // Rewards are minted as ERC-1155 BEAUTIFUL tokens (rewardTokenId = 2)
    const before = await (emoFiToken as any).balanceOf(user1.address, T.BEAUTIFUL);
    await (staking as any).connect(user1).claimRewards(1n);
    const after = await (emoFiToken as any).balanceOf(user1.address, T.BEAUTIFUL);
    expect(after).to.be.gt(before);
  });

  it("should return staked tokens plus rewards on unstake", async () => {
    const { staking, emoFiToken, user1 } = await loadFixture(deployEmoFiFixture);
    await mintToUser(emoFiToken, user1.address, T.HAPPINESS, 1000n);
    await (staking as any).connect(user1).stake(1n, 300n);

    await time.increase(7 * 24 * 60 * 60); // 7 days

    const before = await (emoFiToken as any).balanceOf(user1.address, T.HAPPINESS);
    await (staking as any).connect(user1).unstake(1n);
    const after = await (emoFiToken as any).balanceOf(user1.address, T.HAPPINESS);
    expect(after).to.equal(before + 300n);
  });
});

describe("EmoGovernor (DAO)", () => {
  it("should allow creating proposals with delegated voting power", async () => {
    const { governor, emoToken, owner, treasury } = await loadFixture(deployEmoFiFixture);

    // Delegate voting weight to owner
    await (emoToken as any).connect(treasury).delegate(treasury.address);
    await (emoToken as any).connect(treasury).transfer(owner.address, parseEther("5000"));
    await (emoToken as any).delegate(owner.address);

    // Mine a block to checkpoint the voting power
    await time.increase(1);

    const targets = [await governor.getAddress()];
    const values  = [0n];
    const calldatas = ["0x"];
    const description = "EIP-001: Enable Bear Market Multiplier";

    await expect(
      (governor as any).propose(targets, values, calldatas, description)
    ).to.emit(governor as any, "ProposalCreated");
  });
});
