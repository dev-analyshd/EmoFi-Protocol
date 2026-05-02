import { run, network } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const latestFile = path.join(__dirname, `../deployments/${network.name}-latest.json`);
  if (!fs.existsSync(latestFile)) {
    throw new Error(`No deployment found for network '${network.name}'. Run deploy script first.`);
  }

  const deployed = JSON.parse(fs.readFileSync(latestFile, "utf-8"));
  const { contracts, deployer } = deployed;

  console.log(`\n🔍 Verifying contracts on ${network.name}...\n`);

  const verifyContract = async (name: string, address: string, constructorArgs: any[]) => {
    try {
      console.log(`  Verifying ${name} at ${address}...`);
      await run("verify:verify", { address, constructorArguments: constructorArgs });
      console.log(`  ✅ ${name} verified`);
    } catch (e: any) {
      if (e.message.includes("Already Verified")) {
        console.log(`  ℹ️  ${name} already verified`);
      } else {
        console.error(`  ❌ ${name} failed: ${e.message}`);
      }
    }
  };

  await verifyContract("EMOToken", contracts.EMOToken, [deployer]);
  await verifyContract("EmoFiToken", contracts.EmoFiToken, ["https://api.emofi.io/tokens/{id}.json", deployer]);
  await verifyContract("RIVault", contracts.RIVault, [contracts.EmoFiToken, contracts.EMOToken, deployer]);
  await verifyContract("EmoMarketplace", contracts.EmoMarketplace, [contracts.EmoFiToken, contracts.EMOToken, deployer, 250]);
  await verifyContract("EmoStaking", contracts.EmoStaking, [contracts.EmoFiToken, contracts.EMOToken, deployer]);
  await verifyContract("EmoGovernor", contracts.EmoGovernor, [contracts.EMOToken, deployer]);

  console.log("\n✅ Verification complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
