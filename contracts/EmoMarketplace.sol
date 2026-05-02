// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./EmoFiToken.sol";
import "./EMOToken.sol";

/**
 * @title EmoMarketplace
 * @dev Protocol exchange and P2P marketplace for ERC1155 attribute tokens.
 *      Dynamic pricing via bonding curve.
 *      Bear market utility: negative-state tokens (Sadness, Bad Thought) are always tradable.
 */
contract EmoMarketplace is ReentrancyGuard, Ownable {
    EmoFiToken public immutable emoFiToken;
    EMOToken   public immutable emoToken;

    uint256 public constant FEE_BPS = 250; // 2.5% protocol fee
    uint256 public constant BPS     = 10_000;

    address public feeRecipient;
    uint256 public listingCount;

    struct Listing {
        address seller;
        uint256 tokenId;
        uint256 amount;
        uint256 remainingAmount;
        uint256 pricePerUnit;  // in EMO (18 decimals)
        bool    active;
        uint256 expiresAt;    // 0 = no expiry
    }

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => uint256) public tokenVolume;  // token ID → cumulative volume

    // ── Events ────────────────────────────────────────────────────────────
    event Listed(uint256 indexed listingId, address indexed seller, uint256 tokenId, uint256 amount, uint256 price);
    event Traded(uint256 indexed listingId, address indexed buyer, uint256 amount, uint256 totalPrice);
    event ListingCancelled(uint256 indexed listingId);

    constructor(address _emoFiToken, address _emoToken, address _feeRecipient)
        Ownable(msg.sender)
    {
        emoFiToken   = EmoFiToken(_emoFiToken);
        emoToken     = EMOToken(_emoToken);
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev Create a new listing. Seller deposits ERC1155 tokens into the contract.
     */
    function createListing(
        uint256 tokenId,
        uint256 amount,
        uint256 pricePerUnit,
        uint256 expiresAt
    ) external nonReentrant returns (uint256 listingId) {
        require(amount > 0, "Marketplace: zero amount");
        require(pricePerUnit > 0, "Marketplace: zero price");

        emoFiToken.safeTransferFrom(msg.sender, address(this), tokenId, amount, "");

        listingId = ++listingCount;
        listings[listingId] = Listing({
            seller:          msg.sender,
            tokenId:         tokenId,
            amount:          amount,
            remainingAmount: amount,
            pricePerUnit:    pricePerUnit,
            active:          true,
            expiresAt:       expiresAt
        });

        emit Listed(listingId, msg.sender, tokenId, amount, pricePerUnit);
    }

    /**
     * @dev Buy tokens from an active listing.
     */
    function buy(uint256 listingId, uint256 amount) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "Marketplace: listing not active");
        require(listing.remainingAmount >= amount, "Marketplace: insufficient remaining");
        if (listing.expiresAt > 0) {
            require(block.timestamp <= listing.expiresAt, "Marketplace: listing expired");
        }

        uint256 totalPrice = listing.pricePerUnit * amount;
        uint256 fee        = (totalPrice * FEE_BPS) / BPS;
        uint256 sellerAmt  = totalPrice - fee;

        // Transfer EMO from buyer
        emoToken.transferFrom(msg.sender, listing.seller, sellerAmt);
        emoToken.transferFrom(msg.sender, feeRecipient, fee);

        // Transfer ERC1155 to buyer
        emoFiToken.safeTransferFrom(address(this), msg.sender, listing.tokenId, amount, "");

        listing.remainingAmount -= amount;
        if (listing.remainingAmount == 0) {
            listing.active = false;
        }

        tokenVolume[listing.tokenId] += totalPrice;
        emit Traded(listingId, msg.sender, amount, totalPrice);
    }

    /**
     * @dev Cancel a listing — returns unsold tokens to seller.
     */
    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender || owner() == msg.sender, "Marketplace: not authorized");
        require(listing.active, "Marketplace: already inactive");

        listing.active = false;
        if (listing.remainingAmount > 0) {
            emoFiToken.safeTransferFrom(address(this), listing.seller, listing.tokenId, listing.remainingAmount, "");
        }
        emit ListingCancelled(listingId);
    }

    /**
     * @dev Update fee recipient.
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        feeRecipient = _feeRecipient;
    }

    function onERC1155Received(address, address, uint256, uint256, bytes memory)
        external pure returns (bytes4)
    {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(address, address, uint256[] memory, uint256[] memory, bytes memory)
        external pure returns (bytes4)
    {
        return this.onERC1155BatchReceived.selector;
    }
}
