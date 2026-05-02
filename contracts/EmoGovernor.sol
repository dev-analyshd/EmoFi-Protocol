// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import "./EMOToken.sol";

/**
 * @title EmoGovernor
 * @dev DAO governance contract for the EmoFi Protocol.
 *      EMO token holders propose and vote on:
 *        - New attribute types
 *        - Staking and reward adjustments
 *        - Marketplace fees
 *        - Oracle validation policies
 *        - Bear market incentive mechanisms
 *
 *      Settings:
 *        - Voting delay: 1 day
 *        - Voting period: 7 days
 *        - Quorum: 4% of circulating EMO supply
 *        - Proposal threshold: 1,000 EMO
 */
contract EmoGovernor is
    Governor,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    uint256 public constant VOTING_DELAY  = 1 days  / 12; // ~1 day in blocks (12s blocks)
    uint256 public constant VOTING_PERIOD = 7 days  / 12; // ~7 days in blocks
    uint256 public constant PROPOSAL_THRESHOLD = 1_000 ether; // 1,000 EMO

    // ── Proposal types (for off-chain categorization) ─────────────────────
    enum ProposalCategory {
        NewAttribute,
        StakingAdjustment,
        MarketplaceFee,
        OraclePolicy,
        BearMarketIncentive,
        General
    }

    mapping(uint256 => ProposalCategory) public proposalCategories;

    event ProposalCategorized(uint256 indexed proposalId, ProposalCategory category);

    constructor(
        IVotes    _token,
        TimelockController _timelock
    )
        Governor("EmoGovernor")
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(4)  // 4% quorum
        GovernorTimelockControl(_timelock)
    {}

    // ── Override required functions ───────────────────────────────────────

    function votingDelay() public pure override returns (uint256) {
        return VOTING_DELAY;
    }

    function votingPeriod() public pure override returns (uint256) {
        return VOTING_PERIOD;
    }

    function proposalThreshold() public pure override returns (uint256) {
        return PROPOSAL_THRESHOLD;
    }

    /**
     * @dev Create a categorized proposal.
     */
    function proposeWithCategory(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description,
        ProposalCategory category
    ) external returns (uint256 proposalId) {
        proposalId = propose(targets, values, calldatas, description);
        proposalCategories[proposalId] = category;
        emit ProposalCategorized(proposalId, category);
    }

    // ── Required overrides ────────────────────────────────────────────────

    function state(uint256 proposalId)
        public view override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function proposalNeedsQueuing(uint256 proposalId)
        public view override(Governor, GovernorTimelockControl)
        returns (bool)
    {
        return super.proposalNeedsQueuing(proposalId);
    }

    function _queueOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint48) {
        return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _executeOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor()
        internal view override(Governor, GovernorTimelockControl)
        returns (address)
    {
        return super._executor();
    }
}
