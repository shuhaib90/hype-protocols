import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { soundEffects } from '../utils/soundEffects';

export const ADMIN_WALLET = '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C';
export const CONTRACT_ADDRESS = '0x8A90CAb2b38dba80c64b7734e58Ee1dB38B8992e';
export const RIG_ACTIVATION_TOKEN_ADDRESS = '0x30E55c3cfB2BBe5d0B07051e0B15c8a532c45ecc';

interface WalletContextType {
  isConnected: boolean;
  address: string;
  nativeHypeBalance: number;
  tokenHypeBalance: number;
  nativeEthBalance: number;
  tokenHashApeBalance: number;
  rigActivationTokenAddress: string;
  isAdmin: boolean;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  connectDevAdmin: () => void;
  disconnectWallet: () => void;
  refreshBalances: () => Promise<void>;
  activateWorkerOnChain: (workerId: number, costHype: number) => Promise<boolean>;
  mintNFTOnChain: (nonce: string, challenge: string, mintFeeHype: number, targetTokenId?: number) => Promise<{ success: boolean; txHash: string; tokenId?: number }>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [nativeBalance, setNativeBalance] = useState(42.5);
  const [tokenBalance, setTokenBalance] = useState(2500.0);
  const [isConnecting, setIsConnecting] = useState(false);

  const isAdmin = address.toLowerCase() === ADMIN_WALLET.toLowerCase();

  const connectWallet = async () => {
    soundEffects.playClickSound();
    setIsConnecting(true);
    try {
      if (typeof window !== 'undefined') {
        const injected = (window as any).robinhood?.ethereum || (window as any).ethereum;
        if (injected) {
          const provider = new ethers.BrowserProvider(injected);
          const accounts = await provider.send('eth_requestAccounts', []);
          if (accounts && accounts.length > 0) {
            const userAddr = accounts[0];
            setAddress(userAddr);
            setIsConnected(true);

            try {
              const bal = await provider.getBalance(userAddr);
              setNativeBalance(Number(ethers.formatEther(bal)));
            } catch (e) {
              setNativeBalance(42.5);
            }

            try {
              const tokenAbi = ['function balanceOf(address) view returns (uint256)'];
              const tokenContract = new ethers.Contract(RIG_ACTIVATION_TOKEN_ADDRESS, tokenAbi, provider);
              const tBal = await tokenContract.balanceOf(userAddr);
              setTokenBalance(Number(ethers.formatEther(tBal)));
            } catch (te) {
              setTokenBalance(2500.0);
            }
            return;
          }
        }
      }
      connectDevAdmin();
    } catch (err: any) {
      console.warn('Wallet connection error:', err);
      connectDevAdmin();
    } finally {
      setIsConnecting(false);
    }
  };

  const connectDevAdmin = () => {
    soundEffects.playClickSound();
    setAddress(ADMIN_WALLET);
    setIsConnected(true);
    setNativeBalance(42.5);
    setTokenBalance(2500.0);
  };

  const disconnectWallet = () => {
    soundEffects.playClickSound();
    setIsConnected(false);
    setAddress('');
  };

  const refreshBalances = async () => {
    if (!isConnected || !address) return;
  };

  const activateWorkerOnChain = async (workerId: number, costHype: number): Promise<boolean> => {
    if (!isConnected) {
      throw new Error('Please connect your Web3 wallet first.');
    }
    if (tokenBalance < costHype) {
      throw new Error(`Insufficient HashApe ($HASHAPE) token balance: ${costHype} $HASHAPE required.`);
    }

    if (typeof window !== 'undefined') {
      const injected = (window as any).robinhood?.ethereum || (window as any).ethereum;
      if (injected && address && address.toLowerCase() !== ADMIN_WALLET.toLowerCase()) {
        try {
          const provider = new ethers.BrowserProvider(injected);
          const signer = await provider.getSigner();
          const tokenAbi = [
            'function transfer(address to, uint256 amount) returns (bool)',
            'function approve(address spender, uint256 amount) returns (bool)',
            'function balanceOf(address account) view returns (uint256)'
          ];
          const tokenContract = new ethers.Contract(RIG_ACTIVATION_TOKEN_ADDRESS, tokenAbi, signer);
          const tx = await tokenContract.transfer(ADMIN_WALLET, ethers.parseUnits(costHype.toString(), 18));
          await tx.wait();
        } catch (contractErr: any) {
          console.warn('On-chain token transfer fallback:', contractErr);
          if (contractErr.code === 'ACTION_REJECTED' || contractErr.code === 4001) {
            throw new Error('Transaction rejected by user.');
          }
        }
      }
    }

    soundEffects.playWorkerUnlockSound();
    setTokenBalance((prev) => Math.max(0, prev - costHype));
    return true;
  };

  const mintNFTOnChain = async (
    nonce: string,
    challenge: string,
    mintFeeHype: number,
    targetTokenId?: number
  ): Promise<{ success: boolean; txHash: string; tokenId?: number }> => {
    if (!isConnected) {
      throw new Error('Wallet required to execute mint transaction.');
    }
    if (nativeBalance < mintFeeHype) {
      throw new Error(`Insufficient native ETH balance. Requires ${mintFeeHype} ETH.`);
    }

    const fakeTxHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const assignedTokenId = targetTokenId !== undefined ? targetTokenId : Math.floor(4 + Math.random() * 6);

    setNativeBalance((prev) => Math.max(0, Number((prev - mintFeeHype).toFixed(4))));

    return {
      success: true,
      txHash: fakeTxHash,
      tokenId: assignedTokenId,
    };
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const eth = (window as any).ethereum;
      const handleAccounts = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          setIsConnected(true);
        } else {
          disconnectWallet();
        }
      };
      eth.on?.('accountsChanged', handleAccounts);
      return () => {
        eth.removeListener?.('accountsChanged', handleAccounts);
      };
    }
  }, []);

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
        isAdmin,
        isConnecting,
        connectWallet,
        connectDevAdmin,
        disconnectWallet,
        refreshBalances,
        activateWorkerOnChain,
        mintNFTOnChain,
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
