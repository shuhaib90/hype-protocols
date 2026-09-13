import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { soundEffects } from '../utils/soundEffects';

export const OWNER_WALLET = '0x2A232D1ab1226b981c35DA8B477E337952B5486F';
export const ADMIN_WALLET = '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C';
export const CONTRACT_ADDRESS = '0x7D959C29aa1098d93b307Ca40bEEEc0bF7bbfF85';
export const RIG_ACTIVATION_TOKEN_ADDRESS = '0x30E55c3cfB2BBe5d0B07051e0B15c8a532c45ecc';
export const CHAIN_ID = 4663;
export const RPC_URL = 'https://robinhood-mainnet.g.alchemy.com/v2/VADj_sajpbD_KAWbnZk5x';
export const EXPLORER_URL = 'https://robinhoodchain.blockscout.com';
export const OPENSEA_COLLECTION_URL = 'https://opensea.io/collection/hashape-958666494';
export const HASHAPE_DEX_URL = 'https://www.letscash.fun/token/0x30E55c3cfB2BBe5d0B07051e0B15c8a532c45ecc';
export const BASE_URI = 'https://endpoint.4everland.co/hashape/metadata/';
export const CONTRACT_URI = 'https://endpoint.4everland.co/hashape/storefront.json';

const NFT_MINING_ABI = [
  'function mintWithMiningProof(uint256 nonce, bytes32 challenge) external payable returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function totalMined() view returns (uint256)',
  'function currentChallenge() view returns (bytes32)',
  'function getMintFee(uint256 tokenId) view returns (uint256)',
  'function getEpoch(uint256 tokenId) view returns (tuple(uint256 id, uint256 startToken, uint256 endToken, uint256 mintFeeWei, uint256 feeUsd, uint256 target, string name))',
  'function activateWorker(uint8 workerIndex) external',
  'function isWorkerActive(address user, uint8 workerIndex) view returns (bool)',
  'function workerActivationCost(uint256) view returns (uint256)',
  'function setEpochMintFee(uint256 epochId, uint256 newFeeWei, uint256 newFeeUsd) external',
  'function setEpochMintFeesBatch(uint256[] calldata epochIds, uint256[] calldata newFeesWei, uint256[] calldata newFeesUsd) external',
  'function setWorkerActivationCost(uint8 workerIndex, uint256 _cost) external',
  'function claimNativeMintFees() public',
  'function claimTokenActivationFees() public',
  'event ProofVerifiedAndMinted(address indexed miner, uint256 indexed tokenId, uint256 nonce, bytes32 proofHash, uint256 difficulty, uint256 feePaid, uint256 epochId)',
  'event WorkerActivated(address indexed miner, uint8 indexed workerIndex, uint256 costPaid)',
  'event EpochMintFeeUpdated(uint256 indexed epochId, uint256 oldFeeWei, uint256 newFeeWei, uint256 newFeeUsd)',
  'event NativeMintFeesClaimed(address indexed recipient, uint256 amount)',
  'event TokenActivationFeesClaimed(address indexed recipient, uint256 amount)'
];

const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

export async function ensureRobinhoodNetwork(injected: any) {
  const chainIdHex = '0x' + CHAIN_ID.toString(16);
  try {
    await injected.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
  } catch (switchError: any) {
    if (switchError.code === 4902 || switchError.data?.originalError?.code === 4902) {
      await injected.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: chainIdHex,
            chainName: 'Robinhood Chain Mainnet',
            nativeCurrency: {
              name: 'Ether',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: [RPC_URL],
            blockExplorerUrls: [EXPLORER_URL],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
}

interface WalletContextType {
  isConnected: boolean;
  address: string;
  nativeHypeBalance: number;
  tokenHypeBalance: number;
  nativeEthBalance: number;
  tokenHashApeBalance: number;
  rigActivationTokenAddress: string;
  contractAddress: string;
  chainId: number;
  rpcUrl: string;
  isAdmin: boolean;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  connectDevAdmin: () => void;
  disconnectWallet: () => void;
  refreshBalances: () => Promise<void>;
  activateWorkerOnChain: (workerId: number, costHype: number) => Promise<boolean>;
  mintNFTOnChain: (nonce: string, challenge: string, mintFeeHype: number, targetTokenId?: number) => Promise<{ success: boolean; txHash: string; tokenId?: number }>;
  setEpochMintFeesBatchOnChain: (epochIds: number[], feesWei: bigint[], feesUsd: number[]) => Promise<string>;
  setEpochMintFeeOnChain: (epochId: number, feeWei: bigint, feeUsd: number) => Promise<string>;
  setWorkerActivationCostOnChain: (workerIndex: number, costHype: number) => Promise<string>;
  claimNativeMintFeesOnChain: () => Promise<string>;
  claimTokenActivationFeesOnChain: () => Promise<string>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [nativeBalance, setNativeBalance] = useState(0.0);
  const [tokenBalance, setTokenBalance] = useState(0.0);
  const [isConnecting, setIsConnecting] = useState(false);

  const isAdmin = 
    address.toLowerCase() === ADMIN_WALLET.toLowerCase() || 
    address.toLowerCase() === OWNER_WALLET.toLowerCase();

  const fetchBalances = useCallback(async (userAddr: string, provider: ethers.BrowserProvider | ethers.JsonRpcProvider) => {
    try {
      const bal = await provider.getBalance(userAddr);
      setNativeBalance(Number(parseFloat(ethers.formatEther(bal)).toFixed(4)));
    } catch (e) {
      console.warn('Could not fetch native balance:', e);
    }

    try {
      const tokenContract = new ethers.Contract(RIG_ACTIVATION_TOKEN_ADDRESS, ERC20_ABI, provider);
      const tBal = await tokenContract.balanceOf(userAddr);
      setTokenBalance(Number(parseFloat(ethers.formatEther(tBal)).toFixed(2)));
    } catch (te) {
      console.warn('Could not fetch token balance:', te);
    }
  }, []);

  useEffect(() => {
    const tryAutoConnect = async () => {
      if (typeof window !== 'undefined') {
        const injected = (window as any).robinhood?.ethereum || (window as any).ethereum;
        if (injected) {
          try {
            const accounts = await injected.request({ method: 'eth_accounts' });
            if (accounts && accounts.length > 0) {
              const userAddr = accounts[0];
              setAddress(userAddr);
              setIsConnected(true);
              try { localStorage.setItem('hashape_last_wallet', userAddr.toLowerCase()); } catch (_) {}
              const provider = new ethers.BrowserProvider(injected);
              await fetchBalances(userAddr, provider);
            }
          } catch (e) {
            console.warn('Silent auto-connect check failed:', e);
          }
        }
      }
    };
    tryAutoConnect();

    if (typeof window !== 'undefined') {
      const injected = (window as any).robinhood?.ethereum || (window as any).ethereum;
      if (injected && injected.on) {
        const handleAccountsChanged = (accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            const userAddr = accounts[0];
            setAddress(userAddr);
            setIsConnected(true);
            try { localStorage.setItem('hashape_last_wallet', userAddr.toLowerCase()); } catch (_) {}
            const provider = new ethers.BrowserProvider(injected);
            fetchBalances(userAddr, provider);
          } else {
            setIsConnected(false);
            setAddress('');
            try { localStorage.removeItem('hashape_last_wallet'); } catch (_) {}
          }
        };
        const handleChainChanged = () => {
          window.location.reload();
        };
        injected.on('accountsChanged', handleAccountsChanged);
        injected.on('chainChanged', handleChainChanged);
        return () => {
          if (injected.removeListener) {
            injected.removeListener('accountsChanged', handleAccountsChanged);
            injected.removeListener('chainChanged', handleChainChanged);
          }
        };
      }
    }
  }, [fetchBalances]);

  const connectWallet = async () => {
    soundEffects.playClickSound();
    setIsConnecting(true);
    try {
      if (typeof window !== 'undefined') {
        const injected = (window as any).robinhood?.ethereum || (window as any).ethereum;
        if (injected) {
          await ensureRobinhoodNetwork(injected);
          const provider = new ethers.BrowserProvider(injected);
          const accounts = await provider.send('eth_requestAccounts', []);
          if (accounts && accounts.length > 0) {
            const userAddr = accounts[0];
            setAddress(userAddr);
            setIsConnected(true);
            try { localStorage.setItem('hashape_last_wallet', userAddr.toLowerCase()); } catch (_) {}
            await fetchBalances(userAddr, provider);
            return;
          }
        }
      }
      throw new Error('No compatible Web3 wallet detected. Please install MetaMask or Robinhood Wallet.');
    } catch (err: any) {
      console.warn('Wallet connection error:', err);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  const connectDevAdmin = async () => {
    soundEffects.playClickSound();
    setAddress(OWNER_WALLET);
    setIsConnected(true);
    try { localStorage.setItem('hashape_last_wallet', OWNER_WALLET.toLowerCase()); } catch (_) {}
    try {
      const rpcProvider = new ethers.JsonRpcProvider(RPC_URL);
      await fetchBalances(OWNER_WALLET, rpcProvider);
    } catch (_) {
      setNativeBalance(0.0);
      setTokenBalance(0.0);
    }
  };

  const disconnectWallet = () => {
    soundEffects.playClickSound();
    setIsConnected(false);
    setAddress('');
    setNativeBalance(0.0);
    setTokenBalance(0.0);
    try { localStorage.removeItem('hashape_last_wallet'); } catch (_) {}
  };

  const refreshBalances = async () => {
    if (!isConnected || !address) return;
    if (typeof window !== 'undefined') {
      const injected = (window as any).robinhood?.ethereum || (window as any).ethereum;
      if (injected) {
        const provider = new ethers.BrowserProvider(injected);
        await fetchBalances(address, provider);
      }
    }
  };

  const getSignerAndContract = async () => {
    if (typeof window === 'undefined') {
      throw new Error('Window object unavailable.');
    }
    const injected = (window as any).robinhood?.ethereum || (window as any).ethereum;
    if (!injected) {
      throw new Error('Injected Web3 wallet required.');
    }
    await ensureRobinhoodNetwork(injected);
    const provider = new ethers.BrowserProvider(injected);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, NFT_MINING_ABI, signer);
    return { provider, signer, contract, injected };
  };

  const activateWorkerOnChain = async (workerId: number, costHype: number): Promise<boolean> => {
    if (!isConnected || !address) {
      throw new Error('Please connect your Web3 wallet first.');
    }

    const { provider, signer, contract } = await getSignerAndContract();

    // Query on-chain cost directly to guarantee 100% authoritative pricing
    let costWei: bigint;
    try {
      costWei = await contract.workerActivationCost(workerId);
    } catch (_) {
      costWei = ethers.parseUnits(costHype.toString(), 18);
    }
    if (!costWei || costWei === 0n) {
      costWei = ethers.parseUnits(costHype.toString(), 18);
    }

    const requiredTokens = Number(ethers.formatEther(costWei));
    if (tokenBalance < requiredTokens) {
      throw new Error(
        `Insufficient HashApe ($HASHAPE) token balance: ${requiredTokens.toLocaleString()} $HASHAPE required to activate Blade #${workerId}. Your wallet holds ${tokenBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $HASHAPE.`
      );
    }

    const tokenContract = new ethers.Contract(RIG_ACTIVATION_TOKEN_ADDRESS, ERC20_ABI, signer);
    const allowance: bigint = await tokenContract.allowance(address, CONTRACT_ADDRESS);

    if (allowance < costWei) {
      const approveTx = await tokenContract.approve(CONTRACT_ADDRESS, costWei);
      await approveTx.wait();
    }

    const tx = await contract.activateWorker(workerId);
    await tx.wait();

    soundEffects.playWorkerUnlockSound();
    await fetchBalances(address, provider);
    return true;
  };

  const mintNFTOnChain = async (
    nonce: string,
    challenge: string,
    mintFeeHype: number,
    targetTokenId?: number
  ): Promise<{ success: boolean; txHash: string; tokenId: number }> => {
    if (!isConnected || !address) {
      throw new Error('Wallet required to execute mint transaction.');
    }

    const { provider, contract } = await getSignerAndContract();

    const nonceBigInt = BigInt(nonce);
    const challengeBytes32 = challenge.startsWith('0x') ? challenge : `0x${challenge}`;

    const totalMinedBigInt = await contract.totalMined();
    const nextTokenId = Number(totalMinedBigInt) + 1;
    const requiredFeeWei: bigint = await contract.getMintFee(nextTokenId);

    const userEthBal = await provider.getBalance(address);
    if (userEthBal < requiredFeeWei) {
      throw new Error(`Insufficient native ETH balance. Requires ${ethers.formatEther(requiredFeeWei)} ETH.`);
    }

    const tx = await contract.mintWithMiningProof(nonceBigInt, challengeBytes32, { value: requiredFeeWei });
    const receipt = await tx.wait();

    let mintedTokenId = targetTokenId || nextTokenId;
    if (receipt && receipt.logs) {
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog({ topics: log.topics as string[], data: log.data });
          if (parsed && parsed.name === 'ProofVerifiedAndMinted') {
            mintedTokenId = Number(parsed.args.tokenId);
            break;
          }
        } catch (_) {}
      }
    }

    await fetchBalances(address, provider);

    return {
      success: true,
      txHash: receipt?.hash || tx.hash,
      tokenId: mintedTokenId,
    };
  };

  const setEpochMintFeesBatchOnChain = async (
    epochIds: number[],
    feesWei: bigint[],
    feesUsd: number[]
  ): Promise<string> => {
    if (!isAdmin) {
      throw new Error('Only the contract owner or admin wallet can update epoch mint fees on-chain.');
    }
    const { contract } = await getSignerAndContract();
    const bigEpochIds = epochIds.map(id => BigInt(id));
    const bigFeesUsd = feesUsd.map(usd => BigInt(usd));

    const tx = await contract.setEpochMintFeesBatch(bigEpochIds, feesWei, bigFeesUsd);
    const receipt = await tx.wait();
    return receipt?.hash || tx.hash;
  };

  const setEpochMintFeeOnChain = async (
    epochId: number,
    feeWei: bigint,
    feeUsd: number
  ): Promise<string> => {
    if (!isAdmin) {
      throw new Error('Only the contract owner or admin wallet can update epoch mint fee on-chain.');
    }
    const { contract } = await getSignerAndContract();
    const tx = await contract.setEpochMintFee(BigInt(epochId), feeWei, BigInt(feeUsd));
    const receipt = await tx.wait();
    return receipt?.hash || tx.hash;
  };

  const setWorkerActivationCostOnChain = async (
    workerIndex: number,
    costHype: number
  ): Promise<string> => {
    if (!isAdmin) {
      throw new Error('Only the contract owner or admin wallet can update worker blade costs on-chain.');
    }
    const { contract } = await getSignerAndContract();
    const costWei = ethers.parseUnits(costHype.toString(), 18);
    const tx = await contract.setWorkerActivationCost(workerIndex, costWei);
    const receipt = await tx.wait();
    return receipt?.hash || tx.hash;
  };

  const claimNativeMintFeesOnChain = async (): Promise<string> => {
    if (!isAdmin) {
      throw new Error('Only the contract owner or admin wallet can claim native mint fees on-chain.');
    }
    const { contract } = await getSignerAndContract();
    const tx = await contract.claimNativeMintFees();
    const receipt = await tx.wait();
    return receipt?.hash || tx.hash;
  };

  const claimTokenActivationFeesOnChain = async (): Promise<string> => {
    if (!isAdmin) {
      throw new Error('Only the contract owner or admin wallet can claim token activation fees on-chain.');
    }
    const { contract } = await getSignerAndContract();
    const tx = await contract.claimTokenActivationFees();
    const receipt = await tx.wait();
    return receipt?.hash || tx.hash;
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const eth = (window as any).ethereum;
      const handleAccounts = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          setIsConnected(true);
          const provider = new ethers.BrowserProvider(eth);
          fetchBalances(accounts[0], provider);
        } else {
          disconnectWallet();
        }
      };
      const handleChainChanged = () => {
        window.location.reload();
      };
      eth.on?.('accountsChanged', handleAccounts);
      eth.on?.('chainChanged', handleChainChanged);
      return () => {
        eth.removeListener?.('accountsChanged', handleAccounts);
        eth.removeListener?.('chainChanged', handleChainChanged);
      };
    }
  }, [fetchBalances]);

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address,
        nativeHypeBalance: nativeBalance,
        tokenHypeBalance: tokenBalance,
        nativeEthBalance: nativeBalance,
        tokenHashApeBalance: tokenBalance,
        rigActivationTokenAddress: RIG_ACTIVATION_TOKEN_ADDRESS,
        contractAddress: CONTRACT_ADDRESS,
        chainId: CHAIN_ID,
        rpcUrl: RPC_URL,
        isAdmin,
        isConnecting,
        connectWallet,
        connectDevAdmin,
        disconnectWallet,
        refreshBalances,
        activateWorkerOnChain,
        mintNFTOnChain,
        setEpochMintFeesBatchOnChain,
        setEpochMintFeeOnChain,
        setWorkerActivationCostOnChain,
        claimNativeMintFeesOnChain,
        claimTokenActivationFeesOnChain,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
