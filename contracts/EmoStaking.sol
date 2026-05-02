// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./EmoFiToken.sol";
import "./EMOToken.sol";

/**
 * @title EmoStaking
 * @dev Stake positive attribute tokens to earn reward tokens.
 *      Example: stake Happiness → earn Beautiful.
 *      Reward rates are dynamically adjustable by the DAO.
 *      Bear market incentive logic: rewards are boosted during negative market periods.
 */
contract EmoStaking is ReentrancyGuard, Ownable {
    EmoFiToken public immutable emoFiToken;
    EMOToken   public immutable emoToken;

    struct StakingPair {
        uint256 stakedTokenId;
        uint256 rewardTokenId;
        uint256 rewardRatePerDay;  // tokens per staked token per day (18 decimals)
        bool    active;
    }

    struct Position {
        address staker;
        uint256 pairId;
        uint256 amount;
        uint256 rewardDebt;
        uint256 pendingRewards;
        uint256 totalEarned;
        uint256 startedAt;
        uint256 lastUpdatedAt;
        bool    active;
    }

    uint256 public pairCount;
    uint256 public positionCount;

    mapping(uint256 => StakingPair) public pairs;
    mapping(uint256 => Position)    public positions;
    mapping(address => uint256[])   public userPositions;

    // Bear market multiplier: DAO can set to boost rewards (100 = 1x, 200 = 2x)
    uint256 public bearMarketMultiplier = 100;

    // ── Events ────────────────────────────────────────────────────────────
    event PairAdded(uint256 indexed pairId, uint256 stakedTokenId, uint256 rewardTokenId, uint256 rate);
    event Staked(uint256 indexed positionId, address indexed staker, uint256 pairId, uint256 amount);
    event Unstaked(uint256 indexed positionId, address indexed staker, uint256 amount, uint256 rewards);
    event RewardsClaimed(uint256 indexed positionId, address indexed staker, uint256 amount);
    event BearMarketMultiplierUpdated(uint256 oldMult, uint256 newMult);

    constructor(address _emoFiToken, address _emoToken) Ownable(msg.sender) {
        emoFiToken = EmoFiToken(_emoFiToken);
        emoToken   = EMOToken(_emoToken);

        // Add default staking pairs from whitepaper
        _addPair(0, 2, 0.01 ether);   // Happiness → Beautiful
        _addPair(3, 2, 0.005 ether);  // Good Thought → Beautiful
        _addPair(5, 3, 0.02 ether);   // Intelligence → Good Thought
        _addPair(6, 0, 0.015 ether);  // Talent → Happiness
    }

    function _addPair(uint256 stakedId, uint256 rewardId, uint256 rate) internal {
        uint256 id = ++pairCount;
        pairs[id] = StakingPair(stakedId, rewardId, rate, true);
        emit PairAdded(id, stakedId, rewardId, rate);
    }

    /**
     * @dev Add a new staking pair (DAO controlled).
     */
    function addPair(uint256 stakedTokenId, uint256 rewardTokenId, uint256 ratePerDay)
        external onlyOwner
    {
        _addPair(stakedTokenId, rewardTokenId, ratePerDay);
    }

    /**
     * @dev Stake attribute tokens into a position.
     */
    function stake(uint256 pairId, uint256 amount) external nonReentrant returns (uint256 positionId) {
        StakingPair storage pair = pairs[pairId];
        require(pair.active, "Staking: pair not active");
        require(amount > 0, "Staking: zero amount");

        emoFiToken.safeTransferFrom(msg.sender, address(this), pair.stakedTokenId, amount, "");

        positionId = ++positionCount;
        positions[positionId] = Position({
            staker:       msg.sender,
            pairId:       pairId,
            amount:       amount,
            rewardDebt:   0,
            pendingRewards: 0,
            totalEarned:  0,
            startedAt:    block.timestamp,
            lastUpdatedAt: block.timestamp,
            active:       true
        });
        userPositions[msg.sender].push(positionId);

        emit Staked(positionId, msg.sender, pairId, amount);
    }

    /**
     * @dev Calculate pending rewards for a position.
     */
    function pendingRewards(uint256 positionId) public view returns (uint256) {
        Position storage pos = positions[positionId];
        if (!pos.active) return pos.pendingRewards;

        StakingPair storage pair = pairs[pos.pairId];
        uint256 elapsed = block.timestamp - pos.lastUpdatedAt;
        uint256 raw = (pos.amount * pair.rewardRatePerDay * elapsed) / (1 days);
        return pos.pendingRewards + (raw * bearMarketMultiplier / 100);
    }

    /**
     * @dev Claim accumulated rewards without unstaking.
     */
    function claimRewards(uint256 positionId) external nonReentrant {
        Position storage pos = positions[positionId];
        require(pos.staker == msg.sender, "Staking: not your position");

        uint256 rewards = pendingRewards(positionId);
        require(rewards > 0, "Staking: no rewards");

        pos.pendingRewards = 0;
        pos.totalEarned   += rewards;
        pos.lastUpdatedAt  = block.timestamp;

        StakingPair storage pair = pairs[pos.pairId];
        emoFiToken.mint(msg.sender, pair.rewardTokenId, rewards, "");
        emit RewardsClaimed(positionId, msg.sender, rewards);
    }

    /**
     * @dev Unstake tokens and collect all accumulated rewards.
     */
    function unstake(uint256 positionId) external nonReentrant {
        Position storage pos = positions[positionId];
        require(pos.staker == msg.sender, "Staking: not your position");
        require(pos.active, "Staking: position not active");

        uint256 rewards = pendingRewards(positionId);
        uint256 amount  = pos.amount;

        pos.active        = false;
        pos.pendingRewards = 0;
        pos.totalEarned   += rewards;
        pos.amount        = 0;

        StakingPair storage pair = pairs[pos.pairId];
        emoFiToken.safeTransferFrom(address(this), msg.sender, pair.stakedTokenId, amount, "");
        if (rewards > 0) {
            emoFiToken.mint(msg.sender, pair.rewardTokenId, rewards, "");
        }

        emit Unstaked(positionId, msg.sender, amount, rewards);
    }

    /**
     * @dev DAO can adjust bear market multiplier to boost rewards.
     */
    function setBearMarketMultiplier(uint256 multiplier) external onlyOwner {
        require(multiplier >= 100 && multiplier <= 500, "Staking: multiplier out of range");
        emit BearMarketMultiplierUpdated(bearMarketMultiplier, multiplier);
        bearMarketMultiplier = multiplier;
    }

    function onERC1155Received(address, address, uint256, uint256, bytes memory)
        external pure returns (bytes4)
    {
        return this.onERC1155Received.selector;
    }
}
