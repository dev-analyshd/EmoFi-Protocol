import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const deployFile = path.resolve(__dirname, "../deployments/arbitrum-sepolia-latest.json");
const { contracts: ADDR } = JSON.parse(fs.readFileSync(deployFile, "utf8")) as { contracts: Record<string, string> };

const walletFile = path.resolve(__dirname, "../test-wallets.json");
const { wallets } = JSON.parse(fs.readFileSync(walletFile, "utf8")) as { wallets: Array<{ index: number; address: string; privateKey: string }> };

const MARKETPLACE_ABI = [
  "function createListing(uint256 tokenId, uint256 amount, uint256 pricePerUnit, uint256 expiresAt) returns (uint256)",
  "function buy(uint256 listingId, uint256 amount)",
  "function listingCount() view returns (uint256)",
];

const STAKING_ABI = [
  "function stake(uint256 pairId, uint256 amount) returns (uint256)",
  "function positionCount() view returns (uint256)",
];

const VAULT_ABI = [
  "function createVault(uint256 tokenId, string calldata name, bool isPublic) returns (uint256)",
  "function mintToVault(uint256 vaultId, uint256 amount)",
  "function stakeInVault(uint256 vaultId, uint256 amount)",
  "function vaultCount() view returns (uint256)",
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
];

const ERC1155_ABI = [
  "function setApprovalForAll(address operator, bool approved)",
];

function explorer(tx: string) {
  return `https://sepolia.arbiscan.io/tx/${tx}`;
}

async function main() {
  const provider = ethers.provider;
  const selected = wallets.slice(0, 50);
  const userWallets = selected.map((w) => new ethers.Wallet(w.privateKey, provider));
  const [deployer] = await ethers.getSigners();

  const emo = new ethers.Contract(ADDR.EMOToken, ERC20_ABI, provider);
  const efi = new ethers.Contract(ADDR.EmoFiToken, ERC1155_ABI, provider);
  const mkt = new ethers.Contract(ADDR.EmoMarketplace, MARKETPLACE_ABI, provider);
  const stk = new ethers.Contract(ADDR.EmoStaking, STAKING_ABI, provider);
  const vlt = new ethers.Contract(ADDR.RIVault, VAULT_ABI, provider);

  const txs: string[] = [];
  const listingIds: bigint[] = [];
  const vaultIds: bigint[] = [];

  for (let i = 0; i < userWallets.length; i++) {
    const w = userWallets[i];
    const token = efi.connect(w);
    const emoW = emo.connect(w);
    const marketplace = mkt.connect(w);
    const staking = stk.connect(w);
    const vault = vlt.connect(w);

    const bal = await provider.getBalance(w.address);
    if (bal < ethers.parseEther("0.001")) {
      const fund = await deployer.sendTransaction({ to: w.address, value: ethers.parseEther("0.0015") });
      txs.push(fund.hash);
      await fund.wait();
    }

    const a1 = await token.setApprovalForAll(ADDR.EmoStaking, true);
    txs.push(a1.hash);
    await a1.wait();

    const a2 = await token.setApprovalForAll(ADDR.EmoMarketplace, true);
    txs.push(a2.hash);
    await a2.wait();

    const a3 = await token.setApprovalForAll(ADDR.RIVault, true);
    txs.push(a3.hash);
    await a3.wait();

    const s1 = await staking.stake(1n, 1n);
    txs.push(s1.hash);
    await s1.wait();

    const l1 = await marketplace.createListing(0n, 1n, 1000000000000000000n, 0n);
    txs.push(l1.hash);
    await l1.wait();

    const listingId = await mkt.connect(provider).listingCount();
    listingIds.push(listingId);
    if (listingId > 0n) {
      const b1 = await marketplace.buy(listingId, 1n);
      txs.push(b1.hash);
      await b1.wait();
    }

    const v1 = await vault.createVault(0n, `Wallet ${i} Vault`, true);
    txs.push(v1.hash);
    await v1.wait();

    const vCount = await vlt.connect(provider).vaultCount();
    vaultIds.push(vCount);
    const m1 = await vault.mintToVault(vCount, 1n);
    txs.push(m1.hash);
    await m1.wait();

    const st1 = await vault.stakeInVault(vCount, 1n);
    txs.push(st1.hash);
    await st1.wait();
  }

  console.log(`wallets_used=${userWallets.length}`);
  console.log(`listings_created=${listingIds.length}`);
  console.log(`vaults_created=${vaultIds.length}`);
  console.log(`tx_count=${txs.length}`);
  for (const hash of txs) console.log(explorer(hash));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});