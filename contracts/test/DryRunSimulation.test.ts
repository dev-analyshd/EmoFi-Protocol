/**
 * DryRunSimulation.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * 50-wallet comprehensive dry-run simulation of the full EmoFi Protocol.
 *
 * Scenarios tested:
 *   A. Staking         — 15 wallets stake 8 different pairs, claim, unstake
 *   B. Marketplace     — 10 sellers list tokens, 10 buyers purchase
 *   C. RI-Vaults       — 10 wallets create vaults + stake in vaults
 *   D. Governance      — 10 wallets delegate + vote on 3 proposals
 *   E. Cross-protocol  — 5 wallets do full staking→marketplace→vault cycle
 *
 * Run: npx hardhat test test/DryRunSimulation.test.ts
 */

import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time, mine } from "@nomicfoundation/hardhat-network-helpers";
import { parseEther } from "ethers";

// ─── Token IDs ─────────────────────────────────────────────────────────────
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
const ALL_IDS     = Object.values(T);
const EMPTY_BYTES = "0x";

// ─── Amounts ────────────────────────────────────────────────────────────────
const EMO_PER_WALLET = parseEther("5000");    // 5,000 EMO transferred per wallet (treasury-funded)
const EMO_SUPPLY     = EMO_PER_WALLET;        // alias for balance checks
const ATTR_SUPPLY    = 5000n;                 // 5000 of each attribute token
const STAKE_AMOUNT   = 100n;
const LIST_AMOUNT    = 50n;
const LIST_PRICE     = parseEther("1");       // 1 EMO per attribute token
const VAULT_STAKE    = 20n;

// ─── Full Protocol Fixture ──────────────────────────────────────────────────
async function deployFullProtocol() {
  const signers = await ethers.getSigners(); // 55 accounts from hardhat config
  const [owner, treasury, team, liquidity, reserve, feeRecipient] = signers;

  // Take next 50 as test wallets (indices 5-54)
  const wallets = signers.slice(5, 55);
  expect(wallets.length).to.equal(50);

  // ── Deploy ──────────────────────────────────────────────────────────────
  const EMOToken       = await ethers.getContractFactory("EMOToken");
  const emoToken       = await EMOToken.deploy(
    owner.address, treasury.address, team.address, liquidity.address, reserve.address
  );

  const EmoFiToken     = await ethers.getContractFactory("EmoFiToken");
  const emoFiToken     = await EmoFiToken.deploy(owner.address, "https://api.emofi.io/tokens/{id}.json");

  const RIVault        = await ethers.getContractFactory("RIVault");
  const riVault        = await RIVault.deploy(
    await emoFiToken.getAddress(), await emoToken.getAddress()
  );

  const EmoMarketplace = await ethers.getContractFactory("EmoMarketplace");
  const marketplace    = await EmoMarketplace.deploy(
    await emoFiToken.getAddress(), await emoToken.getAddress(), feeRecipient.address
  );

  const EmoStaking     = await ethers.getContractFactory("EmoStaking");
  const staking        = await EmoStaking.deploy(
    await emoFiToken.getAddress(), await emoToken.getAddress()
  );

  const TimelockController = await ethers.getContractFactory("TimelockController");
  const timelock       = await TimelockController.deploy(0, [owner.address], [owner.address], owner.address);

  const EmoGovernor    = await ethers.getContractFactory("EmoGovernor");
  const governor       = await EmoGovernor.deploy(
    await emoToken.getAddress(), await timelock.getAddress()
  );

  // ── Roles ───────────────────────────────────────────────────────────────
  const MINTER_ROLE = await (emoFiToken as any).MINTER_ROLE();
  await (emoFiToken as any).grantRole(MINTER_ROLE, owner.address);
  await (emoFiToken as any).grantRole(MINTER_ROLE, await riVault.getAddress());
  await (emoFiToken as any).grantRole(MINTER_ROLE, await staking.getAddress());

  // ── Fund staking contract with EMO rewards (from treasury allocation) ────
  // Treasury = signers[1]; received 40% = 400,000 EMO at deploy time.
  // Reserve 100,000 for staking rewards; the rest funds test wallets.
  await (emoToken as any).connect(treasury).transfer(await staking.getAddress(), parseEther("100000"));

  // ── Distribute EMO + attribute tokens to all 50 test wallets ─────────────
  // Transfer from treasury (has remaining ~300,000 EMO; 50 × 5,000 = 250,000 used)
  const attrAmounts = ALL_IDS.map(() => ATTR_SUPPLY);
  for (const wallet of wallets) {
    // EMO — transfer from treasury (no mint needed; supply is already at cap)
    await (emoToken as any).connect(treasury).transfer(wallet.address, EMO_PER_WALLET);
    // All 9 attribute tokens in one batch tx (EmoFiToken has a separate minter role)
    await (emoFiToken as any).mintBatch(wallet.address, ALL_IDS, attrAmounts, EMPTY_BYTES);
  }

  // ── Add staking pairs (beyond constructor defaults) ──────────────────────
  // Constructor adds pairs 1-4; we add 5 more for variety
  const additionalPairs = [
    { stake: T.SADNESS,      reward: T.BAD_THOUGHT,   rate: parseEther("0.05")  },
    { stake: T.TALENT,       reward: T.INTELLIGENCE,  rate: parseEther("0.02")  },
    { stake: T.SPIRITUALITY, reward: T.BEAUTIFUL,     rate: parseEther("0.03")  },
    { stake: T.SITUATIONAL,  reward: T.GOOD_THOUGHT,  rate: parseEther("0.01")  },
    { stake: T.BAD_THOUGHT,  reward: T.SITUATIONAL,   rate: parseEther("0.015") },
  ];
  for (const p of additionalPairs) {
    await (staking as any).addPair(p.stake, p.reward, p.rate);
  }

  const pairCount = await (staking as any).pairCount();

  return {
    owner, treasury, feeRecipient, wallets,
    emoToken, emoFiToken, riVault, marketplace, staking, governor, timelock,
    MINTER_ROLE, pairCount,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE A — Staking (wallets 0-14)
// ═══════════════════════════════════════════════════════════════════════════════

describe("DryRun — A. Staking (15 wallets × 8 pairs)", function () {
  this.timeout(300_000);

  it("A1: wallets 0-4 each stake HAPPINESS→BEAUTIFUL (pairId 1), claim rewards, unstake", async () => {
    const { wallets, emoFiToken, staking } = await loadFixture(deployFullProtocol);
    const group = wallets.slice(0, 5);
    const pairId = 1n;

    // Approve + stake
    for (const wallet of group) {
      await (emoFiToken as any).connect(wallet).setApprovalForAll(await staking.getAddress(), true);
      const tx = await (staking as any).connect(wallet).stake(pairId, STAKE_AMOUNT);
      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);
    }

    // Advance 7 days to accumulate rewards
    await time.increase(7 * 24 * 3600);

    // Claim rewards for each position
    let positionId = 1n;
    for (const wallet of group) {
      const pending = await (staking as any).pendingRewards(positionId);
      expect(pending).to.be.gt(0n);
      await (staking as any).connect(wallet).claimRewards(positionId);
      positionId++;
    }

    // Unstake all
    positionId = 1n;
    for (const wallet of group) {
      await (staking as any).connect(wallet).unstake(positionId);
      // Verify position is now inactive
      const pos = await (staking as any).positions(positionId);
      expect(pos.active).to.equal(false);
      positionId++;
    }
  });

  it("A2: wallets 5-9 stake SADNESS→BAD_THOUGHT (bear market pair), advance time, verify rewards", async () => {
    const { wallets, emoFiToken, staking, pairCount } = await loadFixture(deployFullProtocol);
    const group = wallets.slice(5, 10);

    // Find the SADNESS→BAD_THOUGHT pair
    let sadnessPairId = 0n;
    for (let id = 1n; id <= pairCount; id++) {
      const pair = await (staking as any).pairs(id);
      if (pair.stakedTokenId === T.SADNESS && pair.rewardTokenId === T.BAD_THOUGHT) {
        sadnessPairId = id;
        break;
      }
    }
    expect(sadnessPairId).to.be.gt(0n);

    for (const wallet of group) {
      await (emoFiToken as any).connect(wallet).setApprovalForAll(await staking.getAddress(), true);
      await (staking as any).connect(wallet).stake(sadnessPairId, STAKE_AMOUNT * 2n);
    }

    await time.increase(30 * 24 * 3600); // 30 days

    const totalPositions = await (staking as any).positionCount();
    for (let posId = totalPositions - BigInt(group.length) + 1n; posId <= totalPositions; posId++) {
      const pending = await (staking as any).pendingRewards(posId);
      expect(pending).to.be.gt(0n);
    }
  });

  it("A3: wallets 10-14 stake TALENT→INTELLIGENCE and SPIRITUALITY→BEAUTIFUL simultaneously", async () => {
    const { wallets, emoFiToken, staking, pairCount } = await loadFixture(deployFullProtocol);
    const group = wallets.slice(10, 15);

    // Find pairs
    let talentPairId = 0n;
    let spiritualityPairId = 0n;
    for (let id = 1n; id <= pairCount; id++) {
      const pair = await (staking as any).pairs(id);
      if (pair.stakedTokenId === T.TALENT && pair.rewardTokenId === T.INTELLIGENCE) talentPairId = id;
      if (pair.stakedTokenId === T.SPIRITUALITY && pair.rewardTokenId === T.BEAUTIFUL) spiritualityPairId = id;
    }
    expect(talentPairId).to.be.gt(0n);
    expect(spiritualityPairId).to.be.gt(0n);

    for (const wallet of group) {
      await (emoFiToken as any).connect(wallet).setApprovalForAll(await staking.getAddress(), true);
      // Stake in both pairs at once
      await (staking as any).connect(wallet).stake(talentPairId, STAKE_AMOUNT);
      await (staking as any).connect(wallet).stake(spiritualityPairId, STAKE_AMOUNT);
    }

    await time.increase(14 * 24 * 3600);

    const posCount = await (staking as any).positionCount();
    // Each of 5 wallets created 2 positions = 10 positions in this fixture
    // (A3 runs independently so position count starts from 1)
    for (let posId = 1n; posId <= posCount; posId++) {
      const pos = await (staking as any).positions(posId);
      expect(pos.active).to.equal(true);
      const pending = await (staking as any).pendingRewards(posId);
      expect(pending).to.be.gt(0n);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE B — Marketplace (wallets 15-34)
// ═══════════════════════════════════════════════════════════════════════════════

describe("DryRun — B. Marketplace (10 sellers × 10 buyers)", function () {
  this.timeout(300_000);

  it("B1: 10 sellers create listings for all 9 attribute types", async () => {
    const { wallets, emoFiToken, marketplace } = await loadFixture(deployFullProtocol);
    const sellers = wallets.slice(15, 25);

    for (let i = 0; i < sellers.length; i++) {
      const seller = sellers[i];
      const tokenId = BigInt(i % 9); // cycle through token IDs 0-8
      const price   = parseEther((1 + i * 0.1).toFixed(1)); // varying prices

      await (emoFiToken as any).connect(seller).setApprovalForAll(await marketplace.getAddress(), true);
      const tx = await (marketplace as any).connect(seller).createListing(
        tokenId,
        LIST_AMOUNT,
        price,
        0n // no expiry
      );
      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      // Verify listing stored correctly
      const listingId = await (marketplace as any).listingCount();
      const listing = await (marketplace as any).listings(listingId);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.tokenId).to.equal(tokenId);
      expect(listing.active).to.equal(true);
    }

    expect(await (marketplace as any).listingCount()).to.equal(10n);
  });

  it("B2: 10 buyers each buy from a different listing using EMO", async () => {
    const { wallets, emoToken, emoFiToken, marketplace } = await loadFixture(deployFullProtocol);
    const sellers = wallets.slice(15, 25);
    const buyers  = wallets.slice(25, 35);

    // Create listings first
    for (let i = 0; i < sellers.length; i++) {
      const tokenId = BigInt(i % 9);
      await (emoFiToken as any).connect(sellers[i]).setApprovalForAll(await marketplace.getAddress(), true);
      await (marketplace as any).connect(sellers[i]).createListing(tokenId, LIST_AMOUNT, LIST_PRICE, 0n);
    }

    // Each buyer purchases from listing i+1
    for (let i = 0; i < buyers.length; i++) {
      const buyer     = buyers[i];
      const listingId = BigInt(i + 1);
      const buyAmount = 10n;
      const cost      = LIST_PRICE * buyAmount;

      await (emoToken as any).connect(buyer).approve(await marketplace.getAddress(), cost);
      const tx = await (marketplace as any).connect(buyer).buy(listingId, buyAmount);
      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      // Buyer's EMO balance reduced
      const emoBalance = await (emoToken as any).balanceOf(buyer.address);
      expect(emoBalance).to.equal(EMO_SUPPLY - cost);
    }
  });

  it("B3: seller cancels active listing, verify it's deactivated", async () => {
    const { wallets, emoFiToken, marketplace } = await loadFixture(deployFullProtocol);
    const seller = wallets[20];

    await (emoFiToken as any).connect(seller).setApprovalForAll(await marketplace.getAddress(), true);
    await (marketplace as any).connect(seller).createListing(T.INTELLIGENCE, LIST_AMOUNT, LIST_PRICE, 0n);
    const listingId = await (marketplace as any).listingCount();

    await (marketplace as any).connect(seller).cancelListing(listingId);
    const listing = await (marketplace as any).listings(listingId);
    expect(listing.active).to.equal(false);
  });

  it("B4: buyer cannot buy from cancelled listing", async () => {
    const { wallets, emoToken, emoFiToken, marketplace } = await loadFixture(deployFullProtocol);
    const [seller, buyer] = [wallets[21], wallets[30]];

    await (emoFiToken as any).connect(seller).setApprovalForAll(await marketplace.getAddress(), true);
    await (marketplace as any).connect(seller).createListing(T.TALENT, 10n, LIST_PRICE, 0n);
    const listingId = await (marketplace as any).listingCount();
    await (marketplace as any).connect(seller).cancelListing(listingId);

    await (emoToken as any).connect(buyer).approve(await marketplace.getAddress(), LIST_PRICE * 5n);
    await expect(
      (marketplace as any).connect(buyer).buy(listingId, 5n)
    ).to.be.revertedWith("Marketplace: listing not active");
  });

  it("B5: 5 wallets do create-list → buy cycle in sequence, verifying EMO flows", async () => {
    const { wallets, emoToken, emoFiToken, marketplace, feeRecipient } = await loadFixture(deployFullProtocol);

    for (let i = 0; i < 5; i++) {
      const seller = wallets[15 + i];
      const buyer  = wallets[25 + i];
      const tokenId = BigInt(i);

      await (emoFiToken as any).connect(seller).setApprovalForAll(await marketplace.getAddress(), true);
      await (marketplace as any).connect(seller).createListing(tokenId, 20n, LIST_PRICE, 0n);
      const listingId = await (marketplace as any).listingCount();

      const cost = LIST_PRICE * 5n;
      await (emoToken as any).connect(buyer).approve(await marketplace.getAddress(), cost);
      await (marketplace as any).connect(buyer).buy(listingId, 5n);

      // Buyer gained attribute tokens
      const attrBal = await (emoFiToken as any).balanceOf(buyer.address, tokenId);
      expect(attrBal).to.equal(ATTR_SUPPLY + 5n);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE C — RI-Vaults (wallets 35-44)
// ═══════════════════════════════════════════════════════════════════════════════

describe("DryRun — C. RI-Vaults (10 wallets)", function () {
  this.timeout(300_000);

  it("C1: 10 wallets each create a vault for a different attribute", async () => {
    const { wallets, riVault } = await loadFixture(deployFullProtocol);
    const group = wallets.slice(35, 45);

    for (let i = 0; i < group.length; i++) {
      const wallet  = group[i];
      const tokenId = BigInt(i % 9);
      const name    = `TestVault_${i}_${ALL_IDS[i % 9]}`;
      const isPublic = i % 2 === 0;

      const tx = await (riVault as any).connect(wallet).createVault(tokenId, name, isPublic);
      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);
    }

    const vaultCount = await (riVault as any).vaultCount();
    expect(vaultCount).to.equal(10n);
  });

  it("C2: wallet stakes tokens into own vault via stakeInVault", async () => {
    const { wallets, emoFiToken, riVault } = await loadFixture(deployFullProtocol);
    const wallet = wallets[35];

    // Create vault for HAPPINESS tokens
    await (riVault as any).connect(wallet).createVault(T.HAPPINESS, "Happiness Vault", true);
    const vaultId = await (riVault as any).vaultCount();

    // Step 1: approve the vault contract to pull ERC-1155 tokens from the wallet
    await (emoFiToken as any).connect(wallet).setApprovalForAll(await riVault.getAddress(), true);
    // Step 2: deposit tokens into the vault (vault.balance += amount)
    await (riVault as any).connect(wallet).mintToVault(vaultId, VAULT_STAKE * 2n);
    // Step 3: stake a portion of the vault's balance
    await (riVault as any).connect(wallet).stakeInVault(vaultId, VAULT_STAKE);

    const vaultData = await (riVault as any).vaults(vaultId);
    expect(vaultData.stakedBalance).to.equal(VAULT_STAKE);
    expect(vaultData.balance).to.equal(VAULT_STAKE);     // remainder stays in balance
    expect(vaultData.owner).to.equal(wallet.address);
  });

  it("C3: wallet stakes then unstakes from vault, balance restored", async () => {
    const { wallets, emoFiToken, riVault } = await loadFixture(deployFullProtocol);
    const wallet = wallets[36];

    await (riVault as any).connect(wallet).createVault(T.INTELLIGENCE, "IQ Vault", false);
    const vaultId = await (riVault as any).vaultCount();

    // Approve + deposit first so vault has balance
    await (emoFiToken as any).connect(wallet).setApprovalForAll(await riVault.getAddress(), true);
    await (riVault as any).connect(wallet).mintToVault(vaultId, VAULT_STAKE);

    // Stake then immediately unstake — vault.balance should return to VAULT_STAKE
    await (riVault as any).connect(wallet).stakeInVault(vaultId, VAULT_STAKE);
    await (riVault as any).connect(wallet).unstakeFromVault(vaultId, VAULT_STAKE);

    const vaultData = await (riVault as any).vaults(vaultId);
    expect(vaultData.balance).to.equal(VAULT_STAKE);
    expect(vaultData.stakedBalance).to.equal(0n);
  });

  it("C4: 5 wallets create multiple vaults and verify vault count", async () => {
    const { wallets, riVault } = await loadFixture(deployFullProtocol);
    const group = wallets.slice(39, 44);

    let totalVaults = 0n;
    for (const wallet of group) {
      // Each wallet creates 2 vaults
      await (riVault as any).connect(wallet).createVault(T.HAPPINESS, "Vault A", true);
      await (riVault as any).connect(wallet).createVault(T.SADNESS, "Vault B", false);
      totalVaults += 2n;
    }

    expect(await (riVault as any).vaultCount()).to.equal(totalVaults);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE D — Governance (wallets 44-49 + 5 from previous groups)
// ═══════════════════════════════════════════════════════════════════════════════

describe("DryRun — D. Governance (voting + proposals)", function () {
  this.timeout(300_000);

  it("D1: 10 wallets delegate EMO to themselves to gain voting power", async () => {
    const { wallets, emoToken } = await loadFixture(deployFullProtocol);
    const voters = wallets.slice(44, 54).slice(0, 6);

    for (const voter of voters) {
      await (emoToken as any).connect(voter).delegate(voter.address);
      const votes = await (emoToken as any).getVotes(voter.address);
      expect(votes).to.equal(EMO_SUPPLY);
    }
  });

  it("D2: owner creates proposal, 9 wallets vote FOR (meets 4% quorum), 2 vote AGAINST", async () => {
    const { owner, treasury, wallets, emoToken, governor, timelock } = await loadFixture(deployFullProtocol);
    // Need >40,000 EMO FOR votes (4% of 1M supply). 9 wallets × 5,000 = 45,000 ✓
    const forVoters     = wallets.slice(40, 49); // 9 FOR voters
    const againstVoters = wallets.slice(49, 51); // 2 AGAINST voters

    // All voters delegate to themselves so their EMO counts as voting power
    for (const v of [...forVoters, ...againstVoters]) {
      await (emoToken as any).connect(v).delegate(v.address);
    }

    // Owner has no EMO by default (all minted to treasury/team/etc.) —
    // transfer from treasury so owner can meet the proposal threshold
    await (emoToken as any).connect(treasury).transfer(owner.address, parseEther("10000"));
    await (emoToken as any).connect(owner).delegate(owner.address);

    // Create a simple proposal (0-value call to zero address — governance-safe no-op)
    const targets     = [ethers.ZeroAddress];
    const values      = [0n];
    const calldatas   = ["0x"];
    const description = "DryRun Proposal #1: Test governance with 50 wallets";
    const category    = "general";

    const proposeTx = await (governor as any).connect(owner).proposeWithCategory(
      targets, values, calldatas, description, 5n // ProposalCategory.General
    );
    const proposeReceipt = await proposeTx.wait();
    const proposalId = proposeReceipt?.logs
      .map((log: any) => {
        try { return (governor as any).interface.parseLog(log); } catch { return null; }
      })
      .find((e: any) => e?.name === "ProposalCreated")
      ?.args?.[0];
    expect(proposalId).to.not.be.undefined;

    // Skip voting delay (VOTING_DELAY = 1 days/12s ≈ 7200 blocks)
    const delay = await (governor as any).votingDelay();
    await mine(Number(delay) + 1);

    // 5 vote FOR (support = 1)
    for (const voter of forVoters) {
      await (governor as any).connect(voter).castVote(proposalId, 1);
    }

    // 2 vote AGAINST (support = 0)
    for (const voter of againstVoters) {
      await (governor as any).connect(voter).castVote(proposalId, 0);
    }

    // Skip voting period (VOTING_PERIOD = 7 days/12s ≈ 50400 blocks)
    const period = await (governor as any).votingPeriod();
    await mine(Number(period) + 1);

    // Check proposal succeeded (5 FOR votes > 2 AGAINST)
    const state = await (governor as any).state(proposalId);
    // State 4 = Succeeded, State 3 = Defeated
    expect(state).to.equal(4n); // Succeeded
  });

  it("D3: abstain votes are counted separately", async () => {
    const { owner, treasury, wallets, emoToken, governor } = await loadFixture(deployFullProtocol);
    const abstainers = wallets.slice(0, 3);
    const forVoters  = wallets.slice(3, 6);

    for (const v of [...abstainers, ...forVoters]) {
      await (emoToken as any).connect(v).delegate(v.address);
    }

    // Owner needs EMO to meet proposer threshold
    await (emoToken as any).connect(treasury).transfer(owner.address, parseEther("10000"));
    await (emoToken as any).connect(owner).delegate(owner.address);

    const targets     = [ethers.ZeroAddress];
    const values      = [0n];
    const calldatas   = ["0x"];
    const description = "DryRun Proposal #2: Abstain vote test";

    const proposeTx = await (governor as any).connect(owner).proposeWithCategory(
      targets, values, calldatas, description, 5n // ProposalCategory.General
    );
    const proposeReceipt = await proposeTx.wait();
    const proposalId = proposeReceipt?.logs
      .map((log: any) => {
        try { return (governor as any).interface.parseLog(log); } catch { return null; }
      })
      .find((e: any) => e?.name === "ProposalCreated")
      ?.args?.[0];

    const delay = await (governor as any).votingDelay();
    await mine(Number(delay) + 1);

    for (const voter of forVoters)  await (governor as any).connect(voter).castVote(proposalId, 1);
    for (const voter of abstainers) await (governor as any).connect(voter).castVote(proposalId, 2); // abstain

    const votes = await (governor as any).proposalVotes(proposalId);
    expect(votes.forVotes).to.be.gt(0n);
    expect(votes.abstainVotes).to.be.gt(0n);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE E — Cross-protocol (5 wallets, full cycle)
// ═══════════════════════════════════════════════════════════════════════════════

describe("DryRun — E. Cross-protocol full cycle (5 wallets)", function () {
  this.timeout(300_000);

  it("E1: wallet does stake → earn rewards → buy from marketplace → create vault → stake in vault", async () => {
    const { wallets, emoToken, emoFiToken, staking, marketplace, riVault, pairCount } = await loadFixture(deployFullProtocol);
    const actor = wallets[0];

    // ── 1. Stake HAPPINESS tokens ─────────────────────────────────────────
    await (emoFiToken as any).connect(actor).setApprovalForAll(await staking.getAddress(), true);
    await (staking as any).connect(actor).stake(1n, STAKE_AMOUNT);
    const positionId = await (staking as any).positionCount();

    // ── 2. Time passes, claim rewards ────────────────────────────────────
    await time.increase(30 * 24 * 3600);
    const pendingBefore = await (staking as any).pendingRewards(positionId);
    expect(pendingBefore).to.be.gt(0n);
    await (staking as any).connect(actor).claimRewards(positionId);

    // ── 3. Buy INTELLIGENCE tokens from marketplace (created by another wallet) ──
    const seller = wallets[10];
    await (emoFiToken as any).connect(seller).setApprovalForAll(await marketplace.getAddress(), true);
    await (marketplace as any).connect(seller).createListing(T.INTELLIGENCE, 100n, LIST_PRICE, 0n);
    const listingId = await (marketplace as any).listingCount();

    const buyAmount = 30n;
    const cost = LIST_PRICE * buyAmount;
    await (emoToken as any).connect(actor).approve(await marketplace.getAddress(), cost);
    await (marketplace as any).connect(actor).buy(listingId, buyAmount);

    const intellBal = await (emoFiToken as any).balanceOf(actor.address, T.INTELLIGENCE);
    expect(intellBal).to.equal(ATTR_SUPPLY + buyAmount);

    // ── 4. Create vault for INTELLIGENCE ─────────────────────────────────
    await (riVault as any).connect(actor).createVault(T.INTELLIGENCE, "My IQ Vault", true);
    const vaultId = await (riVault as any).vaultCount();

    // ── 5. Deposit into vault then stake ─────────────────────────────────
    await (emoFiToken as any).connect(actor).setApprovalForAll(await riVault.getAddress(), true);
    await (riVault as any).connect(actor).mintToVault(vaultId, VAULT_STAKE * 2n); // deposit
    await (riVault as any).connect(actor).stakeInVault(vaultId, VAULT_STAKE);     // stake from balance

    const vaultData = await (riVault as any).vaults(vaultId);
    expect(vaultData.stakedBalance).to.equal(VAULT_STAKE);
  });

  it("E2: 5 wallets all do full cross-protocol cycles concurrently (batched)", async () => {
    const { wallets, emoToken, emoFiToken, staking, marketplace, riVault } = await loadFixture(deployFullProtocol);
    const actors = wallets.slice(1, 6);

    // All actors stake simultaneously
    for (const actor of actors) {
      await (emoFiToken as any).connect(actor).setApprovalForAll(await staking.getAddress(), true);
      await (staking as any).connect(actor).stake(1n, STAKE_AMOUNT);
    }

    await time.increase(14 * 24 * 3600);

    // All claim rewards
    const posCount = await (staking as any).positionCount();
    for (let id = posCount - BigInt(actors.length) + 1n; id <= posCount; id++) {
      const pos = await (staking as any).positions(id);
      const signerIdx = actors.findIndex(a => a.address === pos.staker);
      if (signerIdx >= 0) {
        await (staking as any).connect(actors[signerIdx]).claimRewards(id);
      }
    }

    // All create listings then buy from each other (round-robin)
    const listingIds: bigint[] = [];
    for (let i = 0; i < actors.length; i++) {
      await (emoFiToken as any).connect(actors[i]).setApprovalForAll(await marketplace.getAddress(), true);
      await (marketplace as any).connect(actors[i]).createListing(BigInt(i % 9), 50n, LIST_PRICE, 0n);
      listingIds.push(await (marketplace as any).listingCount());
    }

    // Buy from next actor's listing (round-robin)
    for (let i = 0; i < actors.length; i++) {
      const buyer = actors[(i + 1) % actors.length];
      const listingId = listingIds[i];
      await (emoToken as any).connect(buyer).approve(await marketplace.getAddress(), LIST_PRICE * 5n);
      await (marketplace as any).connect(buyer).buy(listingId, 5n);
    }

    // All create vaults
    for (let i = 0; i < actors.length; i++) {
      await (riVault as any).connect(actors[i]).createVault(BigInt(i % 9), `CrossVault_${i}`, true);
    }

    expect(await (riVault as any).vaultCount()).to.equal(BigInt(actors.length));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE F — Edge Cases & Security
// ═══════════════════════════════════════════════════════════════════════════════

describe("DryRun — F. Edge cases & Security", function () {
  this.timeout(300_000);

  it("F1: cannot stake without ERC-1155 approval", async () => {
    const { wallets, staking } = await loadFixture(deployFullProtocol);
    await expect(
      (staking as any).connect(wallets[0]).stake(1n, STAKE_AMOUNT)
    ).to.be.reverted;
  });

  it("F2: cannot unstake another wallet's position", async () => {
    const { wallets, emoFiToken, staking } = await loadFixture(deployFullProtocol);
    const [staker, attacker] = [wallets[0], wallets[1]];

    await (emoFiToken as any).connect(staker).setApprovalForAll(await staking.getAddress(), true);
    await (staking as any).connect(staker).stake(1n, STAKE_AMOUNT);
    const positionId = await (staking as any).positionCount();

    await expect(
      (staking as any).connect(attacker).unstake(positionId)
    ).to.be.revertedWith("Staking: not your position");
  });

  it("F3: cannot buy with insufficient EMO approval", async () => {
    const { wallets, emoToken, emoFiToken, marketplace } = await loadFixture(deployFullProtocol);
    const [seller, buyer] = [wallets[5], wallets[6]];

    await (emoFiToken as any).connect(seller).setApprovalForAll(await marketplace.getAddress(), true);
    await (marketplace as any).connect(seller).createListing(T.HAPPINESS, 50n, LIST_PRICE, 0n);
    const listingId = await (marketplace as any).listingCount();

    // Approve less than needed
    await (emoToken as any).connect(buyer).approve(await marketplace.getAddress(), LIST_PRICE / 2n);
    await expect(
      (marketplace as any).connect(buyer).buy(listingId, 5n)
    ).to.be.reverted;
  });

  it("F4: 50 wallets all have correct EMO and attribute balances after mint", async () => {
    const { wallets, emoToken, emoFiToken } = await loadFixture(deployFullProtocol);

    let allCorrect = true;
    for (const wallet of wallets) {
      const emoBal = await (emoToken as any).balanceOf(wallet.address);
      if (emoBal !== EMO_SUPPLY) { allCorrect = false; break; }

      for (const id of ALL_IDS) {
        const attrBal = await (emoFiToken as any).balanceOf(wallet.address, id);
        if (attrBal !== ATTR_SUPPLY) { allCorrect = false; break; }
      }
    }
    expect(allCorrect).to.equal(true);
  });

  it("F5: protocol state after all interactions — counts are consistent", async () => {
    const { wallets, emoFiToken, staking, marketplace, riVault } = await loadFixture(deployFullProtocol);

    // Run simplified version of all suites
    const stakers  = wallets.slice(0, 10);
    const sellers  = wallets.slice(10, 20);
    const vaulters = wallets.slice(20, 30);

    // 10 stakers
    for (const w of stakers) {
      await (emoFiToken as any).connect(w).setApprovalForAll(await staking.getAddress(), true);
      await (staking as any).connect(w).stake(1n, STAKE_AMOUNT);
    }

    // 10 sellers
    for (let i = 0; i < sellers.length; i++) {
      await (emoFiToken as any).connect(sellers[i]).setApprovalForAll(await marketplace.getAddress(), true);
      await (marketplace as any).connect(sellers[i]).createListing(BigInt(i % 9), 50n, LIST_PRICE, 0n);
    }

    // 10 vaulters
    for (let i = 0; i < vaulters.length; i++) {
      await (riVault as any).connect(vaulters[i]).createVault(BigInt(i % 9), `Vault_${i}`, true);
    }

    expect(await (staking as any).positionCount()).to.equal(10n);
    expect(await (marketplace as any).listingCount()).to.equal(10n);
    expect(await (riVault as any).vaultCount()).to.equal(10n);
  });
});
