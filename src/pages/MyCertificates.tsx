import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, Download, Eye, Share, ExternalLink, Wallet } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { contractService, CertificateNFT } from '../utils/contract';
import { ipfsService, IPFSMetadata } from '../api/ipfs';

interface CertificateWithMetadata extends CertificateNFT {
  metadata?: IPFSMetadata;
}

const MyCertificates: React.FC = () => {
  const { isConnected, account, connect, provider, signer } = useWallet();
  const [certificates, setCertificates] = useState<CertificateWithMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isConnected && account && provider && signer) {
      contractService.initialize(provider, signer);
      fetchCertificates();
    }
  }, [isConnected, account, provider, signer]);

  const fetchCertificates = async () => {
    if (!account) return;

    setLoading(true);
    setError('');

    try {
      const userCertificates = await contractService.getUserCertificates(account);
      
      // Fetch metadata for each certificate
      const certificatesWithMetadata = await Promise.all(
        userCertificates.map(async (cert) => {
          try {
            const cid = cert.metadataURI.split('/').pop();
            if (cid) {
              const metadata = await ipfsService.fetchMetadata(cid);
              return { ...cert, metadata };
            }
          } catch (metadataError) {
            console.warn(`Could not fetch metadata for token ${cert.tokenId}:`, metadataError);
          }
          return cert;
        })
      );

      setCertificates(certificatesWithMetadata);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch certificates');
    } finally {
      setLoading(false);
    }
  };

  const handleViewOnIPFS = (metadataURI: string) => {
    window.open(metadataURI, '_blank');
  };

  const handleDownload = async (cert: CertificateWithMetadata) => {
    try {
      // Create a downloadable certificate document
      const certificateData = cert.metadata?.certificate_data;
      if (!certificateData) return;

      const content = `
DIGITAL CERTIFICATE

Student: ${certificateData.student_name}
Course: ${certificateData.course}
Institution: ${certificateData.institution}
Completion Date: ${certificateData.completion_date}
Grade: ${certificateData.grade}

Token ID: ${cert.tokenId}
Blockchain Address: ${cert.owner}
Certificate Hash: ${certificateData.certificate_hash}
IPFS URI: ${cert.metadataURI}

This certificate is verified on the blockchain and stored on IPFS.
Verification can be done at: ${window.location.origin}/dashboard/verify-certificate
      `;

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${cert.tokenId}-${certificateData.student_name.replace(/\s+/g, '_')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading certificate:', error);
    }
  };

  const handleShare = (cert: CertificateWithMetadata) => {
    const shareUrl = `${window.location.origin}/dashboard/verify-certificate?tokenId=${cert.tokenId}`;
    
    if (navigator.share) {
      navigator.share({
        title: `Certificate - ${cert.metadata?.certificate_data.course || 'Course'}`,
        text: `Check out my verified certificate on the blockchain!`,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Certificate verification link copied to clipboard!');
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <div className="text-center py-12">
          <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-4">Connect Your Wallet</h3>
          <p className="text-gray-500 mb-6">Please connect your wallet to view your certificates</p>
          <button
            onClick={connect}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold px-8 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            Connect Wallet
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-6xl mx-auto"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Award className="w-8 h-8 text-violet-400 mr-3" />
          <h1 className="text-3xl font-bold text-white">My Certificates</h1>
        </div>
        <button
          onClick={fetchCertificates}
          disabled={loading}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
        >
          <span>Refresh</span>
        </button>
      </div>

      {/* Wallet Info */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Connected Wallet</h3>
            <p className="text-gray-300 font-mono">{account}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-sm">Total Certificates</p>
            <p className="text-2xl font-bold text-white">{certificates.length}</p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
          <span className="ml-4 text-gray-300">Loading certificates...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Certificates Grid */}
      {!loading && certificates.length > 0 && (
        <div className="grid gap-6">
          {certificates.map((cert, index) => (
            <motion.div
              key={cert.tokenId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-violet-500/50 transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-4">
                    <Award className="w-6 h-6 text-yellow-400 mr-3" />
                    <h3 className="text-xl font-semibold text-white">
                      {cert.metadata?.certificate_data.course || 'Certificate'}
                    </h3>
                    <span className="ml-4 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                      Verified
                    </span>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <span className="text-gray-400 text-sm">Student</span>
                      <p className="text-white">{cert.metadata?.certificate_data.student_name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Institution</span>
                      <p className="text-white">{cert.metadata?.certificate_data.institution || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Completion Date</span>
                      <p className="text-white">{cert.metadata?.certificate_data.completion_date || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Grade</span>
                      <p className="text-white font-semibold">{cert.metadata?.certificate_data.grade || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <span>Token ID: {cert.tokenId}</span>
                    <span>Owner: {formatAddress(cert.owner)}</span>
                  </div>
                </div>

                <div className="flex flex-col space-y-2 ml-6">
                  <button
                    onClick={() => handleViewOnIPFS(cert.metadataURI)}
                    className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors group"
                    title="View on IPFS"
                  >
                    <Eye className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                  </button>
                  <button
                    onClick={() => handleDownload(cert)}
                    className="p-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors group"
                    title="Download Certificate"
                  >
                    <Download className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                  </button>
                  <button
                    onClick={() => handleShare(cert)}
                    className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors group"
                    title="Share Certificate"
                  >
                    <Share className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                  </button>
                  <button
                    onClick={() => window.open(`https://etherscan.io/token/${contractService.getContractAddress()}?a=${cert.tokenId}`, '_blank')}
                    className="p-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors group"
                    title="View on Blockchain"
                  >
                    <ExternalLink className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Certificate Hash */}
              {cert.metadata?.certificate_data.certificate_hash && (
                <div className="mt-4 p-3 bg-gray-700/30 rounded-lg">
                  <span className="text-gray-400 text-xs">Certificate Hash:</span>
                  <p className="text-gray-300 font-mono text-sm break-all">
                    {cert.metadata.certificate_data.certificate_hash}
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && certificates.length === 0 && !error && (
        <div className="text-center py-12">
          <Award className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No Certificates Found</h3>
          <p className="text-gray-500 mb-6">You haven't received any certificates yet.</p>
          <p className="text-gray-500 text-sm">
            Certificates will appear here once they are issued to your wallet address.
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default MyCertificates;