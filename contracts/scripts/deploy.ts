import { ethers, network } from "hardhat";
import { parseEther, formatEther } from "ethers";
import fs from "fs";
import path from "path";

interface DeployedContracts {
  network: string;
  chainId: number;
  deployer: string;
  timestamp: string;
  contracts: {
    EMOToken?: string;
    EmoFiToken?: string;
    TimelockController?: string;
    RIVault?: string;
    EmoMarketplace?: string;
    EmoStaking?: string;
    EmoGovernor?: string;
  };
}

async function main() {
  const [deployer, daoTreasury, teamMultisig, liquidityPool, strategicReserve] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const balance = await ethers.provider.getBalance(deployer.address);

  // On non-local networks, all addresses must be different (configured via env)
  const isLocalNetwork = network.name === "hardhat" || network.name === "localhost";

  // For production, these should be separate multisig addresses
  const dao       = isLocalNetwork ? daoTreasury?.address  ?? deployer.address : process.env.DAO_TREASURY!;
  const team      = isLocalNetwork ? teamMultisig?.address ?? deployer.address : process.env.TEAM_MULTISIG!;
  const liquidity = isLocalNetwork ? liquidityPool?.address ?? deployer.address : process.env.LIQUIDITY_POOL!;
  const reserve   = isLocalNetwork ? strategicReserve?.address ?? deployer.address : process.env.STRATEGIC_RESERVE!;
  const feeRecipient = isLocalNetwork ? deployer.address : (process.env.FEE_RECIPIENT ?? deployer.address);

  console.log("\n==============================");
  console.log("  EmoFi Protocol Deployment");
  console.log("==============================");
  console.log(`Network:      ${network.name} (chainId: ${chainId})`);
  console.log(`Deployer:     ${deployer.address}`);
  console.log(`Balance:      ${formatEther(balance)} ETH`);
  console.log(`DAO Treasury: ${dao}`);
  console.log(`Team:         ${team}\n`);

  if (!isLocalNetwork && balance < parseEther("0.05")) {
    throw new Error(`Insufficient balance: ${formatEther(balance)} ETH`);
  }

  const deployed: DeployedContracts = {
    network: network.name,
    chainId: Number(chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {},
  };

  // ─── 1. EMO Governance Token ──────────────────────────────────────────────
  console.log("📦 [1/7] Deploying EMOToken (ERC-20 Governance)...");
  const EMOToken = await ethers.getContractFactory("EMOToken");
  const emoToken = await EMOToken.deploy(deployer.address, dao, team, liquidity, reserve);
  await emoToken.waitForDeployment();
  deployed.contracts.EMOToken = await emoToken.getAddress();
  console.log(`   ✅ EMOToken:            ${deployed.contracts.EMOToken}`);

  // ─── 2. EmoFi Multi-Attribute Token (ERC-1155) ───────────────────────────
  console.log("📦 [2/7] Deploying EmoFiToken (ERC-1155 Attributes)...");
  const EmoFiToken = await ethers.getContractFactory("EmoFiToken");
  const emoFiToken = await EmoFiToken.deploy(deployer.address, "https://api.emofi.io/tokens/{id}.json");
  await emoFiToken.waitForDeployment();
  deployed.contracts.EmoFiToken = await emoFiToken.getAddress();
  console.log(`   ✅ EmoFiToken:          ${deployed.contracts.EmoFiToken}`);

  // ─── 3. TimelockController (for Governor) ─────────────────────────────────
  console.log("📦 [3/7] Deploying TimelockController...");
  const TimelockController = await ethers.getContractFactory("TimelockController");
  const timelockDelay = isLocalNetwork ? 0 : 2 * 24 * 60 * 60; // 0 local, 2 days prod
  const timelock = await TimelockController.deploy(
    timelockDelay,
    [deployer.address],
    [deployer.address],
    deployer.address
  );
  await timelock.waitForDeployment();
  deployed.contracts.TimelockController = await timelock.getAddress();
  console.log(`   ✅ TimelockController:  ${deployed.contracts.TimelockController}`);

  // ─── 4. RI-Vault ─────────────────────────────────────────────────────────
  console.log("📦 [4/7] Deploying RIVault...");
  const RIVault = await ethers.getContractFactory("RIVault");
  const riVault = await RIVault.deploy(deployed.contracts.EmoFiToken!, deployed.contracts.EMOToken!);
  await riVault.waitForDeployment();
  deployed.contracts.RIVault = await riVault.getAddress();
  console.log(`   ✅ RIVault:             ${deployed.contracts.RIVault}`);

  // ─── 5. EmoMarketplace ───────────────────────────────────────────────────
  console.log("📦 [5/7] Deploying EmoMarketplace...");
  const EmoMarketplace = await ethers.getContractFactory("EmoMarketplace");
  const marketplace = await EmoMarketplace.deploy(
    deployed.contracts.EmoFiToken!,
    deployed.contracts.EMOToken!,
    feeRecipient
  );
  await marketplace.waitForDeployment();
  deployed.contracts.EmoMarketplace = await marketplace.getAddress();
  console.log(`   ✅ EmoMarketplace:      ${deployed.contracts.EmoMarketplace}`);

  // ─── 6. EmoStaking ───────────────────────────────────────────────────────
  console.log("📦 [6/7] Deploying EmoStaking...");
  const EmoStaking = await ethers.getContractFactory("EmoStaking");
  const staking = await EmoStaking.deploy(deployed.contracts.EmoFiToken!, deployed.contracts.EMOToken!);
  await staking.waitForDeployment();
  deployed.contracts.EmoStaking = await staking.getAddress();
  console.log(`   ✅ EmoStaking:          ${deployed.contracts.EmoStaking}`);

  // ─── 7. EmoGovernor ──────────────────────────────────────────────────────
  console.log("📦 [7/7] Deploying EmoGovernor (DAO)...");
  const EmoGovernor = await ethers.getContractFactory("EmoGovernor");
  const governor = await EmoGovernor.deploy(deployed.contracts.EMOToken!, deployed.contracts.TimelockController!);
  await governor.waitForDeployment();
  deployed.contracts.EmoGovernor = await governor.getAddress();
  console.log(`   ✅ EmoGovernor:         ${deployed.contracts.EmoGovernor}`);

  // ─── Post-Deployment: grant roles ─────────────────────────────────────────
  console.log("\n🔐 Granting minter roles to Vault & Staking...");
  const MINTER_ROLE = await (emoFiToken as any).MINTER_ROLE();
  await (emoFiToken as any).grantRole(MINTER_ROLE, deployed.contracts.RIVault);
  await (emoFiToken as any).grantRole(MINTER_ROLE, deployed.contracts.EmoStaking);
  console.log("   ✅ Roles granted");

  console.log("\n📊 Seeding initial staking pairs...");
  await (staking as any).addPair(0n, 2n, parseEther("0.010")); // HAPPINESS → BEAUTIFUL
  await (staking as any).addPair(3n, 2n, parseEther("0.005")); // GOOD_THOUGHT → BEAUTIFUL
  await (staking as any).addPair(5n, 3n, parseEther("0.020")); // INTELLIGENCE → GOOD_THOUGHT
  await (staking as any).addPair(6n, 0n, parseEther("0.015")); // TALENT → HAPPINESS
  await (staking as any).addPair(7n, 3n, parseEther("0.008")); // SPIRITUALITY → GOOD_THOUGHT
  console.log("   ✅ 5 staking pairs seeded");

  // ─── Save deployment artifacts ────────────────────────────────────────────
  const outDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const ts = Date.now();
  const outFile   = path.join(outDir, `${network.name}-${ts}.json`);
  const latest    = path.join(outDir, `${network.name}-latest.json`);
  fs.writeFileSync(outFile, JSON.stringify(deployed, null, 2));
  fs.writeFileSync(latest,  JSON.stringify(deployed, null, 2));

  console.log(`\n📝 Saved to: ${outFile}`);
  console.log("\n==============================");
  console.log("  ✅ All contracts deployed!");
  console.log("==============================\n");

  return deployed;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
