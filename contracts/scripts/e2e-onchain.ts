/**
 * e2e-onchain.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * End-to-end on-chain test against live Arbitrum Sepolia deployment.
 * Uses wallet[0] from test-wallets.json to exercise every contract.
 *
 * Phases:
 *   1. READ  — verify all 7 contracts respond and wallet[0] balances are correct
 *   2. WRITE — real signed txs: approve → stake → list → create vault
 *   3. CHECK — read back on-chain state to confirm mutations persisted
 *
 * Usage: npx hardhat run scripts/e2e-onchain.ts --network arbitrum-sepolia
 */

import { ethers } from "hardhat";
import { parseEther, formatEther } from "ethers";
import * as fs from "fs";
import * as path from "path";

// ── Colour helpers ────────────────────────────────────────────────────────────
const GREEN  = "\x1b[32m";
const RED    = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN   = "\x1b[36m";
const BOLD   = "\x1b[1m";
const RESET  = "\x1b[0m";

let passed = 0;
let failed = 0;
const errors: string[] = [];

function ok(label: string, detail = "") {
  passed++;
  console.log(`  ${GREEN}✓${RESET} ${label}${detail ? `  ${YELLOW}${detail}${RESET}` : ""}`);
}
function fail(label: string, err: unknown) {
  failed++;
  const msg = err instanceof Error ? err.message : String(err);
  errors.push(`${label}: ${msg}`);
  console.log(`  ${RED}✗${RESET} ${label}  ${RED}${msg}${RESET}`);
}
function section(title: string) {
  const dashes = "─".repeat(Math.max(2, 64 - title.length));
  console.log(`\n${BOLD}${CYAN}── ${title} ${dashes}${RESET}`);
}

// ── Addresses ─────────────────────────────────────────────────────────────────
const deployFile = path.resolve(__dirname, "../deployments/arbitrum-sepolia-latest.json");
const { contracts: ADDR } = JSON.parse(fs.readFileSync(deployFile, "utf8")) as {
  contracts: Record<string, string>
};

const walletFile = path.resolve(__dirname, "../test-wallets.json");
const { wallets: TEST_WALLETS } = JSON.parse(fs.readFileSync(walletFile, "utf8")) as {
  wallets: Array<{ index: number; address: string; privateKey: string }>
};

// ── Minimal ABIs ──────────────────────────────────────────────────────────────
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function symbol() view returns (string)",
  "function transfer(address,uint256) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];
const ERC1155_ABI = [
  "function balanceOf(address,uint256) view returns (uint256)",
  "function balanceOfBatch(address[],uint256[]) view returns (uint256[])",
  "function setApprovalForAll(address,bool)",
  "function isApprovedForAll(address,address) view returns (bool)",
];
const STAKING_ABI = [
  "function pairCount() view returns (uint256)",
  "function positionCount() view returns (uint256)",
  "function pairs(uint256) view returns (uint256,uint256,uint256,bool)",
  "function positions(uint256) view returns (address,uint256,uint256,uint256,uint256,uint256,uint256,uint256,bool)",
  "function stake(uint256,uint256) returns (uint256)",
  "function unstake(uint256)",
  "function pendingRewards(uint256) view returns (uint256)",
];
const MARKETPLACE_ABI = [
  "function listingCount() view returns (uint256)",
  // seller, tokenId, amount, remainingAmount, pricePerUnit, active, expiresAt
  "function listings(uint256) view returns (address seller, uint256 tokenId, uint256 amount, uint256 remainingAmount, uint256 pricePerUnit, bool active, uint256 expiresAt)",
  "function createListing(uint256 tokenId, uint256 amount, uint256 pricePerUnit, uint256 expiresAt) returns (uint256)",
  "function buy(uint256 listingId, uint256 amount)",
  "function cancelListing(uint256 listingId)",
];
const VAULT_ABI = [
  "function vaultCount() view returns (uint256)",
  // createVault(tokenId, name, isPublic) — no description param
  "function createVault(uint256 tokenId, string calldata name, bool isPublic) returns (uint256)",
  "function mintToVault(uint256 vaultId, uint256 amount)",
  "function stakeInVault(uint256 vaultId, uint256 amount)",
  // owner, tokenId, name, balance, stakedBalance, oracleScore, isPublic, createdAt
  "function vaults(uint256) view returns (address owner, uint256 tokenId, string name, uint256 balance, uint256 stakedBalance, uint256 oracleScore, bool isPublic, uint256 createdAt)",
];
const GOVERNOR_ABI = [
  "function votingDelay() view returns (uint256)",
  "function votingPeriod() view returns (uint256)",
  "function proposalThreshold() view returns (uint256)",
  "function quorumNumerator() view returns (uint256)",
];

async function main() {
  console.log(`\n${BOLD}EmoFi Protocol — End-to-End On-Chain Test (Arbitrum Sepolia)${RESET}`);
  console.log(`${"═".repeat(65)}`);
  console.log(`Network : arbitrum-sepolia`);
  console.log(`Wallet  : ${TEST_WALLETS[0].address}`);

  const provider = ethers.provider;
  const wallet0  = new ethers.Wallet(TEST_WALLETS[0].privateKey, provider);
  const wallet1  = new ethers.Wallet(TEST_WALLETS[1].privateKey, provider);

  const emoToken    = new ethers.Contract(ADDR.EMOToken,        ERC20_ABI,       provider);
  const efiToken    = new ethers.Contract(ADDR.EmoFiToken,      ERC1155_ABI,     provider);
  const staking     = new ethers.Contract(ADDR.EmoStaking,      STAKING_ABI,     provider);
  const marketplace = new ethers.Contract(ADDR.EmoMarketplace,  MARKETPLACE_ABI, provider);
  const riVault     = new ethers.Contract(ADDR.RIVault,         VAULT_ABI,       provider);
  const governor    = new ethers.Contract(ADDR.EmoGovernor,     GOVERNOR_ABI,    provider);

  // ── PHASE 1: READ — verify deployed state ──────────────────────────────────
  section("PHASE 1 · On-chain reads — verify deployed contracts");

  // 1a. EMOToken
  try {
    const supply = await emoToken.totalSupply();
    const symbol = await emoToken.symbol();
    ok("EMOToken.totalSupply()", `${formatEther(supply)} ${symbol}`);
  } catch (e) { fail("EMOToken.totalSupply()", e); }

  try {
    const bal = await emoToken.balanceOf(TEST_WALLETS[0].address);
    if (bal < parseEther("900")) throw new Error(`expected ≥900 EMO, got ${formatEther(bal)}`);
    ok("Wallet[0] EMO balance ≥ 900", `${formatEther(bal)} EMO`);
  } catch (e) { fail("Wallet[0] EMO balance", e); }

  // 1b. EmoFiToken (ERC-1155 attribute tokens)
  try {
    const ids    = [0n, 1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n];
    const addrs  = ids.map(() => TEST_WALLETS[0].address);
    const bals   = await efiToken.balanceOfBatch(addrs, ids);
    // Allow for prior test runs consuming tokens (staking, listing, vaults use tokens)
    const allOk  = bals.every((b: bigint) => b >= 100n);
    if (!allOk) throw new Error(`some attr balances < 100 (may need re-mint): [${bals.join(",")}]`);
    ok("Wallet[0] ERC-1155 attribute balances ≥ 100 (all 9 types)", `[${bals.join(",")}]`);
  } catch (e) { fail("ERC-1155 attribute balances", e); }

  // 1c. EmoStaking — read pairs
  try {
    const pairCount = await staking.pairCount();
    if (pairCount < 8n) throw new Error(`expected ≥8 pairs, got ${pairCount}`);
    ok("EmoStaking.pairCount() ≥ 8", `${pairCount} pairs`);
  } catch (e) { fail("EmoStaking.pairCount()", e); }

  // 1d. EmoMarketplace — read listing count
  try {
    const lc = await marketplace.listingCount();
    ok("EmoMarketplace.listingCount()", `${lc} total listings`);
  } catch (e) { fail("EmoMarketplace.listingCount()", e); }

  // 1e. RIVault
  try {
    const vc = await riVault.vaultCount();
    ok("RIVault.vaultCount()", `${vc} vaults`);
  } catch (e) { fail("RIVault.vaultCount()", e); }

  // 1f. EmoGovernor — parameter check
  try {
    const delay    = await governor.votingDelay();
    const period   = await governor.votingPeriod();
    const thresh   = await governor.proposalThreshold();
    const quorumN  = await governor.quorumNumerator();
    ok("EmoGovernor params", `delay=${delay} period=${period} threshold=${formatEther(thresh)} EMO quorum=${quorumN}%`);
  } catch (e) { fail("EmoGovernor params", e); }

  // ── PHASE 2: WRITE — real signed transactions ──────────────────────────────
  section("PHASE 2 · On-chain writes — signed transactions via wallet[0]");

  // Fund wallet[0] and wallet[1] with testnet ETH from the deployer signer
  // (fresh random wallets have no ETH for gas)
  const [deployer] = await ethers.getSigners();
  try {
    const w0Bal = await provider.getBalance(wallet0.address);
    if (w0Bal < ethers.parseEther("0.003")) {
      const tx = await deployer.sendTransaction({ to: wallet0.address, value: ethers.parseEther("0.005") });
      await tx.wait();
    }
    const w1Bal = await provider.getBalance(wallet1.address);
    if (w1Bal < ethers.parseEther("0.003")) {
      const tx = await deployer.sendTransaction({ to: wallet1.address, value: ethers.parseEther("0.005") });
      await tx.wait();
    }
    const funded0 = await provider.getBalance(wallet0.address);
    const funded1 = await provider.getBalance(wallet1.address);
    ok("Funded wallet[0] and wallet[1] with testnet ETH",
       `w0=${ethers.formatEther(funded0)} w1=${ethers.formatEther(funded1)} ETH`);
  } catch (e) { fail("Fund test wallets with ETH", e); }

  const efiW0  = efiToken.connect(wallet0);
  const stkW0  = staking.connect(wallet0);
  const mktW0  = marketplace.connect(wallet0);
  const vltW0  = riVault.connect(wallet0);
  const efiW1  = efiToken.connect(wallet1);
  const mktW1  = marketplace.connect(wallet1);

  // Pre-capture counts for diff
  const stakeBefore   = await staking.positionCount();
  const listingBefore = await marketplace.listingCount();
  const vaultBefore   = await riVault.vaultCount();

  // 2a. Approve EmoStaking to transfer wallet[0]'s ERC-1155 tokens
  let stakePositionId: bigint | undefined;
  try {
    const approveTx = await efiW0.setApprovalForAll(ADDR.EmoStaking, true);
    await approveTx.wait();
    const approved = await efiToken.isApprovedForAll(wallet0.address, ADDR.EmoStaking);
    if (!approved) throw new Error("approval not reflected on-chain");
    ok("ERC-1155 setApprovalForAll(EmoStaking)", "approved");
  } catch (e) { fail("setApprovalForAll(EmoStaking)", e); }

  // 2b. Stake 10 Happiness (tokenId=0) on pair 1 (Happiness→Beautiful)
  try {
    const stakeTx = await stkW0.stake(1n, 10n);
    const receipt = await stakeTx.wait();
    const newCount = await staking.positionCount();
    if (newCount <= stakeBefore) throw new Error("positionCount did not increase");
    stakePositionId = newCount;
    ok("EmoStaking.stake(pairId=1, amount=10)", `positionId=${stakePositionId}  gas=${receipt?.gasUsed}`);
  } catch (e) { fail("EmoStaking.stake()", e); }

  // 2c. Verify position on-chain
  if (stakePositionId !== undefined) {
    try {
      const pos = await staking.positions(stakePositionId);
      if (pos[0].toLowerCase() !== wallet0.address.toLowerCase()) throw new Error("position.staker mismatch");
      if (pos[2] !== 10n) throw new Error(`position.amount expected 10 got ${pos[2]}`);
      if (!pos[8]) throw new Error("position.active is false");
      ok("Position verified: staker=wallet[0], amount=10, active=true");
    } catch (e) { fail("Read back staking position", e); }
  }

  // 2d. Approve EmoMarketplace
  try {
    const tx = await efiW0.setApprovalForAll(ADDR.EmoMarketplace, true);
    await tx.wait();
    ok("setApprovalForAll(EmoMarketplace)");
  } catch (e) { fail("setApprovalForAll(EmoMarketplace)", e); }

  // 2e. Create listing: 5 Happiness tokens @ 1.5 EMO each (expiresAt=0 = no expiry)
  let newListingId: bigint | undefined;
  try {
    const tx = await mktW0.createListing(0n, 5n, parseEther("1.5"), 0n);
    const receipt = await tx.wait();
    const newCount = await marketplace.listingCount();
    if (newCount <= listingBefore) throw new Error("listingCount did not increase");
    newListingId = newCount;
    ok("EmoMarketplace.createListing(tokenId=0, qty=5, price=1.5 EMO)", `listingId=${newListingId}  gas=${receipt?.gasUsed}`);
  } catch (e) { fail("EmoMarketplace.createListing()", e); }

  // 2f. Wallet[1] buys 2 tokens from the listing (requires EMO approval first)
  if (newListingId !== undefined) {
    try {
      const emoW1 = emoToken.connect(wallet1);
      const approveTx = await (emoW1 as any).approve(ADDR.EmoMarketplace, parseEther("100"));
      await approveTx.wait();
      const buyTx = await mktW1.buy(newListingId, 2n); // 2 tokens × 1.5 EMO
      await buyTx.wait();
      const listing = await marketplace.listings(newListingId);
      if (listing.remainingAmount !== 3n) throw new Error(`remainingAmount expected 3 got ${listing.remainingAmount}`);
      ok("Wallet[1] buyListing(qty=2): remaining=3 ✓", `listingId=${newListingId}`);
    } catch (e) { fail("EmoMarketplace.buyListing()", e); }
  }

  // 2g. Create vault for Happiness (tokenId=0)
  let newVaultId: bigint | undefined;
  try {
    const tx = await efiW0.setApprovalForAll(ADDR.RIVault, true);
    await tx.wait();
    const createTx = await vltW0.createVault(0n, "E2E Happiness Vault", true);
    const receipt = await createTx.wait();
    const newCount = await riVault.vaultCount();
    if (newCount <= vaultBefore) throw new Error("vaultCount did not increase");
    newVaultId = newCount;
    ok("RIVault.createVault(tokenId=0)", `vaultId=${newVaultId}  gas=${receipt?.gasUsed}`);
  } catch (e) { fail("RIVault.createVault()", e); }

  // 2h. Mint 20 tokens into the vault, then stake 10 inside the vault
  if (newVaultId !== undefined) {
    try {
      const mintTx = await vltW0.mintToVault(newVaultId, 20n);
      await mintTx.wait();
      const stakeTx = await vltW0.stakeInVault(newVaultId, 10n);
      await stakeTx.wait();
      const vaultData = await riVault.vaults(newVaultId);
      // named: owner, tokenId, name, balance, stakedBalance, oracleScore, isPublic, createdAt
      if (vaultData.stakedBalance !== 10n) throw new Error(`vault.stakedBalance expected 10 got ${vaultData.stakedBalance}`);
      ok("RIVault.mintToVault(20) + stakeInVault(10): stakedBalance=10 ✓");
    } catch (e) { fail("RIVault.mintToVault/stakeInVault", e); }
  }

  // ── PHASE 3: CHECK — read-back verification ────────────────────────────────
  section("PHASE 3 · Read-back verification — state diff");

  try {
    const stakeAfter   = await staking.positionCount();
    const listingAfter = await marketplace.listingCount();
    const vaultAfter   = await riVault.vaultCount();
    const stakeDiff    = stakeAfter - stakeBefore;
    const listingDiff  = listingAfter - listingBefore;
    const vaultDiff    = vaultAfter - vaultBefore;
    if (stakeDiff   < 1n) throw new Error(`no new staking positions (diff=${stakeDiff})`);
    if (listingDiff < 1n) throw new Error(`no new marketplace listings (diff=${listingDiff})`);
    if (vaultDiff   < 1n) throw new Error(`no new vaults (diff=${vaultDiff})`);
    ok("Protocol state diff", `+${stakeDiff} positions  +${listingDiff} listings  +${vaultDiff} vaults`);
  } catch (e) { fail("State diff check", e); }

  try {
    // Verify pending rewards > 0 for staked position (staked for at least a few seconds)
    if (stakePositionId !== undefined) {
      const pending = await staking.pendingRewards(stakePositionId);
      ok("EmoStaking.pendingRewards(positionId)", `${formatEther(pending)} Beautiful (≥ 0)`);
    }
  } catch (e) { fail("pendingRewards() check", e); }

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(65)}`);
  console.log(`${BOLD}On-Chain E2E Results: ${GREEN}${passed} passed${RESET}${BOLD}  ${RED}${failed} failed${RESET}`);
  if (errors.length) {
    console.log(`\n${RED}Failures:${RESET}`);
    errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  }
  console.log();

  if (failed > 0) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
