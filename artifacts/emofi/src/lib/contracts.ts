export const CONTRACTS = {
  EMOToken:           "0x7aFCB5eBD0e756D4Dc325f52BA30C950535cb0b6" as `0x${string}`,
  EmoFiToken:         "0xc1fd86F45be1819F4EDcFaCE306FA39ac3013D96" as `0x${string}`,
  TimelockController: "0x0ABf588d90Cc2108808082250fdCB4C87d25ef6D" as `0x${string}`,
  RIVault:            "0x860C5FD9b59bCf7c0B3314ceB13a32C062A02CfF" as `0x${string}`,
  EmoMarketplace:     "0x1D631093612f78c9A82062CE8feE16E5275CE53F" as `0x${string}`,
  EmoStaking:         "0x6f6a3bccffaa23FF623864AC237739A0425DEf97" as `0x${string}`,
  EmoGovernor:        "0x3317537831eDE8E7B66cc6C9C62D240d273eEAc7" as `0x${string}`,
} as const;

export const ARBISCAN = "https://sepolia.arbiscan.io";

// Token ID → attribute name mapping (mirrors EmoFiToken.sol)
export const TOKEN_IDS = {
  happiness:    0n,
  sadness:      1n,
  beautiful:    2n,
  good_thought: 3n,
  bad_thought:  4n,
  intelligence: 5n,
  talent:       6n,
  spirituality: 7n,
  situational:  8n,
} as const;

export const TOKEN_NAMES = Object.fromEntries(
  Object.entries(TOKEN_IDS).map(([k, v]) => [v.toString(), k])
) as Record<string, string>;

export const ALL_TOKEN_IDS = [0n, 1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n];

// ── Minimal ABIs ────────────────────────────────────────────────────────────

export const EMO_ABI = [
  { name: "balanceOf",  type: "function", stateMutability: "view",        inputs: [{ name: "account",  type: "address" }],                                                           outputs: [{ type: "uint256" }] },
  { name: "allowance",  type: "function", stateMutability: "view",        inputs: [{ name: "owner",    type: "address" }, { name: "spender", type: "address" }],                     outputs: [{ type: "uint256" }] },
  { name: "approve",    type: "function", stateMutability: "nonpayable",  inputs: [{ name: "spender",  type: "address" }, { name: "value",   type: "uint256" }],                     outputs: [{ type: "bool" }] },
  { name: "delegate",   type: "function", stateMutability: "nonpayable",  inputs: [{ name: "delegatee", type: "address" }],                                                          outputs: [] },
  { name: "getVotes",   type: "function", stateMutability: "view",        inputs: [{ name: "account",  type: "address" }],                                                           outputs: [{ type: "uint256" }] },
  { name: "totalSupply", type: "function", stateMutability: "view",       inputs: [],                                                                                                outputs: [{ type: "uint256" }] },
  { name: "symbol",     type: "function", stateMutability: "view",        inputs: [],                                                                                                outputs: [{ type: "string" }] },
] as const;

export const EMOFI_TOKEN_ABI = [
  { name: "balanceOf",        type: "function", stateMutability: "view",       inputs: [{ name: "account", type: "address" }, { name: "id",       type: "uint256" }],                                outputs: [{ type: "uint256" }] },
  { name: "balanceOfBatch",   type: "function", stateMutability: "view",       inputs: [{ name: "accounts", type: "address[]" }, { name: "ids",    type: "uint256[]" }],                              outputs: [{ type: "uint256[]" }] },
  { name: "setApprovalForAll", type: "function", stateMutability: "nonpayable", inputs: [{ name: "operator", type: "address" }, { name: "approved", type: "bool" }],                                 outputs: [] },
  { name: "isApprovedForAll", type: "function", stateMutability: "view",       inputs: [{ name: "account", type: "address" }, { name: "operator", type: "address" }],                                outputs: [{ type: "bool" }] },
] as const;

export const STAKING_ABI = [
  { name: "stake",          type: "function", stateMutability: "nonpayable", inputs: [{ name: "pairId", type: "uint256" }, { name: "amount", type: "uint256" }],                         outputs: [{ name: "positionId", type: "uint256" }] },
  { name: "unstake",        type: "function", stateMutability: "nonpayable", inputs: [{ name: "positionId", type: "uint256" }],                                                         outputs: [] },
  { name: "claimRewards",   type: "function", stateMutability: "nonpayable", inputs: [{ name: "positionId", type: "uint256" }],                                                         outputs: [] },
  { name: "pendingRewards", type: "function", stateMutability: "view",       inputs: [{ name: "positionId", type: "uint256" }],                                                         outputs: [{ type: "uint256" }] },
  { name: "pairCount",      type: "function", stateMutability: "view",       inputs: [],                                                                                               outputs: [{ type: "uint256" }] },
  { name: "positionCount",  type: "function", stateMutability: "view",       inputs: [],                                                                                               outputs: [{ type: "uint256" }] },
  { name: "pairs",          type: "function", stateMutability: "view",       inputs: [{ name: "", type: "uint256" }],                                                                  outputs: [{ name: "stakedTokenId", type: "uint256" }, { name: "rewardTokenId", type: "uint256" }, { name: "rewardRatePerDay", type: "uint256" }, { name: "active", type: "bool" }] },
  { name: "positions",      type: "function", stateMutability: "view",       inputs: [{ name: "", type: "uint256" }],                                                                  outputs: [{ name: "staker", type: "address" }, { name: "pairId", type: "uint256" }, { name: "amount", type: "uint256" }, { name: "rewardDebt", type: "uint256" }, { name: "pendingRewards", type: "uint256" }, { name: "totalEarned", type: "uint256" }, { name: "startedAt", type: "uint256" }, { name: "lastUpdatedAt", type: "uint256" }, { name: "active", type: "bool" }] },
  { name: "bearMarketMultiplier", type: "function", stateMutability: "view", inputs: [],                                                                                               outputs: [{ type: "uint256" }] },
] as const;

export const MARKETPLACE_ABI = [
  { name: "createListing",  type: "function", stateMutability: "nonpayable", inputs: [{ name: "tokenId", type: "uint256" }, { name: "amount", type: "uint256" }, { name: "pricePerUnit", type: "uint256" }, { name: "expiresAt", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "buy",            type: "function", stateMutability: "nonpayable", inputs: [{ name: "listingId", type: "uint256" }, { name: "amount", type: "uint256" }],                  outputs: [] },
  { name: "cancelListing",  type: "function", stateMutability: "nonpayable", inputs: [{ name: "listingId", type: "uint256" }],                                                       outputs: [] },
  { name: "listingCount",   type: "function", stateMutability: "view",       inputs: [],                                                                                              outputs: [{ type: "uint256" }] },
  { name: "listings",       type: "function", stateMutability: "view",       inputs: [{ name: "", type: "uint256" }],                                                                 outputs: [{ name: "seller", type: "address" }, { name: "tokenId", type: "uint256" }, { name: "amount", type: "uint256" }, { name: "pricePerUnit", type: "uint256" }, { name: "expiresAt", type: "uint256" }, { name: "active", type: "bool" }] },
] as const;

export const VAULT_ABI = [
  { name: "createVault",     type: "function", stateMutability: "nonpayable", inputs: [{ name: "tokenId", type: "uint256" }, { name: "name", type: "string" }, { name: "isPublic", type: "bool" }], outputs: [{ name: "vaultId", type: "uint256" }] },
  { name: "mintToVault",     type: "function", stateMutability: "nonpayable", inputs: [{ name: "vaultId", type: "uint256" }, { name: "amount", type: "uint256" }],                  outputs: [] },
  { name: "stakeInVault",    type: "function", stateMutability: "nonpayable", inputs: [{ name: "vaultId", type: "uint256" }, { name: "amount", type: "uint256" }],                  outputs: [] },
  { name: "unstakeFromVault", type: "function", stateMutability: "nonpayable", inputs: [{ name: "vaultId", type: "uint256" }, { name: "amount", type: "uint256" }],                 outputs: [] },
  { name: "vaultCount",      type: "function", stateMutability: "view",       inputs: [],                                                                                            outputs: [{ type: "uint256" }] },
  { name: "vaults",          type: "function", stateMutability: "view",       inputs: [{ name: "", type: "uint256" }],                                                               outputs: [{ name: "owner", type: "address" }, { name: "tokenId", type: "uint256" }, { name: "name", type: "string" }, { name: "balance", type: "uint256" }, { name: "stakedBalance", type: "uint256" }, { name: "isPublic", type: "bool" }, { name: "oracleScore", type: "uint256" }] },
] as const;
