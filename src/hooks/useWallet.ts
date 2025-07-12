import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface WalletState {
  isConnected: boolean;
  account: string | null;
  balance: string | null;
  chainId: string | null;
  networkName: string | null;
  isLoading: boolean;
  error: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
}

interface WalletHook extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: (chainId: string) => Promise<void>;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const useWallet = (): WalletHook => {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    account: null,
    balance: null,
    chainId: null,
    networkName: null,
    isLoading: false,
    error: null,
    provider: null,
    signer: null,
  });

  const getNetworkName = (chainId: string): string => {
    const networks: { [key: string]: string } = {
      '0x1': 'Ethereum Mainnet',
      '0x89': 'Polygon Mainnet',
      '0x13881': 'Polygon Mumbai',
      '0xa86a': 'Avalanche Mainnet',
      '0x38': 'BSC Mainnet',
      '0x61': 'BSC Testnet',
    };
    return networks[chainId] || `Unknown Network (${chainId})`;
  };

  const getBalance = async (account: string, provider: ethers.BrowserProvider): Promise<string> => {
    try {
      const balance = await provider.getBalance(account);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting balance:', error);
      return '0.0000';
    }
  };

  const connect = async (): Promise<void> => {
    if (!window.ethereum) {
      setState(prev => ({ ...prev, error: 'MetaMask is not installed!' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      
      const signer = await provider.getSigner();
      const account = await signer.getAddress();
      const network = await provider.getNetwork();
      const chainId = `0x${network.chainId.toString(16)}`;
      const balance = await getBalance(account, provider);

      setState(prev => ({
        ...prev,
        isConnected: true,
        account,
        balance,
        chainId,
        networkName: getNetworkName(chainId),
        provider,
        signer,
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to connect to wallet',
        isLoading: false,
      }));
    }
  };

  const disconnect = (): void => {
    setState({
      isConnected: false,
      account: null,
      balance: null,
      chainId: null,
      networkName: null,
      isLoading: false,
      error: null,
      provider: null,
      signer: null,
    });
  };

  const switchNetwork = async (targetChainId: string): Promise<void> => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainId }],
      });
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
    }
  };

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setState(prev => ({ ...prev, account: accounts[0] }));
      }
    };

    const handleChainChanged = (chainId: string) => {
      setState(prev => ({
        ...prev,
        chainId,
        networkName: getNetworkName(chainId),
      }));
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    switchNetwork,
  };
};