@@ .. @@
 import React from 'react';
 import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
 import { AnimatePresence } from 'framer-motion';
-import Header from './components/Header';
+import Navbar from './components/Navbar';
 import Hero from './components/Hero';
 import TrustBar from './components/TrustBar';
 import Features from './components/Features';
 import Footer from './components/Footer';
 import LoadingAnimation from './components/LoadingAnimation';
 import DashboardLayout from './components/DashboardLayout';
 import About from './pages/About';
 import AdminDashboard from './pages/AdminDashboard';
 import BulkIssue from './pages/BulkIssue';
 import Contact from './pages/Contact';
 import EducrateAgent from './pages/EducrateAgent';
 import Homepage from './pages/Homepage';
 import IssueCertificate from './pages/IssueCertificate';
-import MyCertificate from './pages/MyCertificate';
+import MyCertificates from './pages/MyCertificates';
 import StudentDashboard from './pages/StudentDashboard';
 import LoadingPage from './pages/LoadingPage';
+import VerifyCertificate from './pages/VerifyCertificate';

 function App() {
   return (
   )
 }
@@ .. @@
           {/* Landing Page */}
           <Route path="/" element={
             <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-black">
-              <Header />
+              <Navbar />
               <Hero />
               <TrustBar />
               <Features />
@@ .. @@
             <Route path="educrate-agent" element={<EducrateAgent />} />
             <Route path="homepage" element={<Homepage />} />
             <Route path="issue-certificate" element={<IssueCertificate />} />
-            <Route path="my-certificate" element={<MyCertificate />} />
+            <Route path="my-certificate" element={<MyCertificates />} />
             <Route path="student-dashboard" element={<StudentDashboard />} />
+            <Route path="verify-certificate" element={<VerifyCertificate />} />
           </Route>
           }
         </Routes>
       </AnimatePresence>