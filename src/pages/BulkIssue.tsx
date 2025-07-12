@@ .. @@
 import React, { useEffect, useState } from 'react';
 import { motion } from 'framer-motion';
-import { FileText, Upload, Download } from 'lucide-react';
+import { FileText, Upload, Download, CheckCircle, AlertCircle, Wallet } from 'lucide-react';
+import { useWallet } from '../hooks/useWallet';
+import { contractService } from '../utils/contract';
+import { ipfsService, IPFSMetadata } from '../api/ipfs';

+interface CSVRow {
+  student_name: string;
+  email: string;
+  wallet_address: string;
+  course: string;
+  institution: string;
+  completion_date: string;
+  grade: string;
+}
+
+interface IssuanceResult {
+  row: CSVRow;
+  success: boolean;
+  tokenId?: number;
+  error?: string;
+}
+
 const BulkIssue: React.FC = () => {
-  const [loading, setLoading] = useState(true);
+  const { isConnected, account, provider, signer, connect } = useWallet();
+  const [csvFile, setCsvFile] = useState<File | null>(null);
+  const [csvData, setCsvData] = useState<CSVRow[]>([]);
+  const [isProcessing, setIsProcessing] = useState(false);
+  const [results, setResults] = useState<IssuanceResult[]>([]);
+  const [error, setError] = useState('');
+  const [progress, setProgress] = useState(0);

   useEffect(() => {
-    const fetchData = async () => {
-      try {
-        const response = await fetch('/api/bulk-issue');
-        setTimeout(() => setLoading(false), 600);
-      } catch (error) {
-        console.log('Mock API call to /api/bulk-issue');
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
+  const parseCSV = (csvText: string): CSVRow[] => {
+    const lines = csvText.trim().split('\n');
+    const headers = lines[0].split(',').map(h => h.trim());
+    
+    const expectedHeaders = ['student_name', 'email', 'wallet_address', 'course', 'institution', 'completion_date', 'grade'];
+    const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
+    
+    if (missingHeaders.length > 0) {
+      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
+    }
+    
+    const data: CSVRow[] = [];
+    for (let i = 1; i < lines.length; i++) {
+      const values = lines[i].split(',').map(v => v.trim());
+      const row: any = {};
+      
+      headers.forEach((header, index) => {
+        row[header] = values[index] || '';
+      });
+      
+      // Validate required fields
+      if (row.student_name && row.wallet_address && row.course && row.institution && row.completion_date && row.grade) {
+        data.push(row as CSVRow);
+      }
+    }
+    
+    return data;
+  };
+
+  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
+    const file = e.target.files?.[0];
+    if (file) {
+      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
+        setError('Please upload a CSV file');
+        return;
+      }
+      
+      setCsvFile(file);
+      setError('');
+      setResults([]);
+      
+      // Parse CSV file
+      const reader = new FileReader();
+      reader.onload = (event) => {
+        try {
+          const csvText = event.target?.result as string;
+          const data = parseCSV(csvText);
+          setCsvData(data);
+        } catch (err: any) {
+          setError(err.message);
+          setCsvData([]);
+        }
+      };
+      reader.readAsText(file);
+    }
+  };
+
+  const processBulkIssuance = async () => {
+    if (!csvData.length) {
+      setError('No valid data to process');
+      return;
+    }
+    
+    setIsProcessing(true);
+    setError('');
+    setResults([]);
+    setProgress(0);
+    
+    const results: IssuanceResult[] = [];
+    
+    for (let i = 0; i < csvData.length; i++) {
+      const row = csvData[i];
+      
+      try {
+        // Create metadata for this certificate
+        const metadata: IPFSMetadata = {
+          name: `${row.course} Certificate`,
+          description: `Certificate of completion for ${row.course} issued to ${row.student_name}`,
+          attributes: [
+            { trait_type: "Course", value: row.course },
+            { trait_type: "Institution", value: row.institution },
+            { trait_type: "Grade", value: row.grade },
+            { trait_type: "Completion Date", value: row.completion_date },
+            { trait_type: "Student", value: row.student_name }
+          ],
+          certificate_data: {
+            student_name: row.student_name,
+            course: row.course,
+            institution: row.institution,
+            completion_date: row.completion_date,
+            grade: row.grade,
+            certificate_hash: "0x" + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')
+          }
+        };
+        
+        // Upload metadata to IPFS
+        const metadataUploadResult = await ipfsService.uploadJSON(metadata);
+        
+        // Mint certificate NFT
+        const tokenId = await contractService.mintCertificate(
+          row.wallet_address,
+          metadataUploadResult.url
+        );
+        
+        results.push({
+          row,
+          success: true,
+          tokenId
+        });
+        
+      } catch (err: any) {
+        results.push({
+          row,
+          success: false,
+          error: err.message
+        });
+      }
+      
+      setProgress(((i + 1) / csvData.length) * 100);
+      setResults([...results]);
+      
+      // Small delay to prevent overwhelming the network
+      await new Promise(resolve => setTimeout(resolve, 500));
+    }
+    
+    setIsProcessing(false);
+  };
+
+  const downloadSampleCSV = () => {
+    const sampleData = `student_name,email,wallet_address,course,institution,completion_date,grade
+John Doe,john@example.com,0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1,Blockchain Fundamentals,QUIN Academy,2024-01-15,A+
+Jane Smith,jane@example.com,0x1234567890123456789012345678901234567890,Smart Contracts,QUIN Academy,2024-01-20,A
+Bob Johnson,bob@example.com,0x9876543210987654321098765432109876543210,Web3 Development,QUIN Academy,2024-01-25,B+`;
+    
+    const blob = new Blob([sampleData], { type: 'text/csv' });
+    const url = URL.createObjectURL(blob);
+    const a = document.createElement('a');
+    a.href = url;
+    a.download = 'sample_certificates.csv';
+    document.body.appendChild(a);
+    a.click();
+    document.body.removeChild(a);
+    URL.revokeObjectURL(url);
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
+          <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
+          <h3 className="text-xl font-semibold text-gray-400 mb-4">Connect Your Wallet</h3>
+          <p className="text-gray-500 mb-6">Please connect your wallet to issue certificates in bulk</p>
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
-        <div className="text-center mb-8">
+        {/* Error Display */}
+        {error && (
+          <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-center">
+            <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
+            <span className="text-red-300">{error}</span>
+          </div>
+        )}
+
+        {/* File Upload Section */}
+        <div className="mb-8">
           <div className="bg-gradient-to-r from-violet-600/20 to-purple-600/20 rounded-lg p-8 mb-6">
             <Upload className="w-16 h-16 text-violet-400 mx-auto mb-4" />
             <h2 className="text-xl font-semibold text-white mb-2">Upload CSV File</h2>
             <p className="text-gray-300">Upload a CSV file containing student information to issue certificates in bulk</p>
           </div>

-          <button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold px-8 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg">
-            Choose File
-          </button>
+          <div className="text-center">
+            <input
+              type="file"
+              accept=".csv"
+              onChange={handleFileChange}
+              className="hidden"
+              id="csv-upload"
+            />
+            <label
+              htmlFor="csv-upload"
+              className="inline-block bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold px-8 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg cursor-pointer"
+            >
+              Choose CSV File
+            </label>
+            
+            {csvFile && (
+              <div className="mt-4 p-4 bg-gray-700/30 rounded-lg">
+                <p className="text-green-400 mb-2">✓ File selected: {csvFile.name}</p>
+                <p className="text-gray-300 text-sm">Found {csvData.length} valid records</p>
+              </div>
+            )}
+          </div>
         </div>

-        <div className="border-t border-gray-700 pt-8">
+        {/* CSV Preview */}
+        {csvData.length > 0 && (
+          <div className="mb-8">
+            <h3 className="text-lg font-semibold text-white mb-4">Preview ({csvData.length} records)</h3>
+            <div className="bg-gray-700/30 rounded-lg p-4 max-h-64 overflow-y-auto">
+              <div className="grid grid-cols-4 gap-4 text-sm font-semibold text-gray-300 mb-2">
+                <div>Student</div>
+                <div>Course</div>
+                <div>Institution</div>
+                <div>Grade</div>
+              </div>
+              {csvData.slice(0, 5).map((row, index) => (
+                <div key={index} className="grid grid-cols-4 gap-4 text-sm text-white py-2 border-t border-gray-600">
+                  <div>{row.student_name}</div>
+                  <div>{row.course}</div>
+                  <div>{row.institution}</div>
+                  <div>{row.grade}</div>
+                </div>
+              ))}
+              {csvData.length > 5 && (
+                <div className="text-gray-400 text-sm mt-2">
+                  ... and {csvData.length - 5} more records
+                </div>
+              )}
+            </div>
+            
+            <div className="mt-4 flex space-x-4">
+              <button
+                onClick={processBulkIssuance}
+                disabled={isProcessing}
+                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold px-8 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
+              >
+                {isProcessing ? (
+                  <>
+                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
+                    Processing... ({Math.round(progress)}%)
+                  </>
+                ) : (
+                  `Issue ${csvData.length} Certificates`
+                )}
+              </button>
+            </div>
+          </div>
+        )}
+
+        {/* Progress Bar */}
+        {isProcessing && (
+          <div className="mb-8">
+            <div className="bg-gray-700 rounded-full h-4 overflow-hidden">
+              <div 
+                className="bg-gradient-to-r from-violet-600 to-purple-600 h-full transition-all duration-300"
+                style={{ width: `${progress}%` }}
+              ></div>
+            </div>
+            <p className="text-gray-300 text-sm mt-2 text-center">
+              Processing {Math.round(progress)}% complete
+            </p>
+          </div>
+        )}
+
+        {/* Results */}
+        {results.length > 0 && (
+          <div className="mb-8">
+            <h3 className="text-lg font-semibold text-white mb-4">Issuance Results</h3>
+            <div className="space-y-2 max-h-64 overflow-y-auto">
+              {results.map((result, index) => (
+                <div
+                  key={index}
+                  className={`p-3 rounded-lg flex items-center justify-between ${
+                    result.success 
+                      ? 'bg-green-500/20 border border-green-500/50' 
+                      : 'bg-red-500/20 border border-red-500/50'
+                  }`}
+                >
+                  <div className="flex items-center">
+                    {result.success ? (
+                      <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
+                    ) : (
+                      <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
+                    )}
+                    <div>
+                      <p className="text-white font-medium">{result.row.student_name}</p>
+                      <p className="text-gray-300 text-sm">{result.row.course}</p>
+                    </div>
+                  </div>
+                  <div className="text-right">
+                    {result.success ? (
+                      <p className="text-green-400 text-sm">Token ID: {result.tokenId}</p>
+                    ) : (
+                      <p className="text-red-400 text-sm">{result.error}</p>
+                    )}
+                  </div>
+                </div>
+              ))}
+            </div>
+            
+            <div className="mt-4 p-4 bg-gray-700/30 rounded-lg">
+              <div className="grid grid-cols-2 gap-4 text-center">
+                <div>
+                  <p className="text-green-400 text-2xl font-bold">
+                    {results.filter(r => r.success).length}
+                  </p>
+                  <p className="text-gray-300 text-sm">Successful</p>
+                </div>
+                <div>
+                  <p className="text-red-400 text-2xl font-bold">
+                    {results.filter(r => !r.success).length}
+                  </p>
+                  <p className="text-gray-300 text-sm">Failed</p>
+                </div>
+              </div>
+            </div>
+          </div>
+        )}
+
+        {/* CSV Format Requirements */}
+        <div className="border-t border-gray-700 pt-8">
           <h3 className="text-lg font-semibold text-white mb-4">CSV Format Requirements</h3>
           <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
             <code className="text-green-400 text-sm">
-              student_name,email,course,completion_date,grade
+              student_name,email,wallet_address,course,institution,completion_date,grade
             </code>
           </div>
+          
+          <div className="mb-4">
+            <h4 className="text-white font-medium mb-2">Required Columns:</h4>
+            <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
+              <li><strong>student_name:</strong> Full name of the student</li>
+              <li><strong>email:</strong> Student's email address (optional)</li>
+              <li><strong>wallet_address:</strong> Student's blockchain wallet address (0x...)</li>
+              <li><strong>course:</strong> Name of the course or program</li>
+              <li><strong>institution:</strong> Name of the issuing institution</li>
+              <li><strong>completion_date:</strong> Date of completion (YYYY-MM-DD)</li>
+              <li><strong>grade:</strong> Grade or score achieved</li>
+            </ul>
+          </div>
+          
           <div className="flex items-center space-x-4">
             <Download className="w-5 h-5 text-gray-400" />
-            <a href="#" className="text-violet-400 hover:text-violet-300 transition-colors">
+            <button 
+              onClick={downloadSampleCSV}
+              className="text-violet-400 hover:text-violet-300 transition-colors"
+            >
               Download Sample CSV Template
-            </a>
+            </button>
           </div>
         </div>
       </div>