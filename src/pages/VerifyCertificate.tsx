import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Search, CheckCircle, XCircle, ExternalLink, Copy } from 'lucide-react';
import { contractService } from '../utils/contract';
import { ipfsService } from '../api/ipfs';

interface VerificationResult {
  exists: boolean;
  isValid: boolean;
  owner: string;
  issuer: string;
  issuedAt: Date;
  metadata?: any;
}

const VerifyCertificate: React.FC = () => {
  const [tokenId, setTokenId] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [searchType, setSearchType] = useState<'tokenId' | 'wallet'>('tokenId');

  const handleVerify = async () => {
    if (searchType === 'tokenId' && !tokenId.trim()) {
      setError('Please enter a token ID');
      return;
    }
    if (searchType === 'wallet' && !walletAddress.trim()) {
      setError('Please enter a wallet address');
      return;
    }

    setIsVerifying(true);
    setError('');
    setVerificationResult(null);

    try {
      if (searchType === 'tokenId') {
        const tokenIdNum = parseInt(tokenId);
        if (isNaN(tokenIdNum)) {
          throw new Error('Invalid token ID');
        }

        const result = await contractService.verifyCertificate(tokenIdNum);
        
        if (result.exists) {
          // Fetch metadata from IPFS
          const metadataURI = await contractService.tokenURI(tokenIdNum);
          const cid = metadataURI.split('/').pop();
          if (cid) {
            try {
              const metadata = await ipfsService.fetchMetadata(cid);
              result.metadata = metadata;
            } catch (metadataError) {
              console.warn('Could not fetch metadata:', metadataError);
            }
          }
        }

        setVerificationResult(result);
      } else {
        // Verify by wallet address - show all certificates
        const certificates = await contractService.getUserCertificates(walletAddress);
        if (certificates.length > 0) {
          // For demo, show the first certificate
          const firstCert = certificates[0];
          const result = await contractService.verifyCertificate(firstCert.tokenId);
          
          // Fetch metadata
          const cid = firstCert.metadataURI.split('/').pop();
          if (cid) {
            try {
              const metadata = await ipfsService.fetchMetadata(cid);
              result.metadata = metadata;
            } catch (metadataError) {
              console.warn('Could not fetch metadata:', metadataError);
            }
          }
          
          setVerificationResult(result);
        } else {
          setVerificationResult({
            exists: false,
            isValid: false,
            owner: '',
            issuer: '',
            issuedAt: new Date()
          });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto"
    >
      <div className="flex items-center mb-8">
        <Shield className="w-8 h-8 text-violet-400 mr-3" />
        <h1 className="text-3xl font-bold text-white">Verify Certificate</h1>
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8">
        {/* Search Type Toggle */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setSearchType('tokenId')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              searchType === 'tokenId'
                ? 'bg-violet-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Search by Token ID
          </button>
          <button
            onClick={() => setSearchType('wallet')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              searchType === 'wallet'
                ? 'bg-violet-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Search by Wallet
          </button>
        </div>

        {/* Search Input */}
        <div className="mb-6">
          {searchType === 'tokenId' ? (
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Certificate Token ID
              </label>
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                  placeholder="Enter token ID (e.g., 1, 2, 3...)"
                  className="flex-1 bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-violet-500"
                />
                <button
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold px-8 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 flex items-center"
                >
                  {isVerifying ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Search className="w-5 h-5 mr-2" />
                  )}
                  Verify
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Student Wallet Address
              </label>
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="Enter wallet address (0x...)"
                  className="flex-1 bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-violet-500"
                />
                <button
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold px-8 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 flex items-center"
                >
                  {isVerifying ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Search className="w-5 h-5 mr-2" />
                  )}
                  Verify
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-center">
            <XCircle className="w-5 h-5 text-red-400 mr-3" />
            <span className="text-red-300">{error}</span>
          </div>
        )}

        {/* Verification Result */}
        {verificationResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
          >
            <div className={`border rounded-xl p-6 ${
              verificationResult.exists && verificationResult.isValid
                ? 'border-green-500/50 bg-green-500/10'
                : 'border-red-500/50 bg-red-500/10'
            }`}>
              <div className="flex items-center mb-4">
                {verificationResult.exists && verificationResult.isValid ? (
                  <>
                    <CheckCircle className="w-8 h-8 text-green-400 mr-3" />
                    <h3 className="text-xl font-semibold text-green-400">Certificate Verified</h3>
                  </>
                ) : (
                  <>
                    <XCircle className="w-8 h-8 text-red-400 mr-3" />
                    <h3 className="text-xl font-semibold text-red-400">
                      {verificationResult.exists ? 'Certificate Invalid' : 'Certificate Not Found'}
                    </h3>
                  </>
                )}
              </div>

              {verificationResult.exists && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <span className="text-gray-400 text-sm">Owner</span>
                      <div className="flex items-center space-x-2">
                        <p className="text-white font-mono">{formatAddress(verificationResult.owner)}</p>
                        <button
                          onClick={() => copyToClipboard(verificationResult.owner)}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-400 text-sm">Issuer</span>
                      <div className="flex items-center space-x-2">
                        <p className="text-white font-mono">{formatAddress(verificationResult.issuer)}</p>
                        <button
                          onClick={() => copyToClipboard(verificationResult.issuer)}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-400 text-sm">Issued Date</span>
                      <p className="text-white">{verificationResult.issuedAt.toLocaleDateString()}</p>
                    </div>

                    <div>
                      <span className="text-gray-400 text-sm">Status</span>
                      <p className={`font-semibold ${
                        verificationResult.isValid ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {verificationResult.isValid ? 'Valid' : 'Revoked'}
                      </p>
                    </div>
                  </div>

                  {verificationResult.metadata && (
                    <div className="space-y-4">
                      <div>
                        <span className="text-gray-400 text-sm">Certificate Details</span>
                        <div className="bg-gray-700/30 rounded-lg p-4 mt-2">
                          <h4 className="text-white font-semibold mb-2">
                            {verificationResult.metadata.certificate_data.course}
                          </h4>
                          <p className="text-gray-300 text-sm mb-1">
                            Student: {verificationResult.metadata.certificate_data.student_name}
                          </p>
                          <p className="text-gray-300 text-sm mb-1">
                            Institution: {verificationResult.metadata.certificate_data.institution}
                          </p>
                          <p className="text-gray-300 text-sm mb-1">
                            Grade: {verificationResult.metadata.certificate_data.grade}
                          </p>
                          <p className="text-gray-300 text-sm">
                            Completion: {verificationResult.metadata.certificate_data.completion_date}
                          </p>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => window.open(`https://etherscan.io/address/${verificationResult.owner}`, '_blank')}
                          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>View on Etherscan</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Info Section */}
        <div className="mt-8 bg-gradient-to-r from-violet-600/20 to-purple-600/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2">How Verification Works</h3>
          <ul className="text-gray-300 space-y-2 text-sm">
            <li>• Enter a certificate token ID or student wallet address</li>
            <li>• The system queries the blockchain for certificate data</li>
            <li>• Certificate metadata is fetched from IPFS</li>
            <li>• Authenticity and validity are verified on-chain</li>
            <li>• Results show ownership, issuer, and certificate details</li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
};

export default VerifyCertificate;