// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IERC20 Minimal Interface
 */
interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title HypeVMNFTMining
 * @notice Production Proof-of-Work NFT Mining smart contract for HypeVM.
 * Direct minting is strictly disabled. Users must submit a valid cryptographic
 * Proof-of-Work solution mined via WebGPU to unlock minting.
 *
 * Maximum supply: 10,000 NFTs.
 * Dynamic difficulty scales deterministically as remaining supply decreases.
 * 5-Worker system: Worker 1 is FREE; Workers 2-5 activated with HYPE tokens.
 * Enforces ERC-721 and ERC-2981 (5% Creator Royalties for OpenSea).
 */
contract HypeVMNFTMining {
    string public name = "HashApe";
    string public symbol = "HASHAPE";
    uint256 public constant MAX_SUPPLY = 10000;

    address public owner;
    address public constant CREATOR_ADMIN_WALLET = 0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C;
    address public constant RIG_ACTIVATION_TOKEN_ADDRESS = 0x30E55c3cfB2BBe5d0B07051e0B15c8a532c45ecc;
    IERC20 public immutable hypeToken;

    // Fees & Parameters
    uint256 public mintFee = 0.05 ether; // ~1 USD equivalent in native HYPE on HyperEVM
    uint256[6] public workerActivationCost = [
        0,                 // Worker 0 unused
        0,                 // Worker 1: FREE
        100 * 10**18,      // Worker 2: 100 HYPE
        200 * 10**18,      // Worker 3: 200 HYPE
        300 * 10**18,      // Worker 4: 300 HYPE
        500 * 10**18       // Worker 5: 500 HYPE
    ];

    // Difficulty Targets by Supply Remaining
    // As remaining supply decreases, target difficulty gets lower (harder)
    uint256 public constant TARGET_EASY     = 0x000fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff; // 10k - 7.5k
    uint256 public constant TARGET_MEDIUM   = 0x0007ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff; // 7.5k - 5k
    uint256 public constant TARGET_HARD     = 0x0003ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff; // 5k - 2.5k
    uint256 public constant TARGET_VERYHARD = 0x0001ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff; // 2.5k - 1k
    uint256 public constant TARGET_EXTREME  = 0x00007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff; // 1k - 100
    uint256 public constant TARGET_MAXIMUM  = 0x00000fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff; // 100 - 1

    // Per-Wallet Cap & Escalating Difficulty Targets
    uint256 public constant MAX_MINTS_PER_WALLET = 5;
    mapping(address => uint256) public walletMints;

    // Sequential Escalating Difficulty Targets Per-Wallet (NFT 1/5 through 5/5)
    // Each subsequent NFT minted by a wallet becomes progressively harder
    uint256 public constant WALLET_TARGET_NFT1 = 0x0003ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff; // ~65k nonces (HARD)
    uint256 public constant WALLET_TARGET_NFT2 = 0x0001ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff; // ~131k nonces (HARDER)
    uint256 public constant WALLET_TARGET_NFT3 = 0x00007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff; // ~524k nonces (VERY HARD)
    uint256 public constant WALLET_TARGET_NFT4 = 0x00003fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff; // ~1.05M nonces (EXTREME)
    uint256 public constant WALLET_TARGET_NFT5 = 0x00000fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff; // ~4.19M nonces (LEGENDARY HARD)

    // Epoch-Based Progressive Difficulty & Escalating Mint Fees
    // 10 Epochs spanning 10,000 Total Supply:
    // Epoch 1: Tokens 1 to 10 (10 NFTs) - Mine Hard, Mint Fee: $5 ETH (0.0020 ETH)
    // Epoch 2: Tokens 11 to 30 (20 NFTs) - Mine Harder, Mint Fee: $7 ETH (0.0028 ETH)
    // Epoch 3-10: Progressively escalating difficulty and fees ($10, $14, $18, $22, $26, $30, $35, $40)
    struct Epoch {
        uint256 id;
        uint256 startToken;
        uint256 endToken;
        uint256 mintFeeWei;
        uint256 feeUsd;
        uint256 target;
        string name;
    }

    uint256 public constant TOTAL_EPOCHS = 10;

    // Mining State
    uint256 public totalMined = 0;
    bytes32 public currentChallenge;
    uint256 public currentRound = 1;
    bool public miningPaused = false;

    // Anti-Replay & Proof Tracking
    mapping(bytes32 => bool) public usedProofs;
    mapping(address => mapping(uint8 => bool)) public workerEntitled; // user => workerIndex => active

    // Mining Record History
    struct MiningProof {
        address miner;
        uint256 tokenId;
        uint256 nonce;
        bytes32 digest;
        uint256 difficulty;
        uint256 timestamp;
        uint256 epochId;
    }
    mapping(uint256 => MiningProof) public proofHistory;

    // ERC-721 Storage
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    // Metadata & Royalty Standards
    string public baseURI = "https://hypeprotocols.xyz/metadata/";
    string public contractURIString = "https://hypeprotocols.xyz/storefront.json";
    address public royaltyReceiver = CREATOR_ADMIN_WALLET;
    uint96 public royaltyBasisPoints = 500; // 5.0% OpenSea creator royalty

    // Events
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event WorkerActivated(address indexed user, uint8 indexed workerIndex, uint256 cost);
    event ProofVerifiedAndMinted(
        address indexed miner,
        uint256 indexed tokenId,
        uint256 nonce,
        bytes32 digest,
        uint256 difficulty,
        uint256 feePaid,
        uint256 epochId
    );
    event ChallengeRotated(bytes32 newChallenge, uint256 roundId);
    event ProtocolParametersUpdated(uint256 newMintFee, address newRoyaltyReceiver);
    event MiningPausedStateChanged(bool paused);
    event NativeMintFeesClaimed(address indexed recipient, uint256 amount);
    event TokenActivationFeesClaimed(address indexed recipient, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only protocol owner");
        _;
    }

    constructor(
        address _hypeTokenAddress,
        string memory _initBaseURI,
        string memory _initContractURI
    ) {
        owner = CREATOR_ADMIN_WALLET;
        address tokenAddr = _hypeTokenAddress != address(0) ? _hypeTokenAddress : RIG_ACTIVATION_TOKEN_ADDRESS;
        hypeToken = IERC20(tokenAddr);
        baseURI = _initBaseURI;
        contractURIString = _initContractURI;

        currentChallenge = keccak256(abi.encodePacked(block.timestamp, block.prevrandao, address(this), uint256(1)));
    }

    // ==========================================
    // DETERMINISTIC DYNAMIC DIFFICULTY
    // ==========================================

    /**
     * @notice Returns the authoritative mining difficulty target based on remaining supply.
     * As remaining supply drops, difficulty increases deterministically.
     */
    function getCurrentDifficultyTarget() public view returns (uint256) {
        uint256 remaining = MAX_SUPPLY > totalMined ? MAX_SUPPLY - totalMined : 0;
        if (remaining > 7500) {
            return TARGET_EASY;
        } else if (remaining > 5000) {
            return TARGET_MEDIUM;
        } else if (remaining > 2500) {
            return TARGET_HARD;
        } else if (remaining > 1000) {
            return TARGET_VERYHARD;
        } else if (remaining > 100) {
            return TARGET_EXTREME;
        } else {
            return TARGET_MAXIMUM;
        }
    }

    /**
     * @notice Human readable difficulty band name.
     */
    function getDifficultyBandName() external view returns (string memory) {
        uint256 remaining = MAX_SUPPLY > totalMined ? MAX_SUPPLY - totalMined : 0;
        if (remaining > 7500) return "EASY";
        if (remaining > 5000) return "MEDIUM";
        if (remaining > 2500) return "HARD";
        if (remaining > 1000) return "VERY HARD";
        if (remaining > 100) return "EXTREME";
        return "MAXIMUM";
    }

    /**
     * @notice Returns the escalating difficulty target for a specific wallet based on how many
     * NFTs they have already minted (from NFT 1/5 up to 5/5).
     * Difficulty escalates monotonically with each NFT minted by this address.
     */
    function getDifficultyTargetForWallet(address user) public view returns (uint256) {
        uint256 count = walletMints[user];
        if (count == 0) return WALLET_TARGET_NFT1;
        if (count == 1) return WALLET_TARGET_NFT2;
        if (count == 2) return WALLET_TARGET_NFT3;
        if (count == 3) return WALLET_TARGET_NFT4;
        if (count == 4) return WALLET_TARGET_NFT5;
        revert("Max 5 NFTs per wallet limit reached");
    }

    /**
     * @notice Returns human-readable name of current difficulty tier for a wallet.
     */
    function getWalletDifficultyTier(address user) external view returns (string memory) {
        uint256 count = walletMints[user];
        if (count == 0) return "HARD (NFT 1/5)";
        if (count == 1) return "HARDER (NFT 2/5)";
        if (count == 2) return "VERY HARD (NFT 3/5)";
        if (count == 3) return "EXTREME (NFT 4/5)";
        if (count == 4) return "LEGENDARY (NFT 5/5)";
        return "MAX QUOTA REACHED (5/5)";
    }

    // ==========================================
    // EPOCH PROGRESSION & PRICING
    // ==========================================

    // Epoch fee overrides set by admin: epochId => custom fee in wei
    mapping(uint256 => uint256) public epochMintFeeOverrides;
    mapping(uint256 => uint256) public epochFeeUsdOverrides;

    event EpochMintFeeUpdated(uint256 indexed epochId, uint256 oldFeeWei, uint256 newFeeWei, uint256 newFeeUsd);

    /**
     * @notice Allows the contract admin or owner to update the mint fee for any epoch.
     * @param epochId The epoch to update (1 to 10).
     * @param newFeeWei The new mint fee in wei.
     * @param newFeeUsd The USD reference price for telemetry.
     */
    function setEpochMintFee(uint256 epochId, uint256 newFeeWei, uint256 newFeeUsd) external {
        require(msg.sender == owner || msg.sender == CREATOR_ADMIN_WALLET, "Not authorized: Admin only");
        require(epochId >= 1 && epochId <= 10, "Invalid epoch ID (1-10)");
        require(newFeeWei > 0, "Fee must be greater than zero");

        uint256 oldFee = getEpochMintFee(epochId);
        epochMintFeeOverrides[epochId] = newFeeWei;
        epochFeeUsdOverrides[epochId] = newFeeUsd;

        emit EpochMintFeeUpdated(epochId, oldFee, newFeeWei, newFeeUsd);
    }

    /**
     * @notice Batch update mint fees across multiple epochs in one transaction.
     */
    function setEpochMintFeesBatch(
        uint256[] calldata epochIds,
        uint256[] calldata newFeesWei,
        uint256[] calldata newFeesUsd
    ) external {
        require(msg.sender == owner || msg.sender == CREATOR_ADMIN_WALLET, "Not authorized: Admin only");
        require(epochIds.length == newFeesWei.length && epochIds.length == newFeesUsd.length, "Array length mismatch");

        for (uint256 i = 0; i < epochIds.length; i++) {
            uint256 epochId = epochIds[i];
            require(epochId >= 1 && epochId <= 10, "Invalid epoch ID (1-10)");
            require(newFeesWei[i] > 0, "Fee must be greater than zero");

            uint256 oldFee = getEpochMintFee(epochId);
            epochMintFeeOverrides[epochId] = newFeesWei[i];
            epochFeeUsdOverrides[epochId] = newFeesUsd[i];

            emit EpochMintFeeUpdated(epochId, oldFee, newFeesWei[i], newFeesUsd[i]);
        }
    }

    /**
     * @notice Returns the effective mint fee for a specific epoch ID in wei.
     */
    function getEpochMintFee(uint256 epochId) public view returns (uint256) {
        if (epochMintFeeOverrides[epochId] > 0) {
            return epochMintFeeOverrides[epochId];
        }
        if (epochId == 1) return 0.0020 ether;
        if (epochId == 2) return 0.0028 ether;
        if (epochId == 3) return 0.0040 ether;
        if (epochId == 4) return 0.0056 ether;
        if (epochId == 5) return 0.0072 ether;
        if (epochId == 6) return 0.0088 ether;
        if (epochId == 7) return 0.0104 ether;
        if (epochId == 8) return 0.0120 ether;
        if (epochId == 9) return 0.0140 ether;
        return 0.0160 ether;
    }

    /**
     * @notice Returns the full epoch specifications for a given token ID.
     * 10 epochs progressively scaling across 10,000 total supply.
     * Custom admin fee overrides take precedence over defaults.
     */
    function getEpoch(uint256 tokenId) public view returns (Epoch memory) {
        Epoch memory ep;
        if (tokenId <= 10) {
            ep = Epoch({
                id: 1,
                startToken: 1,
                endToken: 10,
                mintFeeWei: 0.0020 ether, // $5 ETH equivalent
                feeUsd: 5,
                target: 0x0003ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff,
                name: "EPOCH 1 (GENESIS)"
            });
        } else if (tokenId <= 30) {
            ep = Epoch({
                id: 2,
                startToken: 11,
                endToken: 30,
                mintFeeWei: 0.0028 ether, // $7 ETH equivalent
                feeUsd: 7,
                target: 0x0001ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff,
                name: "EPOCH 2 (ASCENSION)"
            });
        } else if (tokenId <= 70) {
            ep = Epoch({
                id: 3,
                startToken: 31,
                endToken: 70,
                mintFeeWei: 0.0040 ether, // $10 ETH equivalent
                feeUsd: 10,
                target: 0x0000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff,
                name: "EPOCH 3 (EXPANSION)"
            });
        } else if (tokenId <= 150) {
            ep = Epoch({
                id: 4,
                startToken: 71,
                endToken: 150,
                mintFeeWei: 0.0056 ether, // $14 ETH equivalent
                feeUsd: 14,
                target: 0x00007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff,
                name: "EPOCH 4 (SURGE)"
            });
        } else if (tokenId <= 300) {
            ep = Epoch({
                id: 5,
                startToken: 151,
                endToken: 300,
                mintFeeWei: 0.0072 ether, // $18 ETH equivalent
                feeUsd: 18,
                target: 0x00003fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff,
                name: "EPOCH 5 (NEXUS)"
            });
        } else if (tokenId <= 600) {
            ep = Epoch({
                id: 6,
                startToken: 301,
                endToken: 600,
                mintFeeWei: 0.0088 ether, // $22 ETH equivalent
                feeUsd: 22,
                target: 0x00001fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff,
                name: "EPOCH 6 (APEX)"
            });
        } else if (tokenId <= 1200) {
            ep = Epoch({
                id: 7,
                startToken: 601,
                endToken: 1200,
                mintFeeWei: 0.0104 ether, // $26 ETH equivalent
                feeUsd: 26,
                target: 0x00000fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff,
                name: "EPOCH 7 (SOVEREIGN)"
            });
        } else if (tokenId <= 2500) {
            ep = Epoch({
                id: 8,
                startToken: 1201,
                endToken: 2500,
                mintFeeWei: 0.0120 ether, // $30 ETH equivalent
                feeUsd: 30,
                target: 0x000007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff,
                name: "EPOCH 8 (TITAN)"
            });
        } else if (tokenId <= 5000) {
            ep = Epoch({
                id: 9,
                startToken: 2501,
                endToken: 5000,
                mintFeeWei: 0.0140 ether, // $35 ETH equivalent
                feeUsd: 35,
                target: 0x000003fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff,
                name: "EPOCH 9 (MYTHIC)"
            });
        } else {
            ep = Epoch({
                id: 10,
                startToken: 5001,
                endToken: 10000,
                mintFeeWei: 0.0160 ether, // $40 ETH equivalent
                feeUsd: 40,
                target: 0x000001fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff,
                name: "EPOCH 10 (OMEGA)"
            });
        }

        // Apply admin fee override if configured
        if (epochMintFeeOverrides[ep.id] > 0) {
            ep.mintFeeWei = epochMintFeeOverrides[ep.id];
            ep.feeUsd = epochFeeUsdOverrides[ep.id];
        }

        return ep;
    }

    /**
     * @notice Returns current active epoch based on total supply mined.
     */
    function getCurrentEpoch() external view returns (Epoch memory) {
        uint256 nextToken = totalMined < MAX_SUPPLY ? totalMined + 1 : MAX_SUPPLY;
        return getEpoch(nextToken);
    }

    /**
     * @notice Returns required mint fee in wei for a specific token ID.
     */
    function getMintFee(uint256 tokenId) public view returns (uint256) {
        return getEpoch(tokenId).mintFeeWei;
    }

    // ==========================================
    // WORKER ENTITLEMENT MANAGEMENT
    // ==========================================

    /**
     * @notice Checks if a user is entitled to run a specific worker index (1 to 5).
     * Worker 1 is always FREE and active for all users.
     * Workers 2 through 5 require HYPE token activation.
     */
    function isWorkerActive(address user, uint8 workerIndex) public view returns (bool) {
        if (workerIndex == 1) return true; // Worker 1 is 100% FREE
        if (workerIndex > 5 || workerIndex < 1) return false;
        return workerEntitled[user][workerIndex];
    }

    /**
     * @notice Activates an additional mining worker (Workers 2 to 5) by paying HYPE tokens.
     */
    function activateWorker(uint8 workerIndex) external {
        require(workerIndex >= 2 && workerIndex <= 5, "Invalid worker index: must be 2 to 5");
        require(!workerEntitled[msg.sender][workerIndex], "Worker already active");

        uint256 cost = workerActivationCost[workerIndex];
        require(cost > 0, "Activation cost not configured");

        require(
            hypeToken.transferFrom(msg.sender, address(this), cost),
            "HYPE token transfer failed. Check balance and allowance."
        );

        workerEntitled[msg.sender][workerIndex] = true;
        emit WorkerActivated(msg.sender, workerIndex, cost);
    }

    // ==========================================
    // PROOF-OF-WORK MINTING
    // ==========================================

    /**
     * @notice Mints an NFT after successful WebGPU mining.
     * The contract cryptographically verifies the Proof-of-Work nonce against the
     * authoritative challenge and both the wallet's escalating target and active epoch target.
     * Max 5 NFTs per wallet limit is strictly enforced.
     * Mint fee is dynamically determined by the current active epoch ($5 ETH for tokens 1-10, $7 for 11-30, etc.).
     *
     * @param nonce The solution nonce found by user's WebGPU shader
     * @param challenge The challenge hash this proof was computed for
     */
    function mintWithMiningProof(uint256 nonce, bytes32 challenge) external payable returns (uint256) {
        // 0. Pause enforcement
        require(!miningPaused, "Mining paused");

        // 1. Race condition & supply cap enforcement
        require(totalMined < MAX_SUPPLY, "NFT ALREADY CLAIMED: 10,000 Sold Out");

        // 1.5 Strict Per-Wallet 5 NFT Quota Cap Enforcement
        require(walletMints[msg.sender] < MAX_MINTS_PER_WALLET, "Max 5 NFTs per wallet limit reached");

        // 2. Epoch-based mint fee check ($5 ETH for tokens 1-10, $7 ETH for 11-30, etc.)
        uint256 nextTokenId = totalMined + 1;
        Epoch memory activeEpoch = getEpoch(nextTokenId);
        require(msg.value >= activeEpoch.mintFeeWei, "Insufficient mint fee for current epoch");

        // 3. Challenge validity check
        require(challenge == currentChallenge, "Expired or invalid mining challenge");

        // 4. Cryptographic Proof-of-Work Verification against per-wallet escalating target and epoch target
        bytes32 proofHash = keccak256(abi.encodePacked(challenge, msg.sender, nonce));
        require(!usedProofs[proofHash], "Proof already used (replay protection)");

        uint256 walletTarget = getDifficultyTargetForWallet(msg.sender);
        uint256 effectiveTarget = walletTarget < activeEpoch.target ? walletTarget : activeEpoch.target;
        require(uint256(proofHash) < effectiveTarget, "Invalid proof: Hash does not meet difficulty target");

        // Mark proof as used immediately (Anti-Cheat / Anti-Replay)
        usedProofs[proofHash] = true;

        // Increment wallet's minted NFT count
        walletMints[msg.sender]++;

        // 5. Mint token
        totalMined++;
        uint256 tokenId = totalMined;
        _mint(msg.sender, tokenId);

        // Record on-chain mining proof
        proofHistory[tokenId] = MiningProof({
            miner: msg.sender,
            tokenId: tokenId,
            nonce: nonce,
            digest: proofHash,
            difficulty: effectiveTarget,
            timestamp: block.timestamp,
            epochId: activeEpoch.id
        });

        emit ProofVerifiedAndMinted(msg.sender, tokenId, nonce, proofHash, effectiveTarget, msg.value, activeEpoch.id);

        // Rotate Challenge Hash for the next mining round
        currentRound++;
        currentChallenge = keccak256(abi.encodePacked(proofHash, block.prevrandao, block.number, tokenId));
        emit ChallengeRotated(currentChallenge, currentRound);

        return tokenId;
    }

    // ==========================================
    // ERC-721 IMPLEMENTATION (TRANSFERABLE NFT)
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
        require(tokenOwner != address(0), "ERC721: Nonexistent token ID");
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
        require(_owners[tokenId] != address(0), "ERC721: Nonexistent token ID");
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
        require(_isApprovedOrOwner(msg.sender, tokenId), "ERC721: Caller not token owner or approved");
        require(ownerOf(tokenId) == from, "ERC721: Transfer from incorrect owner");
        require(to != address(0), "ERC721: Transfer to zero address");

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
    // METADATA & OPENSEA SECONDARY STANDARDS
    // ==========================================

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_owners[tokenId] != address(0), "Nonexistent token");
        return string(abi.encodePacked(baseURI, _toString(tokenId), ".json"));
    }

    function contractURI() external view returns (string memory) {
        return contractURIString;
    }

    function royaltyInfo(uint256, uint256 salePrice) external view returns (address receiver, uint256 royaltyAmount) {
        return (royaltyReceiver, (salePrice * royaltyBasisPoints) / 10000);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0x80ac58cd || // ERC-721
            interfaceId == 0x5b5e139f || // ERC-721 Metadata
            interfaceId == 0x2a55205a || // ERC-2981 Royalty
            interfaceId == 0x01ffc9a7;   // ERC-165
    }

    // ==========================================
    // ADMIN DASHBOARD & FEE WITHDRAWALS
    // ==========================================

    function setMintFee(uint256 _newFee) external onlyOwner {
        mintFee = _newFee;
        emit ProtocolParametersUpdated(mintFee, royaltyReceiver);
    }

    function setWorkerActivationCost(uint8 workerIndex, uint256 _cost) external onlyOwner {
        require(workerIndex >= 2 && workerIndex <= 5, "Worker index 2 to 5");
        workerActivationCost[workerIndex] = _cost;
    }

    function setBaseURI(string calldata _newBaseURI) external onlyOwner {
        baseURI = _newBaseURI;
    }

    function setContractURI(string calldata _newContractURI) external onlyOwner {
        contractURIString = _newContractURI;
    }

    function setRoyaltyInfo(address _receiver, uint96 _basisPoints) external onlyOwner {
        require(_basisPoints <= 1000, "Royalty cannot exceed 10%");
        royaltyReceiver = _receiver;
        royaltyBasisPoints = _basisPoints;
    }

    function setMiningPaused(bool _paused) external onlyOwner {
        miningPaused = _paused;
        emit MiningPausedStateChanged(_paused);
    }

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        royaltyReceiver = _feeRecipient;
        emit ProtocolParametersUpdated(mintFee, royaltyReceiver);
    }

    function claimNativeMintFees() public {
        require(msg.sender == owner || msg.sender == CREATOR_ADMIN_WALLET, "Admin only");
        uint256 balance = address(this).balance;
        require(balance > 0, "No native fees to claim");
        (bool success, ) = payable(CREATOR_ADMIN_WALLET).call{value: balance}("");
        require(success, "Native fee claim failed");
        emit NativeMintFeesClaimed(CREATOR_ADMIN_WALLET, balance);
    }

    function claimTokenActivationFees() public {
        require(msg.sender == owner || msg.sender == CREATOR_ADMIN_WALLET, "Admin only");
        uint256 bal = hypeToken.balanceOf(address(this));
        require(bal > 0, "No token fees to claim");
        require(hypeToken.transfer(CREATOR_ADMIN_WALLET, bal), "Token fee claim failed");
        emit TokenActivationFeesClaimed(CREATOR_ADMIN_WALLET, bal);
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
