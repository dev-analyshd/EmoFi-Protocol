/**
 * generate-wallets.ts
 * Creates 50 random test wallets (fresh addresses never before on-chain).
 * Outputs contracts/test-wallets.json with addresses + private keys.
 *
 * Usage: npx hardhat run scripts/generate-wallets.ts
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const WALLET_COUNT = 50;

async function main() {
  // If a wallet file already exists with the right count, reuse it
  const outPath = path.resolve(__dirname, "../test-wallets.json");
  if (fs.existsSync(outPath)) {
    const existing = JSON.parse(fs.readFileSync(outPath, "utf8"));
    if (existing.wallets?.length === WALLET_COUNT) {
      console.log(`♻️  Reusing existing ${WALLET_COUNT} wallets from ${outPath}`);
      existing.wallets.forEach((w: any) => console.log(`  [${String(w.index).padStart(2, "0")}] ${w.address}`));
      return;
    }
  }

  console.log("🔑  Generating", WALLET_COUNT, "fresh random test wallets…\n");

  const wallets: { index: number; address: string; privateKey: string }[] = [];

  for (let i = 0; i < WALLET_COUNT; i++) {
    // createRandom() generates a cryptographically fresh key — guaranteed to be a new EOA
    const wallet = ethers.Wallet.createRandom();
    wallets.push({
      index: i,
      address: wallet.address,
      privateKey: wallet.privateKey,
    });
    console.log(`  [${String(i).padStart(2, "0")}] ${wallet.address}`);
  }

  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        note: "TESTNET ONLY — never use these for real funds",
        generated: new Date().toISOString(),
        count: WALLET_COUNT,
        wallets,
      },
      null,
      2
    )
  );

  console.log(`\n✅  Saved to ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
