// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title EMOToken
 * @dev ERC20 governance token for the EmoFi Protocol.
 *      Total supply: 1,000,000 EMO (with 18 decimals).
 *
 *      Distribution:
 *        40% → DAO/community treasury
 *        20% → Team (vesting)
 *        20% → Protocol liquidity/incentives
 *        20% → Strategic reserve
 */
contract EMOToken is ERC20, ERC20Burnable, ERC20Permit, ERC20Votes, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 public constant MAX_SUPPLY = 1_000_000 ether;

    // ── Distribution percentages ─────────────────────────────────────────
    uint256 public constant DAO_TREASURY_PCT  = 40;
    uint256 public constant TEAM_PCT          = 20;
    uint256 public constant LIQUIDITY_PCT     = 20;
    uint256 public constant RESERVE_PCT       = 20;

    event EMOMinted(address indexed to, uint256 amount);

    constructor(
        address admin,
        address daoTreasury,
        address teamMultisig,
        address liquidityPool,
        address strategicReserve
    ) ERC20("EmoFi Governance", "EMO") ERC20Permit("EmoFi Governance") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);

        // Distribute initial supply
        _mint(daoTreasury,    MAX_SUPPLY * DAO_TREASURY_PCT / 100);
        _mint(teamMultisig,   MAX_SUPPLY * TEAM_PCT         / 100);
        _mint(liquidityPool,  MAX_SUPPLY * LIQUIDITY_PCT    / 100);
        _mint(strategicReserve, MAX_SUPPLY * RESERVE_PCT   / 100);
    }

    /**
     * @dev Mint additional EMO (only for reward distribution, capped at MAX_SUPPLY).
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(totalSupply() + amount <= MAX_SUPPLY, "EMO: max supply exceeded");
        _mint(to, amount);
        emit EMOMinted(to, amount);
    }

    // ── Required overrides ───────────────────────────────────────────────
    function _update(address from, address to, uint256 value)
        internal override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }

    function nonces(address owner)
        public view override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}
