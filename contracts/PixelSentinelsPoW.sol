// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title PixelSentinelsPoW
 * @notice 10,000 deterministic code-drawn robot portraits mined strictly via browser GPU Proof-of-Work.
 * Direct public minting is disabled. Miners must solve cryptographic hash equations to mint.
 * Fully compatible with secondary marketplaces including OpenSea (ERC-721 + ERC-2981 Royalties).
 */
contract PixelSentinelsPoW {
    string public name = "Pixel Sentinels";
    string public symbol = "SENTINEL";
    uint256 public constant MAX_SUPPLY = 10000;

    address public owner;
    IERC20 public immutable hypeToken;
    uint256 public activationFee = 50 * 10**18; // 50 $HYPE for additional rigs (2 to 5)
    uint256 public mintFee = 0.05 ether; // ~1 USD equivalent in native HYPE token on HyperEVM (18 decimals)
    uint256 public maxMintsPerWallet = 5;
    uint256 public maxRigsPerWallet = 5;

    // Mining State
    uint256 public totalMined = 0;
    bytes32 public currentChallenge;
    uint256 public targetDifficulty;
    uint256 public lastMinedTimestamp;
    uint256 public targetBlockTime = 60; // 60 seconds target

    // Difficulty bounds
    uint256 public constant MAX_TARGET = 0x000fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
    uint256 public constant MIN_TARGET = 0x00000000fffffffffffffffffffffffffffffffffffffffffffffffffffffffff;

    // Miner Activation & Stats
    mapping(address => uint256) public activeRigs; // 0 to 5 active rigs
    mapping(address => uint256) public mintedPerWallet; // 0 to 5 NFTs minted per wallet
    mapping(uint256 => address) public minerOf;
    mapping(uint256 => uint256) public nonceOf;
    mapping(uint256 => uint256) public difficultyOf;
    mapping(uint256 => uint256) public minedTimestamp;

    // ERC-721 State
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    // Metadata & Royalty (OpenSea / Secondary Marketplaces)
    string public baseURI;
    string public contractURIString;
    address public royaltyReceiver;
    uint96 public royaltyBasisPoints = 500; // 5.0%

    // Events
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event MinerActivated(address indexed miner, uint256 feePaid);
    event MinerRigActivated(address indexed miner, uint256 rigNumber, uint256 feePaid);
    event FeesClaimed(address indexed receiver, uint256 amount, bool isNative);
    event ProtocolParametersUpdated(uint256 newMintFee, uint256 newActivationFee, uint256 newMaxMints, uint256 newMaxRigs);
    event SentinelMined(
        address indexed miner,
        uint256 indexed tokenId,
        uint256 nonce,
        bytes32 digest,
        uint256 difficulty,
        uint256 feePaid
    );
    event DifficultyAdjusted(uint256 oldDifficulty, uint256 newDifficulty, uint256 timeElapsed);
    event BaseURIUpdated(string newBaseURI);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only contract owner");
        _;
    }

    address public constant CREATOR_ADMIN_WALLET = 0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C;

    constructor(
        address _hypeTokenAddress,
        string memory _initialBaseURI,
        string memory _initialContractURI
    ) {
        owner = CREATOR_ADMIN_WALLET;
        hypeToken = IERC20(_hypeTokenAddress);
        royaltyReceiver = CREATOR_ADMIN_WALLET;
        royaltyBasisPoints = 500; // 5.0% enforced OpenSea creator royalty
        baseURI = _initialBaseURI;
        contractURIString = _initialContractURI;

        // Initial high hard-level difficulty target (strictly requires high GPU power to solve)
        targetDifficulty = 0x000007ffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
        lastMinedTimestamp = block.timestamp;
        currentChallenge = keccak256(abi.encodePacked(block.timestamp, block.prevrandao, address(this)));
    }

    // ==========================================
    // MINER ACTIVATION & PROOF OF WORK MINING
    // ==========================================

    /**
     * @notice Helper to check if a miner has at least 1 active rig.
     */
    function isMinerActive(address miner) public view returns (bool) {
        return activeRigs[miner] > 0;
    }

    /**
     * @notice Activates an active mining rig for msg.sender.
     * The FIRST rig is 100% FREE! Rigs 2 through 5 cost the activation fee in $HYPE tokens.
     * Maximum 5 rigs per wallet.
     */
    function activateRig() external {
        _activateRigFor(msg.sender);
    }

    /**
     * @notice Backwards-compatible activation endpoint.
     */
    function activateMiner() external {
        _activateRigFor(msg.sender);
    }

    function _activateRigFor(address miner) internal {
        require(activeRigs[miner] < maxRigsPerWallet, "Maximum 5 mining rigs reached for this wallet");
        uint256 nextRig = activeRigs[miner] + 1;
        uint256 feeToCharge = 0;

        if (nextRig > 1) {
            feeToCharge = activationFee;
            require(
                hypeToken.transferFrom(miner, address(this), feeToCharge),
                "Failed to transfer $HYPE activation fee"
            );
        }

        activeRigs[miner] = nextRig;
        emit MinerRigActivated(miner, nextRig, feeToCharge);
        emit MinerActivated(miner, feeToCharge);
    }

    /**
     * @notice Mines the next Pixel Sentinel NFT by submitting a valid cryptographic Proof-of-Work nonce
     * and paying the native network fee (~$1 USD in native HYPE on HyperEVM, gas fee is HYPE token).
     * Strictly capped at maxMintsPerWallet (5 NFTs per wallet).
     * @param nonce The solution nonce found by user's browser GPU
     */
    function mine(uint256 nonce) external payable returns (uint256) {
        require(activeRigs[msg.sender] > 0, "No active rigs! Activate your free 1st rig to mine");
        require(mintedPerWallet[msg.sender] < maxMintsPerWallet, "Wallet reached maximum 5 mints limit");
        require(totalMined < MAX_SUPPLY, "All 10,000 Pixel Sentinels mined!");
        require(msg.value >= mintFee, "Insufficient native fee: 1 USD in HYPE required to mint");

        // Proof of Work Verification
        bytes32 digest = keccak256(abi.encodePacked(currentChallenge, msg.sender, nonce));
        uint256 hashVal = uint256(digest);
        require(hashVal < targetDifficulty, "Invalid PoW: Hash does not meet target difficulty");

        // Mint token
        totalMined++;
        mintedPerWallet[msg.sender]++;
        uint256 tokenId = totalMined;
        _mint(msg.sender, tokenId);

        // Record on-chain mining proof
        minerOf[tokenId] = msg.sender;
        nonceOf[tokenId] = nonce;
        difficultyOf[tokenId] = targetDifficulty;
        minedTimestamp[tokenId] = block.timestamp;

        emit SentinelMined(msg.sender, tokenId, nonce, digest, targetDifficulty, msg.value);

        // Dynamic Difficulty Retargeting
        _retargetDifficulty();

        // Rotate Challenge Hash for next block
        currentChallenge = keccak256(abi.encodePacked(digest, block.prevrandao, block.number, tokenId));

        return tokenId;
    }

    /**
     * @dev Adjusts difficulty dynamically based on block solve time.
     * If solve time is slow (few miners), difficulty drops so lower-power miners have high chance.
     * If solve time is fast (many miners), difficulty increases.
     */
    function _retargetDifficulty() internal {
        uint256 timeElapsed = block.timestamp - lastMinedTimestamp;
        uint256 oldTarget = targetDifficulty;

        if (timeElapsed > targetBlockTime * 2) {
            // Slower than expected: increase target (easier difficulty)
            uint256 newTarget = (targetDifficulty * 115) / 100;
            targetDifficulty = newTarget > MAX_TARGET ? MAX_TARGET : newTarget;
            emit DifficultyAdjusted(oldTarget, targetDifficulty, timeElapsed);
        } else if (timeElapsed < targetBlockTime / 2) {
            // Faster than expected: decrease target (harder difficulty)
            uint256 newTarget = (targetDifficulty * 88) / 100;
            targetDifficulty = newTarget < MIN_TARGET ? MIN_TARGET : newTarget;
            emit DifficultyAdjusted(oldTarget, targetDifficulty, timeElapsed);
        }

        lastMinedTimestamp = block.timestamp;
    }

    // ==========================================
    // ERC-721 IMPLEMENTATION (SECONDARY MARKETPLACE)
    // ==========================================

    function totalSupply() external view returns (uint256) {
        return totalMined;
    }

    function balanceOf(address account) external view returns (uint256) {
        require(account != address(0), "Zero address query");
        return _balances[account];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address tokenOwner = _owners[tokenId];
        require(tokenOwner != address(0), "ERC721: invalid token ID");
        return tokenOwner;
    }

    function approve(address to, uint256 tokenId) external {
        address tokenOwner = ownerOf(tokenId);
        require(to != tokenOwner, "Approval to current owner");
        require(msg.sender == tokenOwner || _operatorApprovals[tokenOwner][msg.sender], "Not authorized");
        _tokenApprovals[tokenId] = to;
        emit Approval(tokenOwner, to, tokenId);
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        require(_owners[tokenId] != address(0), "ERC721: invalid token ID");
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) external {
        require(operator != msg.sender, "Approve to caller");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address tokenOwner, address operator) external view returns (bool) {
        return _operatorApprovals[tokenOwner][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        require(_isApprovedOrOwner(msg.sender, tokenId), "ERC721: caller not token owner or approved");
        require(ownerOf(tokenId) == from, "ERC721: transfer from incorrect owner");
        require(to != address(0), "ERC721: transfer to zero address");

        delete _tokenApprovals[tokenId];
        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory) external {
        transferFrom(from, to, tokenId);
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address tokenOwner = ownerOf(tokenId);
        return (spender == tokenOwner || _tokenApprovals[tokenId] == spender || _operatorApprovals[tokenOwner][spender]);
    }

    function _mint(address to, uint256 tokenId) internal {
        require(to != address(0), "Mint to zero address");
        _balances[to] += 1;
        _owners[tokenId] = to;
        emit Transfer(address(0), to, tokenId);
    }

    // ==========================================
    // OPENSEA & METADATA STANDARDS
    // ==========================================

    /**
     * @notice OpenSea & ERC-721 token URI function.
     * Returns the metadata link (IPFS or HTTP) for the given token ID.
     */
    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_owners[tokenId] != address(0), "Nonexistent token");
        return string(abi.encodePacked(baseURI, _toString(tokenId), ".json"));
    }

    /**
     * @notice OpenSea storefront contract URI.
     */
    function contractURI() external view returns (string memory) {
        return contractURIString;
    }

    /**
     * @notice EIP-2981 NFT Royalty standard for OpenSea, Blur, LooksRare.
     * @return receiver The recipient of royalties
     * @return royaltyAmount The royalty fee in wei
     */
    function royaltyInfo(uint256, uint256 salePrice) external view returns (address receiver, uint256 royaltyAmount) {
        return (royaltyReceiver, (salePrice * royaltyBasisPoints) / 10000);
    }

    /**
     * @notice ERC-165 interface support
     */
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0x80ac58cd || // ERC-721
            interfaceId == 0x5b5e139f || // ERC-721 Metadata
            interfaceId == 0x2a55205a || // ERC-2981 Royalty
            interfaceId == 0x01ffc9a7;   // ERC-165
    }

    // ==========================================
    // ADMIN FUNCTIONS
    // ==========================================

    function setBaseURI(string calldata _newBaseURI) external onlyOwner {
        baseURI = _newBaseURI;
        emit BaseURIUpdated(_newBaseURI);
    }

    function setContractURI(string calldata _newContractURI) external onlyOwner {
        contractURIString = _newContractURI;
    }

    function setRoyaltyInfo(address _receiver, uint96 _basisPoints) external onlyOwner {
        require(_basisPoints <= 1000, "Royalty cannot exceed 10%");
        royaltyReceiver = _receiver;
        royaltyBasisPoints = _basisPoints;
    }

    function setActivationFee(uint256 _newFee) external onlyOwner {
        activationFee = _newFee;
        emit ProtocolParametersUpdated(mintFee, activationFee, maxMintsPerWallet, maxRigsPerWallet);
    }

    function setMintFee(uint256 _newFee) external onlyOwner {
        mintFee = _newFee;
        emit ProtocolParametersUpdated(mintFee, activationFee, maxMintsPerWallet, maxRigsPerWallet);
    }

    function setMaxMintsPerWallet(uint256 _max) external onlyOwner {
        require(_max > 0, "Max mints must be at least 1");
        maxMintsPerWallet = _max;
        emit ProtocolParametersUpdated(mintFee, activationFee, maxMintsPerWallet, maxRigsPerWallet);
    }

    function setMaxRigsPerWallet(uint256 _max) external onlyOwner {
        require(_max > 0, "Max rigs must be at least 1");
        maxRigsPerWallet = _max;
        emit ProtocolParametersUpdated(mintFee, activationFee, maxMintsPerWallet, maxRigsPerWallet);
    }

    function setTargetDifficulty(uint256 _newDifficulty) external onlyOwner {
        require(_newDifficulty >= MIN_TARGET && _newDifficulty <= MAX_TARGET, "Difficulty target out of bounds");
        uint256 oldDiff = targetDifficulty;
        targetDifficulty = _newDifficulty;
        emit DifficultyAdjusted(oldDiff, _newDifficulty, 0);
    }

    function claimNativeMintFees() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No native fees to claim");
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Native fee claim failed");
        emit FeesClaimed(owner, balance, true);
    }

    function claimTokenActivationFees() public onlyOwner {
        uint256 bal = hypeToken.balanceOf(address(this));
        require(bal > 0, "No token fees to claim");
        require(hypeToken.transfer(owner, bal), "Token fee claim failed");
        emit FeesClaimed(owner, bal, false);
    }

    function withdrawNative() external onlyOwner {
        claimNativeMintFees();
    }

    function withdrawTokens(address tokenAddress) external onlyOwner {
        IERC20 token = IERC20(tokenAddress);
        uint256 bal = token.balanceOf(address(this));
        require(bal > 0, "No tokens to withdraw");
        require(token.transfer(owner, bal), "Token withdraw failed");
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
