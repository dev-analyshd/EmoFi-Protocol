/**
 * testnet-mint.ts
 * Mints EMO + all 9 attribute tokens to every wallet in test-wallets.json.
 * Run AFTER generate-wallets.ts.
 *
 * Usage:
 *   npx hardhat run scripts/testnet-mint.ts --network arbitrum-sepolia
 *
 * What each wallet receives:
 *   • 10,000 EMO  (governance + marketplace currency)
 *   • 500 of each ERC-1155 attribute token (IDs 0-8)
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// ── Amounts ──────────────────────────────────────────────────────────────────
// EMOToken is at max supply (1M, all pre-distributed to deployer at deploy time).
// We transfer from the deployer's own balance instead of calling mint().
const EMO_PER_WALLET   = ethers.parseEther("1000");  // 1,000 EMO each (50 wallets = 50k total)
const ATTR_PER_WALLET  = 200n;                        // 200 units each (ERC-1155)
const ATTR_IDS         = [0n, 1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n];
const ATTR_AMOUNTS     = ATTR_IDS.map(() => ATTR_PER_WALLET);
const EMPTY_DATA       = "0x";

// ── Deployed addresses ───────────────────────────────────────────────────────
const DEPLOYMENT = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../deployments/arbitrum-sepolia-latest.json"),
    "utf8"
  )
);

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("📡  Network  :", (await ethers.provider.getNetwork()).name);
  console.log("🔑  Deployer :", deployer.address);
  console.log("💰  Balance  :", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // ── Load contracts ────────────────────────────────────────────────────────
  const emoToken   = await ethers.getContractAt("EMOToken",   DEPLOYMENT.contracts.EMOToken);
  const emoFiToken = await ethers.getContractAt("EmoFiToken", DEPLOYMENT.contracts.EmoFiToken);

  // ── Load wallets ──────────────────────────────────────────────────────────
  const walletFile = path.resolve(__dirname, "../test-wallets.json");
  if (!fs.existsSync(walletFile)) {
    throw new Error("test-wallets.json not found — run generate-wallets.ts first");
  }
  const { wallets } = JSON.parse(fs.readFileSync(walletFile, "utf8")) as {
    wallets: { index: number; address: string }[];
  };

  console.log(`🎯  Minting to ${wallets.length} wallets…`);
  console.log(`   • ${ethers.formatEther(EMO_PER_WALLET)} EMO per wallet`);
  console.log(`   • ${ATTR_PER_WALLET} of each attribute token (IDs 0-8)\n`);

  const startFrom = process.env.START_FROM ? parseInt(process.env.START_FROM, 10) : 0;
  if (startFrom > 0) console.log(`⏩  Resuming from wallet index ${startFrom}\n`);

  const results: { address: string; emoTx: string; attrTx: string }[] = [];
  let totalGasUsed = 0n;

  const skipped: string[] = [];

  for (const wallet of wallets.filter(w => w.index >= startFrom)) {
    process.stdout.write(`  [${String(wallet.index).padStart(2, "0")}] ${wallet.address}  `);

    // Guard: skip contract addresses — ERC-1155 batch minting to contracts without
    // IERC1155Receiver reverts. All addresses from generate-wallets.ts are fresh EOAs,
    // but this check makes the script safe to re-run with any address list.
    const code = await ethers.provider.getCode(wallet.address);
    if (code !== "0x") {
      process.stdout.write(`SKIPPED (contract at address)\n`);
      skipped.push(wallet.address);
      continue;
    }

    // 1. Transfer EMO from deployer (supply is at max cap; deployer holds all allocations on testnet)
    const emoTx = await (emoToken as any).transfer(wallet.address, EMO_PER_WALLET);
    await emoTx.wait();
    process.stdout.write(`EMO ✓  `);

    // 2. MintBatch all 9 attribute tokens in one tx
    const attrTx = await (emoFiToken as any).mintBatch(
      wallet.address,
      ATTR_IDS,
      ATTR_AMOUNTS,
      ethers.getBytes(EMPTY_DATA) // explicit empty bytes to avoid encoding ambiguity
    );
    const receipt = await attrTx.wait();
    const gas = receipt?.gasUsed ?? 0n;
    totalGasUsed += BigInt(gas);
    process.stdout.write(`Attrs ✓  gas: ${gas.toLocaleString()}\n`);

    results.push({ address: wallet.address, emoTx: emoTx.hash, attrTx: attrTx.hash });
  }

  if (skipped.length > 0) {
    console.log(`\n⚠️  Skipped ${skipped.length} contract addresses:\n${skipped.map(a => `   ${a}`).join("\n")}`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(72)}`);
  console.log(`✅  MINT COMPLETE`);
  console.log(`   Wallets funded    : ${wallets.length}`);
  console.log(`   EMO per wallet    : ${ethers.formatEther(EMO_PER_WALLET)}`);
  console.log(`   Attrs per wallet  : ${ATTR_PER_WALLET} × 9 types`);
  console.log(`   Total attr gas    : ${totalGasUsed.toLocaleString()}`);
  console.log(`\n🔗  Arbiscan: https://sepolia.arbiscan.io/address/${DEPLOYMENT.contracts.EmoFiToken}`);
  console.log(`${"─".repeat(72)}\n`);

  // Save receipt log
  const logPath = path.resolve(__dirname, "../mint-results.json");
  fs.writeFileSync(logPath, JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2));
  console.log(`📝  Receipt log saved to ${logPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
