// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";

/**
 * @title EmoFiToken
 * @dev ERC1155 multi-attribute token for the EmoFi Protocol.
 *      Each token ID represents a human attribute: emotion, intelligence, talent, etc.
 */
contract EmoFiToken is ERC1155, AccessControl, ERC1155Burnable, ERC1155Supply {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant VAULT_ROLE  = keccak256("VAULT_ROLE");

    // ── Token IDs (ERC1155) ──────────────────────────────────────────────
    uint256 public constant HAPPINESS   = 0;
    uint256 public constant SADNESS     = 1;
    uint256 public constant BEAUTIFUL   = 2;
    uint256 public constant GOOD_THOUGHT = 3;
    uint256 public constant BAD_THOUGHT  = 4;
    uint256 public constant INTELLIGENCE = 5;
    uint256 public constant TALENT       = 6;
    uint256 public constant SPIRITUALITY = 7;
    uint256 public constant SITUATIONAL  = 8;

    // ── Token metadata ───────────────────────────────────────────────────
    struct TokenMetadata {
        string name;
        bool positiveAttribute;
        uint256 maxSupply;       // 0 = unlimited
        uint256 mintPrice;       // in EMO tokens (18 decimals)
    }

    mapping(uint256 => TokenMetadata) public tokenMetadata;

    // ── Events ────────────────────────────────────────────────────────────
    event TokenMinted(address indexed to, uint256 indexed tokenId, uint256 amount, address minter);
    event TokenBurned(address indexed from, uint256 indexed tokenId, uint256 amount);

    constructor(address admin, string memory baseUri) ERC1155(baseUri) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);

        _initMetadata();
    }

    function _initMetadata() internal {
        tokenMetadata[HAPPINESS]    = TokenMetadata("Happiness",    true,  1_000 ether, 1 ether);
        tokenMetadata[SADNESS]      = TokenMetadata("Sadness",      false, 500 ether,   0.5 ether);
        tokenMetadata[BEAUTIFUL]    = TokenMetadata("Beautiful",    true,  750 ether,   1.2 ether);
        tokenMetadata[GOOD_THOUGHT] = TokenMetadata("Good Thought", true,  300 ether,   0.8 ether);
        tokenMetadata[BAD_THOUGHT]  = TokenMetadata("Bad Thought",  false, 200 ether,   0.3 ether);
        tokenMetadata[INTELLIGENCE] = TokenMetadata("Intelligence", true,  0,           2 ether);
        tokenMetadata[TALENT]       = TokenMetadata("Talent",       true,  0,           2 ether);
        tokenMetadata[SPIRITUALITY] = TokenMetadata("Spirituality", true,  0,           1.5 ether);
        tokenMetadata[SITUATIONAL]  = TokenMetadata("Situational",  false, 0,           0.5 ether);
    }

    /**
     * @dev Mint attribute tokens.
     * @param to       Recipient address
     * @param tokenId  Attribute token ID (0–8)
     * @param amount   Amount to mint (in base units, 18 decimals)
     * @param data     Additional data
     */
    function mint(
        address to,
        uint256 tokenId,
        uint256 amount,
        bytes memory data
    ) external onlyRole(MINTER_ROLE) {
        TokenMetadata storage meta = tokenMetadata[tokenId];
        if (meta.maxSupply > 0) {
            require(totalSupply(tokenId) + amount <= meta.maxSupply, "EmoFi: max supply exceeded");
        }
        _mint(to, tokenId, amount, data);
        emit TokenMinted(to, tokenId, amount, msg.sender);
    }

    /**
     * @dev Batch mint multiple attribute tokens at once.
     */
    function mintBatch(
        address to,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        bytes memory data
    ) external onlyRole(MINTER_ROLE) {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            TokenMetadata storage meta = tokenMetadata[tokenIds[i]];
            if (meta.maxSupply > 0) {
                require(
                    totalSupply(tokenIds[i]) + amounts[i] <= meta.maxSupply,
                    "EmoFi: max supply exceeded"
                );
            }
        }
        _mintBatch(to, tokenIds, amounts, data);
    }

    // ── Overrides ────────────────────────────────────────────────────────
    function supportsInterface(bytes4 interfaceId)
        public view override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal override(ERC1155, ERC1155Supply)
    {
        super._update(from, to, ids, values);
    }
}
