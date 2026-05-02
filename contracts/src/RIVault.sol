// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./EmoFiToken.sol";
import "./EMOToken.sol";

/**
 * @title RIVault
 * @dev Reality-Integrated Vault — personalized on-chain emotional vault.
 *      Users can mint, burn, stake, and transfer attribute tokens.
 *      Oracle data feeds into vault score adjustments.
 *      Vault contributors earn EMO rewards.
 */
contract RIVault is Ownable, ReentrancyGuard {
    EmoFiToken public immutable emoFiToken;
    EMOToken   public immutable emoToken;

    struct Vault {
        address owner;
        uint256 tokenId;          // ERC1155 attribute token type
        string  name;
        uint256 balance;          // attribute token balance
        uint256 stakedBalance;    // tokens staked inside vault
        uint256 oracleScore;      // 0–10000 (basis points), updated by oracle
        bool    isPublic;
        uint256 createdAt;
    }

    uint256 public vaultCount;
    mapping(uint256 => Vault) public vaults;
    mapping(address => uint256[]) public userVaults;

    // Contribution rewards
    uint256 public constant CONTRIBUTION_REWARD = 10 ether; // 10 EMO per contribution
    mapping(uint256 => mapping(address => bool)) public hasContributed;

    // ── Events ────────────────────────────────────────────────────────────
    event VaultCreated(uint256 indexed vaultId, address indexed owner, uint256 tokenId, string name);
    event TokensMinted(uint256 indexed vaultId, uint256 amount, uint256 newBalance);
    event TokensBurned(uint256 indexed vaultId, uint256 amount, uint256 newBalance);
    event TokensStaked(uint256 indexed vaultId, uint256 amount);
    event TokensUnstaked(uint256 indexed vaultId, uint256 amount);
    event OracleScoreUpdated(uint256 indexed vaultId, uint256 oldScore, uint256 newScore);
    event ContributionRewarded(uint256 indexed vaultId, address indexed contributor, uint256 reward);

    modifier onlyVaultOwner(uint256 vaultId) {
        require(vaults[vaultId].owner == msg.sender, "RIVault: not vault owner");
        _;
    }

    constructor(address _emoFiToken, address _emoToken) Ownable(msg.sender) {
        emoFiToken = EmoFiToken(_emoFiToken);
        emoToken   = EMOToken(_emoToken);
    }

    /**
     * @dev Create a new RI-Vault for a specific attribute token.
     */
    function createVault(uint256 tokenId, string calldata name, bool isPublic)
        external returns (uint256 vaultId)
    {
        vaultId = ++vaultCount;
        vaults[vaultId] = Vault({
            owner:         msg.sender,
            tokenId:       tokenId,
            name:          name,
            balance:       0,
            stakedBalance: 0,
            oracleScore:   5000, // neutral start (50%)
            isPublic:      isPublic,
            createdAt:     block.timestamp
        });
        userVaults[msg.sender].push(vaultId);
        emit VaultCreated(vaultId, msg.sender, tokenId, name);
    }

    /**
     * @dev Mint attribute tokens into the vault.
     *      Requires the vault's ERC1155 token to be transferred in.
     */
    function mintToVault(uint256 vaultId, uint256 amount)
        external nonReentrant onlyVaultOwner(vaultId)
    {
        Vault storage vault = vaults[vaultId];
        emoFiToken.safeTransferFrom(msg.sender, address(this), vault.tokenId, amount, "");
        vault.balance += amount;
        emit TokensMinted(vaultId, amount, vault.balance);
    }

    /**
     * @dev Burn tokens from the vault (negative attributes for rewards or scarcity).
     */
    function burnFromVault(uint256 vaultId, uint256 amount)
        external nonReentrant onlyVaultOwner(vaultId)
    {
        Vault storage vault = vaults[vaultId];
        require(vault.balance >= amount, "RIVault: insufficient balance");
        vault.balance -= amount;
        emoFiToken.burn(address(this), vault.tokenId, amount);
        // Burning negative attributes can earn EMO rewards (bear market utility)
        bool isNegative = (vault.tokenId == 1 || vault.tokenId == 4); // SADNESS, BAD_THOUGHT
        if (isNegative) {
            uint256 burnReward = (amount * 5) / 100; // 5% of burned amount in EMO
            emoToken.mint(msg.sender, burnReward);
        }
        emit TokensBurned(vaultId, amount, vault.balance);
    }

    /**
     * @dev Stake tokens inside a vault for reward accrual.
     */
    function stakeInVault(uint256 vaultId, uint256 amount)
        external nonReentrant onlyVaultOwner(vaultId)
    {
        Vault storage vault = vaults[vaultId];
        require(vault.balance >= amount, "RIVault: insufficient balance");
        vault.balance        -= amount;
        vault.stakedBalance  += amount;
        emit TokensStaked(vaultId, amount);
    }

    /**
     * @dev Unstake tokens from a vault.
     */
    function unstakeFromVault(uint256 vaultId, uint256 amount)
        external nonReentrant onlyVaultOwner(vaultId)
    {
        Vault storage vault = vaults[vaultId];
        require(vault.stakedBalance >= amount, "RIVault: insufficient staked balance");
        vault.stakedBalance -= amount;
        vault.balance       += amount;
        emit TokensUnstaked(vaultId, amount);
    }

    /**
     * @dev Oracle-controlled score update (called by oracle contract).
     */
    function updateOracleScore(uint256 vaultId, uint256 newScore)
        external onlyOwner
    {
        require(newScore <= 10000, "RIVault: score out of range");
        uint256 old = vaults[vaultId].oracleScore;
        vaults[vaultId].oracleScore = newScore;
        emit OracleScoreUpdated(vaultId, old, newScore);
    }

    /**
     * @dev Contribute to a public vault — earns EMO reward.
     */
    function contributeToVault(uint256 vaultId, uint256 tokenAmount)
        external nonReentrant
    {
        Vault storage vault = vaults[vaultId];
        require(vault.isPublic, "RIVault: vault is private");
        require(!hasContributed[vaultId][msg.sender], "RIVault: already contributed");
        emoFiToken.safeTransferFrom(msg.sender, address(this), vault.tokenId, tokenAmount, "");
        vault.balance += tokenAmount;
        hasContributed[vaultId][msg.sender] = true;
        emoToken.mint(msg.sender, CONTRIBUTION_REWARD);
        emit ContributionRewarded(vaultId, msg.sender, CONTRIBUTION_REWARD);
    }

    /**
     * @dev Return all vault IDs owned by an address.
     */
    function getUserVaults(address user) external view returns (uint256[] memory) {
        return userVaults[user];
    }

    function onERC1155Received(address, address, uint256, uint256, bytes memory)
        external pure returns (bytes4)
    {
        return this.onERC1155Received.selector;
    }
}
