import { ethers } from "hardhat";
async function main() {
  const [deployer] = await ethers.getSigners();
  const efi = await ethers.getContractAt("EmoFiToken", "0xc1fd86F45be1819F4EDcFaCE306FA39ac3013D96");
  
  // Try single mint to deployer itself
  try {
    const tx = await (efi as any)["mint(address,uint256,uint256,bytes)"](
      deployer.address, 0n, 1n, "0x"
    );
    const r = await tx.wait();
    console.log("Single mint to deployer OK, gas:", r.gasUsed.toString());
  } catch(e: any) {
    console.log("Single mint to deployer FAILED:", e.message?.slice(0, 200));
  }

  // Try single mint to external address
  try {
    const tx = await (efi as any)["mint(address,uint256,uint256,bytes)"](
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", 0n, 1n, "0x"
    );
    const r = await tx.wait();
    console.log("Single mint to wallet[0] OK, gas:", r.gasUsed.toString());
  } catch(e: any) {
    console.log("Single mint to wallet[0] FAILED:", e.message?.slice(0, 200));
  }

  // Try mintBatch with explicit bytes for data
  try {
    const tx = await (efi as any).mintBatch(
      deployer.address,
      [0n, 1n],
      [1n, 1n],
      ethers.getBytes("0x")
    );
    const r = await tx.wait();
    console.log("mintBatch 2 tokens OK, gas:", r.gasUsed.toString());
  } catch(e: any) {
    console.log("mintBatch 2 tokens FAILED:", e.message?.slice(0, 300));
  }
}
main().catch(console.error);
