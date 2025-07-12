@@ .. @@
 import React, { useEffect, useState } from 'react';
 import { motion } from 'framer-motion';
-import { Bot, MessageCircle, Zap } from 'lucide-react';
+import { Bot, MessageCircle, Zap, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
+import { useNavigate } from 'react-router-dom';
+import { voiceAgent, VoiceResponse } from '../agents/voiceAgent';

 const EduCredAgent: React.FC = () => {
-  const [loading, setLoading] = useState(true);
+  const navigate = useNavigate();
+  const [isListening, setIsListening] = useState(false);
+  const [isSpeaking, setIsSpeaking] = useState(false);
+  const [transcript, setTranscript] = useState('');
+  const [response, setResponse] = useState<VoiceResponse | null>(null);
+  const [conversation, setConversation] = useState<Array<{
+    type: 'user' | 'agent';
+    text: string;
+    timestamp: Date;
+  }>>([]);
+  const [isSupported, setIsSupported] = useState(false);
+  const [error, setError] = useState('');

   useEffect(() => {
-    const fetchData = async () => {
-      try {
-        const response = await fetch('/api/educrate-agent');
-        setTimeout(() => setLoading(false), 700);
-      } catch (error) {
-        console.log('Mock API call to /api/educrate-agent');
-        setLoading(false);
-      }
-    };
-
-    fetchData();
+    setIsSupported(voiceAgent.isSupported());
+    
+    // Add welcome message
+    setConversation([{
+      type: 'agent',
+      text: "Hello! I'm your EduCred voice assistant. I can help you issue certificates, verify credentials, and navigate the platform. Try saying 'help' to see what I can do!",
+      timestamp: new Date()
+    }]);
   }, []);

-  if (loading) {
-    return (
-      <div className="flex items-center justify-center h-64">
-        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
-      </div>
-    );
-  }
+  const handleVoiceCommand = async () => {
+    if (isListening) {
+      voiceAgent.stopListening();
+      setIsListening(false);
+      return;
+    }
+
+    setError('');
+    setIsListening(true);
+    
+    try {
+      const response = await voiceAgent.processVoiceCommand();
+      
+      // Add user transcript to conversation
+      if (transcript) {
+        setConversation(prev => [...prev, {
+          type: 'user',
+          text: transcript,
+          timestamp: new Date()
+        }]);
+      }
+      
+      // Add agent response to conversation
+      setConversation(prev => [...prev, {
+        type: 'agent',
+        text: response.text,
+        timestamp: new Date()
+      }]);
+      
+      setResponse(response);
+      
+      // Execute action if provided
+      if (response.action) {
+        switch (response.action.type) {
+          case 'navigate':
+            setTimeout(() => {
+              navigate(response.action!.payload.path);
+            }, 1000);
+            break;
+          case 'execute':
+            // Handle other actions
+            break;
+        }
+      }
+      
+      // Speak the response
+      if (isSpeaking) {
+        voiceAgent.speak(response.text);
+      }
+      
+    } catch (err: any) {
+      setError(err.message);
+      setConversation(prev => [...prev, {
+        type: 'agent',
+        text: "Sorry, I encountered an error processing your request. Please try again.",
+        timestamp: new Date()
+      }]);
+    } finally {
+      setIsListening(false);
+    }
+  };
+
+  const toggleSpeaking = () => {
+    if (isSpeaking) {
+      voiceAgent.stopSpeaking();
+    }
+    setIsSpeaking(!isSpeaking);
+  };
+
+  const clearConversation = () => {
+    setConversation([{
+      type: 'agent',
+      text: "Conversation cleared. How can I help you?",
+      timestamp: new Date()
+    }]);
+    setResponse(null);
+    setError('');
+  };

   return (
@@ .. @@
       <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8">
         <div className="text-center mb-8">
           <div className="bg-gradient-to-r from-violet-600/20 to-purple-600/20 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
-            <Bot className="w-12 h-12 text-violet-400" />
+            <Bot className={`w-12 h-12 ${isListening ? 'text-green-400 animate-pulse' : 'text-violet-400'}`} />
           </div>
           <h2 className="text-2xl font-semibold text-white mb-4">AI-Powered Education Assistant</h2>
           <p className="text-gray-300 max-w-2xl mx-auto">
-            Your intelligent companion for managing educational credentials, answering questions, 
-            and providing insights about the blockchain certification process.
+            Your intelligent voice companion for managing educational credentials. 
+            Speak naturally to issue certificates, verify credentials, and navigate the platform.
           </p>
         </div>

+        {/* Voice Support Check */}
+        {!isSupported && (
+          <div className="mb-6 bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
+            <p className="text-yellow-300">
+              Voice recognition is not supported in your browser. Please use Chrome, Edge, or Safari for the best experience.
+            </p>
+          </div>
+        )}
+
+        {/* Error Display */}
+        {error && (
+          <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-lg p-4">
+            <p className="text-red-300">{error}</p>
+          </div>
+        )}
+
+        {/* Voice Controls */}
+        <div className="flex justify-center space-x-4 mb-8">
+          <button
+            onClick={handleVoiceCommand}
+            disabled={!isSupported}
+            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
+              isListening 
+                ? 'bg-red-600 hover:bg-red-700 text-white' 
+                : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white'
+            }`}
+          >
+            {isListening ? (
+              <>
+                <MicOff className="w-5 h-5" />
+                <span>Stop Listening</span>
+              </>
+            ) : (
+              <>
+                <Mic className="w-5 h-5" />
+                <span>Start Voice Command</span>
+              </>
+            )}
+          </button>
+
+          <button
+            onClick={toggleSpeaking}
+            className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors ${
+              isSpeaking 
+                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
+                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
+            }`}
+          >
+            {isSpeaking ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
+            <span>{isSpeaking ? 'Audio On' : 'Audio Off'}</span>
+          </button>
+
+          <button
+            onClick={clearConversation}
+            className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-colors"
+          >
+            Clear Chat
+          </button>
+        </div>
+
         <div className="grid md:grid-cols-3 gap-6 mb-8">
           <div className="text-center p-6 bg-gray-700/30 rounded-lg">
             <MessageCircle className="w-8 h-8 text-blue-400 mx-auto mb-3" />
-            <h3 className="text-white font-semibold mb-2">Smart Conversations</h3>
-            <p className="text-gray-400 text-sm">Natural language processing for intuitive interactions</p>
+            <h3 className="text-white font-semibold mb-2">Voice Commands</h3>
+            <p className="text-gray-400 text-sm">Speak naturally to control the platform</p>
           </div>

           <div className="text-center p-6 bg-gray-700/30 rounded-lg">
             <Zap className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
             <h3 className="text-white font-semibold mb-2">Instant Responses</h3>
-            <p className="text-gray-400 text-sm">Get immediate answers to your certification queries</p>
+            <p className="text-gray-400 text-sm">Real-time processing and immediate actions</p>
           </div>

           <div className="text-center p-6 bg-gray-700/30 rounded-lg">
             <Bot className="w-8 h-8 text-violet-400 mx-auto mb-3" />
-            <h3 className="text-white font-semibold mb-2">24/7 Availability</h3>
-            <p className="text-gray-400 text-sm">Always ready to assist with your educational needs</p>
+            <h3 className="text-white font-semibold mb-2">Smart Navigation</h3>
+            <p className="text-gray-400 text-sm">Automatically navigate to the right pages</p>
           </div>
         </div>

-        <div className="bg-gray-700/30 rounded-lg p-6">
+        {/* Conversation Interface */}
+        <div className="bg-gray-700/30 rounded-lg p-6 mb-6">
           <div className="flex items-center justify-between mb-4">
-            <h3 className="text-lg font-semibold text-white">Chat Interface</h3>
-            <span className="bg-green-500 w-3 h-3 rounded-full"></span>
+            <h3 className="text-lg font-semibold text-white">Conversation</h3>
+            <div className="flex items-center space-x-2">
+              {isListening && (
+                <div className="flex items-center space-x-1">
+                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
+                  <span className="text-red-400 text-sm">Listening...</span>
+                </div>
+              )}
+              <span className={`w-3 h-3 rounded-full ${isSupported ? 'bg-green-500' : 'bg-red-500'}`}></span>
+            </div>
           </div>
-          <div className="bg-gray-800/50 rounded-lg p-4 h-64 flex items-center justify-center">
-            <p className="text-gray-400">Chat interface will be loaded here...</p>
+          
+          <div className="bg-gray-800/50 rounded-lg p-4 h-64 overflow-y-auto space-y-3">
+            {conversation.map((message, index) => (
+              <div
+                key={index}
+                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
+              >
+                <div
+                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
+                    message.type === 'user'
+                      ? 'bg-violet-600 text-white'
+                      : 'bg-gray-700 text-gray-200'
+                  }`}
+                >
+                  <p className="text-sm">{message.text}</p>
+                  <p className="text-xs opacity-70 mt-1">
+                    {message.timestamp.toLocaleTimeString()}
+                  </p>
+                </div>
+              </div>
+            ))}
+            
+            {conversation.length === 1 && (
+              <div className="text-center text-gray-400 text-sm mt-8">
+                <p>Try saying:</p>
+                <ul className="mt-2 space-y-1">
+                  <li>"Issue certificate for John Doe"</li>
+                  <li>"Verify certificate token 123"</li>
+                  <li>"Show my certificates"</li>
+                  <li>"Help"</li>
+                </ul>
+              </div>
+            )}
           </div>
         </div>
+
+        {/* Example Commands */}
+        <div className="bg-gradient-to-r from-violet-600/20 to-purple-600/20 rounded-lg p-6">
+          <h3 className="text-lg font-semibold text-white mb-4">Example Voice Commands</h3>
+          <div className="grid md:grid-cols-2 gap-4 text-sm">
+            <div>
+              <h4 className="font-semibold text-white mb-2">Certificate Management:</h4>
+              <ul className="text-gray-300 space-y-1">
+                <li>• "Issue certificate for [student name]"</li>
+                <li>• "Create certificate for [course name]"</li>
+                <li>• "Show bulk issue page"</li>
+                <li>• "Go to admin dashboard"</li>
+              </ul>
+            </div>
+            <div>
+              <h4 className="font-semibold text-white mb-2">Verification & Viewing:</h4>
+              <ul className="text-gray-300 space-y-1">
+                <li>• "Verify certificate token [number]"</li>
+                <li>• "Check certificate for [wallet address]"</li>
+                <li>• "Show my certificates"</li>
+                <li>• "Display verification page"</li>
+              </ul>
+            </div>
+          </div>
+        </div>
       </div>
     </motion.div>
   );