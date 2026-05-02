import { Router } from "express";
import { db, usersTable, attributeTokensTable, userTokenBalancesTable, vaultsTable, marketplaceListingsTable, stakingPositionsTable, governanceProposalsTable, oracleFeedsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

router.post("/seed", async (_req, res) => {
  await db.execute(sql`TRUNCATE TABLE oracle_feeds, ai_recommendations, reward_claims, votes, governance_proposals, staking_positions, trades, marketplace_listings, vault_transactions, vaults, user_token_balances, attribute_tokens, users RESTART IDENTITY CASCADE`);

  await db.insert(attributeTokensTable).values([
    { tokenType: "happiness",    name: "Happiness",    description: "Joy, well-being, and positive emotional states that drive human flourishing.", currentSupply: "8420.5", maxSupply: "1000000", priceEmo: "1.2", color: "#FFD700", icon: "😊", positiveAttribute: true,  totalStaked: "2100.25", totalBurned: "150.5",  volume24h: "1240.8" },
    { tokenType: "sadness",      name: "Sadness",      description: "Deep emotional experiences that carry transformative value in the EmoFi ecosystem.", currentSupply: "4200.0", maxSupply: "500000",  priceEmo: "0.6", color: "#4A90D9", icon: "😢", positiveAttribute: false, totalStaked: "800.0",  totalBurned: "340.0", volume24h: "560.2" },
    { tokenType: "beautiful",    name: "Beautiful",    description: "Aesthetic perception and appreciation — a reward token earned through positive staking.", currentSupply: "3150.0", maxSupply: "750000",  priceEmo: "1.5", color: "#FF69B4", icon: "✨", positiveAttribute: true,  totalStaked: "900.5",  totalBurned: "60.0",  volume24h: "890.5" },
    { tokenType: "good_thought", name: "Good Thought", description: "Constructive thinking patterns that compound into wisdom and vault growth.", currentSupply: "2800.0", maxSupply: "300000",  priceEmo: "0.9", color: "#7CFC00", icon: "💭", positiveAttribute: true,  totalStaked: "650.0",  totalBurned: "30.0",  volume24h: "420.3" },
    { tokenType: "bad_thought",  name: "Bad Thought",  description: "Negative cognition patterns with unique burn mechanics generating protocol yield.", currentSupply: "1900.0", maxSupply: "200000",  priceEmo: "0.4", color: "#8B0000", icon: "💀", positiveAttribute: false, totalStaked: "200.0",  totalBurned: "550.0", volume24h: "310.1" },
    { tokenType: "intelligence", name: "Intelligence", description: "Cognitive potential and learning capacity — compounding over time in your vault.", currentSupply: "5600.0", maxSupply: null,      priceEmo: "2.5", color: "#9B59B6", icon: "🧠", positiveAttribute: true,  totalStaked: "1800.0", totalBurned: "45.0",  volume24h: "1580.7" },
    { tokenType: "talent",       name: "Talent",       description: "Natural gifts and developed skills represented as tradeable protocol assets.", currentSupply: "4100.0", maxSupply: null,      priceEmo: "2.0", color: "#E67E22", icon: "🌟", positiveAttribute: true,  totalStaked: "1200.0", totalBurned: "80.0",  volume24h: "1100.4" },
    { tokenType: "spirituality", name: "Spirituality", description: "Inner peace and transcendental awareness — the rarest and most valued attribute.", currentSupply: "1200.0", maxSupply: null,      priceEmo: "1.8", color: "#1ABC9C", icon: "🕊️", positiveAttribute: true,  totalStaked: "500.0",  totalBurned: "20.0",  volume24h: "650.9" },
    { tokenType: "situational",  name: "Situational",  description: "Context-dependent emotional responses tied to real-world oracle data events.", currentSupply: "6300.0", maxSupply: null,      priceEmo: "0.5", color: "#95A5A6", icon: "🎭", positiveAttribute: false, totalStaked: "1100.0", totalBurned: "900.0", volume24h: "780.6" },
  ]);

  const [user1] = await db.insert(usersTable).values({ walletAddress: "0x742d35Cc6634C0532925a3b8D4C9E2b6a7e3f4d1", username: "emo_satoshi", bio: "Emotional finance pioneer. Founder of the EmoFi Protocol.", emoBalance: "42500.000000", reputationScore: 980 }).returning();
  const [user2] = await db.insert(usersTable).values({ walletAddress: "0x9B2A5e8f3c1D4a7E6B0F2e9d8c3A5b1F7e4c2a0", username: "vault_maven", bio: "RI-Vault specialist. Positive attribute maximalist.", emoBalance: "18200.000000", reputationScore: 720 }).returning();
  const [user3] = await db.insert(usersTable).values({ walletAddress: "0x3Cc7F2E1b9A4d6e8C0F1a2b5D8e3f7A9c4B6d2e", username: "bear_alchemist", bio: "Turning negative emotions into protocol yield since 2025.", emoBalance: "9400.000000", reputationScore: 540 }).returning();
  const [user4] = await db.insert(usersTable).values({ walletAddress: "0x1a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9a0", username: "intelligence_dao", bio: "DAO governance participant. 100% voter participation record.", emoBalance: "5200.000000", reputationScore: 880 }).returning();

  await db.insert(userTokenBalancesTable).values([
    { userId: user1.id, tokenType: "happiness",    balance: "450.5", lockedBalance: "100.0" },
    { userId: user1.id, tokenType: "intelligence", balance: "320.0", lockedBalance: "200.0" },
    { userId: user1.id, tokenType: "beautiful",    balance: "215.3", lockedBalance: "0" },
    { userId: user2.id, tokenType: "talent",       balance: "600.0", lockedBalance: "300.0" },
    { userId: user2.id, tokenType: "spirituality", balance: "150.2", lockedBalance: "0" },
    { userId: user3.id, tokenType: "sadness",      balance: "800.0", lockedBalance: "400.0" },
    { userId: user3.id, tokenType: "bad_thought",  balance: "500.0", lockedBalance: "200.0" },
    { userId: user4.id, tokenType: "good_thought", balance: "275.0", lockedBalance: "0" },
  ]);

  const [vault1] = await db.insert(vaultsTable).values({ userId: user1.id, name: "Emo Satoshi's Happiness Vault", tokenType: "happiness", description: "Primary happiness vault. Fed by oracle mood data.", balance: "450.5", stakedBalance: "100.0", oracleScore: "87.50", isPublic: true }).returning();
  const [vault2] = await db.insert(vaultsTable).values({ userId: user1.id, name: "Intelligence Reserve", tokenType: "intelligence", description: "Cognitive capital stored for long-term compounding.", balance: "320.0", stakedBalance: "200.0", oracleScore: "92.30", isPublic: true }).returning();
  const [vault3] = await db.insert(vaultsTable).values({ userId: user2.id, name: "Talent Showcase", tokenType: "talent", description: "Public talent vault open for contributions.", balance: "600.0", stakedBalance: "300.0", oracleScore: "78.10", isPublic: true }).returning();
  const [vault4] = await db.insert(vaultsTable).values({ userId: user3.id, name: "Bear Alchemy Lab", tokenType: "sadness", description: "Negative emotion vault — burns Sadness for EMO yield.", balance: "800.0", stakedBalance: "400.0", oracleScore: "55.00", isPublic: false }).returning();

  await db.insert(marketplaceListingsTable).values([
    { sellerId: user1.id, tokenType: "happiness",    amount: "100.0", remainingAmount: "100.0", pricePerUnit: "1.25", status: "active" },
    { sellerId: user2.id, tokenType: "talent",       amount: "50.0",  remainingAmount: "50.0",  pricePerUnit: "2.10", status: "active" },
    { sellerId: user3.id, tokenType: "sadness",      amount: "200.0", remainingAmount: "150.0", pricePerUnit: "0.55", status: "active" },
    { sellerId: user1.id, tokenType: "intelligence", amount: "30.0",  remainingAmount: "30.0",  pricePerUnit: "2.80", status: "active" },
    { sellerId: user4.id, tokenType: "good_thought", amount: "75.0",  remainingAmount: "75.0",  pricePerUnit: "0.95", status: "active" },
    { sellerId: user2.id, tokenType: "spirituality", amount: "25.0",  remainingAmount: "0.0",   pricePerUnit: "1.90", status: "sold" },
  ]);

  await db.insert(stakingPositionsTable).values([
    { userId: user1.id, stakedTokenType: "happiness",    rewardTokenType: "beautiful",    amountStaked: "100.0", rewardRate: "0.01", pendingRewards: "1.250", totalEarned: "45.3",  isActive: true,  lastClaimedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
    { userId: user1.id, stakedTokenType: "intelligence", rewardTokenType: "good_thought", amountStaked: "200.0", rewardRate: "0.02", pendingRewards: "3.100", totalEarned: "120.8", isActive: true,  lastClaimedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
    { userId: user2.id, stakedTokenType: "talent",       rewardTokenType: "happiness",    amountStaked: "300.0", rewardRate: "0.015", pendingRewards: "5.400", totalEarned: "87.2",  isActive: true,  lastClaimedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) },
    { userId: user3.id, stakedTokenType: "sadness",      rewardTokenType: "beautiful",    amountStaked: "400.0", rewardRate: "0.01", pendingRewards: "2.800", totalEarned: "62.5",  isActive: true  },
  ]);

  const endsAt1 = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  const endsAt2 = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const endsAt3 = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
  await db.insert(governanceProposalsTable).values([
    { proposerId: user1.id, title: "Activate Bear Market Staking Multiplier", description: "During bear market periods (oracle sentiment < 40), automatically increase staking rewards by 2x across all positive attribute tokens to incentivize holding.", proposalType: "bear_market_incentive", status: "active", forVotes: "4200.5", againstVotes: "1100.2", quorumRequired: "1000", totalVoters: 12, endsAt: endsAt1 },
    { proposerId: user4.id, title: "Add Empathy as New Attribute Token", description: "Introduce EMPA (Empathy) token — a new positive attribute representing social emotional intelligence. Max supply: 500,000. Staking pair: Empathy → Beautiful.", proposalType: "new_attribute", status: "active", forVotes: "3800.0", againstVotes: "900.0",  quorumRequired: "1000", totalVoters: 9,  endsAt: endsAt2 },
    { proposerId: user2.id, title: "Reduce Marketplace Fee to 1.5%", description: "Current 2.5% fee on marketplace transactions is reducing volume. Proposal to lower to 1.5% to increase liquidity and attract more traders.", proposalType: "marketplace_fee", status: "active", forVotes: "5100.0", againstVotes: "2400.0", quorumRequired: "1000", totalVoters: 18, endsAt: endsAt3 },
    { proposerId: user3.id, title: "Oracle Data Feed: Spotify Mood Integration", description: "Integrate Spotify emotional audio analysis as an oracle data source for mood-based vault scoring.", proposalType: "oracle_policy", status: "passed", forVotes: "8200.0", againstVotes: "1500.0", quorumRequired: "1000", totalVoters: 31, endsAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
  ]);

  await db.insert(oracleFeedsTable).values([
    { feedType: "mood",              userId: user1.id, value: "87.50", source: "biometric_wearable", verified: true,  metadata: { device: "Oura Ring", confidence: 0.94 } },
    { feedType: "achievement",       userId: user2.id, value: "92.00", source: "github_commits",     verified: true,  metadata: { commits: 47, streak: 12 } },
    { feedType: "talent_score",      userId: user2.id, value: "78.30", source: "skill_assessment",   verified: true,  metadata: { platform: "Coursera", certifications: 3 } },
    { feedType: "intelligence_score",userId: user1.id, value: "95.10", source: "cognitive_test",     verified: true,  metadata: { test: "Mensa", percentile: 95 } },
    { feedType: "spiritual_index",   userId: user3.id, value: "65.80", source: "meditation_app",     verified: false, metadata: { app: "Headspace", minutes: 2400 } },
    { feedType: "situational_event", userId: null,     value: "42.00", source: "market_sentiment",   verified: true,  metadata: { index: "Fear & Greed", sentiment: "fear" } },
  ]);

  res.json({ success: true, message: "Database seeded with EmoFi protocol data", counts: { users: 4, tokens: 9, vaults: 4, listings: 6, stakingPositions: 4, proposals: 4, oracleFeeds: 6 } });
});

export default router;
