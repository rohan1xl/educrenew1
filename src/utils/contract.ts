import { ethers } from 'ethers';
import EduCredABI from '../abi/EduCredABI.json';

// Mock contract address - in production, this would be from environment variables
const CONTRACT_ADDRESS = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1';

export interface Certificate {
  student: string;
  issuer: string;
  metadataURI: string;
  issuedAt: bigint;
  isValid: boolean;
}

export interface CertificateNFT {
  tokenId: number;
  owner: string;
  metadataURI: string;
  certificate: Certificate;
}

class ContractService {
  private contract: ethers.Contract | null = null;
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;

  // Mock data for demonstration
  private mockCertificates: Map<number, CertificateNFT> = new Map([
    [1, {
      tokenId: 1,
      owner: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1',
      metadataURI: 'https://ipfs.io/ipfs/QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o',
      certificate: {
        student: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1',
        issuer: '0x1234567890123456789012345678901234567890',
        metadataURI: 'https://ipfs.io/ipfs/QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o',
        issuedAt: BigInt(Date.now()),
        isValid: true
      }
    }],
    [2, {
      tokenId: 2,
      owner: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1',
      metadataURI: 'https://ipfs.io/ipfs/QmNLei78zWmzUdbeRB3CiUfAizWUrbeeZh5K1rhAQKCh51',
      certificate: {
        student: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1',
        issuer: '0x1234567890123456789012345678901234567890',
        metadataURI: 'https://ipfs.io/ipfs/QmNLei78zWmzUdbeRB3CiUfAizWUrbeeZh5K1rhAQKCh51',
        issuedAt: BigInt(Date.now() - 86400000),
        isValid: true
      }
    }]
  ]);

  private nextTokenId = 3;

  initialize(provider: ethers.BrowserProvider, signer: ethers.JsonRpcSigner) {
    this.provider = provider;
    this.signer = signer;
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, EduCredABI, signer);
  }

  async mintCertificate(studentAddress: string, metadataURI: string): Promise<number> {
    if (!this.contract || !this.signer) {
      throw new Error('Contract not initialized');
    }

    // Simulate transaction delay
    await new Promise(resolve => setTimeout(resolve, 3000));

    const tokenId = this.nextTokenId++;
    const signerAddress = await this.signer.getAddress();

    // Add to mock data
    this.mockCertificates.set(tokenId, {
      tokenId,
      owner: studentAddress,
      metadataURI,
      certificate: {
        student: studentAddress,
        issuer: signerAddress,
        metadataURI,
        issuedAt: BigInt(Date.now()),
        isValid: true
      }
    });

    console.log(`Certificate minted: Token ID ${tokenId} for ${studentAddress}`);
    return tokenId;
  }

  async balanceOf(address: string): Promise<number> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    let count = 0;
    for (const cert of this.mockCertificates.values()) {
      if (cert.owner.toLowerCase() === address.toLowerCase()) {
        count++;
      }
    }
    return count;
  }

  async tokenOfOwnerByIndex(owner: string, index: number): Promise<number> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const ownedTokens: number[] = [];
    for (const cert of this.mockCertificates.values()) {
      if (cert.owner.toLowerCase() === owner.toLowerCase()) {
        ownedTokens.push(cert.tokenId);
      }
    }

    if (index >= ownedTokens.length) {
      throw new Error('Index out of bounds');
    }

    return ownedTokens[index];
  }

  async tokenURI(tokenId: number): Promise<string> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const cert = this.mockCertificates.get(tokenId);
    if (!cert) {
      throw new Error('Token does not exist');
    }

    return cert.metadataURI;
  }

  async getCertificateData(tokenId: number): Promise<Certificate> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 400));

    const cert = this.mockCertificates.get(tokenId);
    if (!cert) {
      throw new Error('Certificate does not exist');
    }

    return cert.certificate;
  }

  async ownerOf(tokenId: number): Promise<string> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const cert = this.mockCertificates.get(tokenId);
    if (!cert) {
      throw new Error('Token does not exist');
    }

    return cert.owner;
  }

  async totalSupply(): Promise<number> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.mockCertificates.size;
  }

  async revokeCertificate(tokenId: number): Promise<void> {
    if (!this.contract || !this.signer) {
      throw new Error('Contract not initialized');
    }

    // Simulate transaction delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const cert = this.mockCertificates.get(tokenId);
    if (cert) {
      cert.certificate.isValid = false;
      this.mockCertificates.set(tokenId, cert);
    }

    console.log(`Certificate revoked: Token ID ${tokenId}`);
  }

  async getUserCertificates(userAddress: string): Promise<CertificateNFT[]> {
    const balance = await this.balanceOf(userAddress);
    const certificates: CertificateNFT[] = [];

    for (let i = 0; i < balance; i++) {
      try {
        const tokenId = await this.tokenOfOwnerByIndex(userAddress, i);
        const cert = this.mockCertificates.get(tokenId);
        if (cert) {
          certificates.push(cert);
        }
      } catch (error) {
        console.error(`Error fetching certificate at index ${i}:`, error);
      }
    }

    return certificates;
  }

  getContractAddress(): string {
    return CONTRACT_ADDRESS;
  }

  // Utility function to check if certificate exists
  async certificateExists(tokenId: number): Promise<boolean> {
    try {
      await this.ownerOf(tokenId);
      return true;
    } catch {
      return false;
    }
  }

  // Utility function to verify certificate authenticity
  async verifyCertificate(tokenId: number): Promise<{
    exists: boolean;
    isValid: boolean;
    owner: string;
    issuer: string;
    issuedAt: Date;
  }> {
    try {
      const exists = await this.certificateExists(tokenId);
      if (!exists) {
        return {
          exists: false,
          isValid: false,
          owner: '',
          issuer: '',
          issuedAt: new Date()
        };
      }

      const certificate = await this.getCertificateData(tokenId);
      const owner = await this.ownerOf(tokenId);

      return {
        exists: true,
        isValid: certificate.isValid,
        owner,
        issuer: certificate.issuer,
        issuedAt: new Date(Number(certificate.issuedAt))
      };
    } catch (error) {
      console.error('Error verifying certificate:', error);
      return {
        exists: false,
        isValid: false,
        owner: '',
        issuer: '',
        issuedAt: new Date()
      };
    }
  }
}

export const contractService = new ContractService();