@@ .. @@
 import React, { useEffect, useState } from 'react';
 import { motion } from 'framer-motion';
-import { Award, User, Calendar, BookOpen } from 'lucide-react';
+import { Award, User, Calendar, BookOpen, Upload, CheckCircle, AlertCircle } from 'lucide-react';
+import { useWallet } from '../hooks/useWallet';
+import { contractService } from '../utils/contract';
+import { ipfsService, IPFSMetadata } from '../api/ipfs';

 const IssueCertificate: React.FC = () => {
-  const [loading, setLoading] = useState(true);
+  const { isConnected, account, provider, signer, connect } = useWallet();
+  const [formData, setFormData] = useState({
+    studentName: '',
+    studentEmail: '',
+    studentWallet: '',
+    courseName: '',
+    institution: '',
+    completionDate: '',
+    grade: '',
+    notes: ''
+  });
+  const [certificateFile, setCertificateFile] = useState<File | null>(null);
+  const [isIssuing, setIsIssuing] = useState(false);
+  const [success, setSuccess] = useState('');
+  const [error, setError] = useState('');
+  const [txHash, setTxHash] = useState('');

   useEffect(() => {
-    const fetchData = async () => {
-      try {
-        const response = await fetch('/api/issue-certificate');
-        setTimeout(() => setLoading(false), 600);
-      } catch (error) {
-        console.log('Mock API call to /api/issue-certificate');
-        setLoading(false);
-      }
-    };
-
-    fetchData();
-  }, []);
+    if (isConnected && provider && signer) {
+      contractService.initialize(provider, signer);
+    }
+  }, [isConnected, provider, signer]);

-  if (loading) {
-    return (
-      <div className="flex items-center justify-center h-64">
-        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
-      </div>
-    );
-  }
+  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
+    const { name, value } = e.target;
+    setFormData(prev => ({ ...prev, [name]: value }));
+  };
+
+  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
+    const file = e.target.files?.[0];
+    if (file) {
+      // Validate file type
+      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
+      if (!allowedTypes.includes(file.type)) {
+        setError('Please upload a PDF, JPEG, or PNG file');
+        return;
+      }
+      
+      // Validate file size (max 10MB)
+      if (file.size > 10 * 1024 * 1024) {
+        setError('File size must be less than 10MB');
+        return;
+      }
+      
+      setCertificateFile(file);
+      setError('');
+    }
+  };
+
+  const validateForm = (): boolean => {
+    if (!formData.studentName.trim()) {
+      setError('Student name is required');
+      return false;
+    }
+    if (!formData.studentWallet.trim()) {
+      setError('Student wallet address is required');
+      return false;
+    }
+    if (!formData.courseName.trim()) {
+      setError('Course name is required');
+      return false;
+    }
+    if (!formData.institution.trim()) {
+      setError('Institution name is required');
+      return false;
+    }
+    if (!formData.completionDate) {
+      setError('Completion date is required');
+      return false;
+    }
+    if (!formData.grade) {
+      setError('Grade is required');
+      return false;
+    }
+    
+    // Validate wallet address format
+    if (!/^0x[a-fA-F0-9]{40}$/.test(formData.studentWallet)) {
+      setError('Invalid wallet address format');
+      return false;
+    }
+    
+    return true;
+  };
+
+  const handleSubmit = async (e: React.FormEvent) => {
+    e.preventDefault();
+    
+    if (!isConnected) {
+      setError('Please connect your wallet first');
+      return;
+    }
+    
+    if (!validateForm()) {
+      return;
+    }
+    
+    setIsIssuing(true);
+    setError('');
+    setSuccess('');
+    setTxHash('');
+    
+    try {
+      // Step 1: Upload certificate file to IPFS (if provided)
+      let certificateFileURI = '';
+      if (certificateFile) {
+        const fileUploadResult = await ipfsService.uploadFile(certificateFile);
+        certificateFileURI = fileUploadResult.url;
+      }
+      
+      // Step 2: Create metadata
+      const metadata: IPFSMetadata = {
+        name: `${formData.courseName} Certificate`,
+        description: `Certificate of completion for ${formData.courseName} issued to ${formData.studentName}`,
+        image: certificateFileURI,
+        attributes: [
+          { trait_type: "Course", value: formData.courseName },
+          { trait_type: "Institution", value: formData.institution },
+          { trait_type: "Grade", value: formData.grade },
+          { trait_type: "Completion Date", value: formData.completionDate },
+          { trait_type: "Student", value: formData.studentName }
+        ],
+        certificate_data: {
+          student_name: formData.studentName,
+          course: formData.courseName,
+          institution: formData.institution,
+          completion_date: formData.completionDate,
+          grade: formData.grade,
+          certificate_hash: "0x" + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')
+        }
+      };
+      
+      // Step 3: Upload metadata to IPFS
+      const metadataUploadResult = await ipfsService.uploadJSON(metadata);
+      
+      // Step 4: Mint certificate NFT
+      const tokenId = await contractService.mintCertificate(
+        formData.studentWallet,
+        metadataUploadResult.url
+      );
+      
+      setSuccess(`Certificate issued successfully! Token ID: ${tokenId}`);
+      setTxHash(`mock-tx-${tokenId}-${Date.now()}`);
+      
+      // Reset form
+      setFormData({
+        studentName: '',
+        studentEmail: '',
+        studentWallet: '',
+        courseName: '',
+        institution: '',
+        completionDate: '',
+        grade: '',
+        notes: ''
+      });
+      setCertificateFile(null);
+      
+    } catch (err: any) {
+      setError(err.message || 'Failed to issue certificate');
+    } finally {
+      setIsIssuing(false);
+    }
+  };
+
+  if (!isConnected) {
+    return (
+      <motion.div
+        initial={{ opacity: 0, y: 20 }}
+        animate={{ opacity: 1, y: 0 }}
+        transition={{ duration: 0.5 }}
+        className="max-w-4xl mx-auto"
+      >
+        <div className="text-center py-12">
+          <Award className="w-16 h-16 text-gray-600 mx-auto mb-4" />
+          <h3 className="text-xl font-semibold text-gray-400 mb-4">Connect Your Wallet</h3>
+          <p className="text-gray-500 mb-6">Please connect your wallet to issue certificates</p>
+          <button
+            onClick={connect}
+            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold px-8 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
+          >
+            Connect Wallet
+          </button>
+        </div>
+      </motion.div>
+    );
+  }

   return (
@@ .. @@
       </div>

       <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8">
-        <form className="space-y-6">
+        {/* Success Message */}
+        {success && (
+          <div className="mb-6 bg-green-500/20 border border-green-500/50 rounded-lg p-4 flex items-center">
+            <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
+            <div>
+              <span className="text-green-300">{success}</span>
+              {txHash && (
+                <p className="text-green-400 text-sm mt-1">Transaction: {txHash}</p>
+              )}
+            </div>
+          </div>
+        )}
+
+        {/* Error Message */}
+        {error && (
+          <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-center">
+            <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
+            <span className="text-red-300">{error}</span>
+          </div>
+        )}
+
+        <form onSubmit={handleSubmit} className="space-y-6">
           <div className="grid md:grid-cols-2 gap-6">
             <div>
               <label className="block text-gray-300 text-sm font-medium mb-2">
@@ -49,8 +217,10 @@
               </label>
               <input
                 type="text"
+                name="studentName"
+                value={formData.studentName}
+                onChange={handleInputChange}
                 placeholder="Enter student's full name"
-                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-violet-500"
+                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-violet-500"
+                required
               />
             </div>

@@ .. @@
               </label>
               <input
                 type="email"
+                name="studentEmail"
+                value={formData.studentEmail}
+                onChange={handleInputChange}
                 placeholder="student@example.com"
                 className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-violet-500"
               />
             </div>
           </div>

+          <div>
+            <label className="block text-gray-300 text-sm font-medium mb-2">
+              Student Wallet Address
+            </label>
+            <input
+              type="text"
+              name="studentWallet"
+              value={formData.studentWallet}
+              onChange={handleInputChange}
+              placeholder="0x..."
+              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-violet-500"
+              required
+            />
+          </div>
+
           <div className="grid md:grid-cols-2 gap-6">
             <div>
               <label className="block text-gray-300 text-sm font-medium mb-2">
@@ -70,6 +250,9 @@
               </label>
               <input
                 type="text"
+                name="courseName"
+                value={formData.courseName}
+                onChange={handleInputChange}
                 placeholder="Enter course name"
-                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-violet-500"
+                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-violet-500"
+                required
               />
             </div>

@@ .. @@
               </label>
               <input
                 type="date"
+                name="completionDate"
+                value={formData.completionDate}
+                onChange={handleInputChange}
                 className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-violet-500"
+                required
               />
             </div>
           </div>

@@ .. @@
               <label className="block text-gray-300 text-sm font-medium mb-2">
                 Grade/Score
               </label>
-              <select className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-violet-500">
+              <select 
+                name="grade"
+                value={formData.grade}
+                onChange={handleInputChange}
+                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-violet-500"
+                required
+              >
                 <option value="">Select Grade</option>
                 <option value="A+">A+</option>
@@ .. @@
               <label className="block text-gray-300 text-sm font-medium mb-2">
                 Institution
               </label>
               <input
                 type="text"
+                name="institution"
+                value={formData.institution}
+                onChange={handleInputChange}
                 placeholder="Institution name"
-                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-violet-500"
+                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-violet-500"
+                required
               />
             </div>
           </div>

+          {/* Certificate File Upload */}
+          <div>
+            <label className="block text-gray-300 text-sm font-medium mb-2">
+              <Upload className="w-4 h-4 inline mr-2" />
+              Certificate File (Optional)
+            </label>
+            <input
+              type="file"
+              onChange={handleFileChange}
+              accept=".pdf,.jpg,.jpeg,.png"
+              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-700"
+            />
+            <p className="text-gray-400 text-xs mt-1">
+              Supported formats: PDF, JPEG, PNG (Max 10MB)
+            </p>
+            {certificateFile && (
+              <p className="text-green-400 text-sm mt-2">
+                Selected: {certificateFile.name}
+              </p>
+            )}
+          </div>
+
           <div>
             <label className="block text-gray-300 text-sm font-medium mb-2">
               Additional Notes
             </label>
             <textarea
               rows={3}
+              name="notes"
+              value={formData.notes}
+              onChange={handleInputChange}
               placeholder="Any additional information or notes"
               className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-violet-500 resize-none"
             ></textarea>
@@ .. @@
           <div className="flex space-x-4">
             <button
               type="submit"
-              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold px-8 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
+              disabled={isIssuing}
+              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold px-8 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
             >
-              Issue Certificate
+              {isIssuing ? (
+                <>
+                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
+                  Issuing...
+                </>
+              ) : (
+                'Issue Certificate'
+              )}
             </button>
             <button
               type="button"
+              disabled={isIssuing}
               className="bg-gray-700 hover:bg-gray-600 text-white font-bold px-8 py-3 rounded-lg transition-colors"
             >
               Save as Draft
@@ .. @@
           </div>
         </form>
       </div>
+
+      {/* Information Panel */}
+      <div className="mt-8 bg-gradient-to-r from-violet-600/20 to-purple-600/20 rounded-xl p-6">
+        <h3 className="text-lg font-semibold text-white mb-4">How Certificate Issuance Works</h3>
+        <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-300">
+          <div>
+            <h4 className="font-semibold text-white mb-2">Process Steps:</h4>
+            <ol className="space-y-1 list-decimal list-inside">
+              <li>Fill in student and course information</li>
+              <li>Upload certificate file (optional)</li>
+              <li>Metadata is created and uploaded to IPFS</li>
+              <li>NFT certificate is minted on blockchain</li>
+              <li>Student receives certificate in their wallet</li>
+            </ol>
+          </div>
+          <div>
+            <h4 className="font-semibold text-white mb-2">Benefits:</h4>
+            <ul className="space-y-1 list-disc list-inside">
+              <li>Tamper-proof verification</li>
+              <li>Permanent blockchain storage</li>
+              <li>Instant global verification</li>
+              <li>Student owns their credentials</li>
+              <li>Reduced fraud and forgery</li>
+            </ul>
+          </div>
+        </div>
+      </div>
     </motion.div>
   );
 };