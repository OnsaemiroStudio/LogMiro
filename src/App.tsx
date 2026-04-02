/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Terminal, 
  History,
  Trash2,
  Copy,
  ChevronRight,
  Zap,
  Lightbulb,
  Bug,
  Key,
  Cpu,
  Settings2,
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { analyzeLogWithGemini, LogAnalysisResponse } from './services/geminiService';
import { encryptData, decryptData } from './lib/crypto';

interface AnalysisResult {
  id: string;
  timestamp: number;
  logPreview: string;
  analysis: LogAnalysisResponse;
}

const AVAILABLE_MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Fast)' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Advanced)' },
  { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite (Efficient)' },
  { id: 'custom', name: 'Custom Model...' },
];

export default function App() {
  const [logInput, setLogInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // Settings state
  const [apiKey, setApiKey] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-3-flash-preview');
  const [customModelName, setCustomModelName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsEndRef = useRef<HTMLDivElement>(null);

  // Load settings from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('loglens_api_key');
    const savedEncKey = localStorage.getItem('loglens_api_key_enc');
    const savedModel = localStorage.getItem('loglens_model');
    const savedCustomModel = localStorage.getItem('loglens_custom_model');
    
    if (savedEncKey) {
      setIsEncrypted(true);
    } else if (savedKey) {
      setApiKey(savedKey);
      setIsEncrypted(false);
    }
    
    if (savedModel) setSelectedModel(savedModel);
    if (savedCustomModel) setCustomModelName(savedCustomModel);
  }, []);

  const handleEncrypt = async () => {
    if (!apiKey || !masterPassword) {
      setError("Both API Key and Master Password are required to encrypt.");
      return;
    }
    try {
      const encrypted = await encryptData(apiKey, masterPassword);
      localStorage.setItem('loglens_api_key_enc', encrypted);
      localStorage.removeItem('loglens_api_key');
      setIsEncrypted(true);
      setError(null);
    } catch (err) {
      setError("Encryption failed. Please try again.");
    }
  };

  const handleDecrypt = async () => {
    const savedEncKey = localStorage.getItem('loglens_api_key_enc');
    if (!savedEncKey || !masterPassword) {
      setError("Master Password is required to decrypt.");
      return;
    }
    try {
      const decrypted = await decryptData(savedEncKey, masterPassword);
      setApiKey(decrypted);
      setIsEncrypted(false);
      setError(null);
    } catch (err) {
      setError("Invalid Master Password. Decryption failed.");
    }
  };

  const handleRemoveEncryption = () => {
    localStorage.removeItem('loglens_api_key_enc');
    localStorage.setItem('loglens_api_key', apiKey);
    setIsEncrypted(false);
  };

  // Save model selection to localStorage
  useEffect(() => {
    localStorage.setItem('loglens_model', selectedModel);
    if (selectedModel === 'custom') {
      localStorage.setItem('loglens_custom_model', customModelName);
    }
  }, [selectedModel, customModelName]);

  // Save plain text API key if not encrypted
  useEffect(() => {
    if (!isEncrypted && apiKey) {
      localStorage.setItem('loglens_api_key', apiKey);
    }
  }, [apiKey, isEncrypted]);

  const scrollToBottom = () => {
    resultsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (currentResult) {
      scrollToBottom();
    }
  }, [currentResult]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setLogInput(content);
      };
      reader.readAsText(file);
    }
  };

  const analyzeLog = async () => {
    if (!logInput.trim()) return;
    if (!apiKey.trim()) {
      setError("Please provide or decrypt your Gemini API Key in the settings.");
      setShowSettings(true);
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setCurrentResult(null);

    try {
      const actualModel = selectedModel === 'custom' ? customModelName : selectedModel;
      if (selectedModel === 'custom' && !customModelName.trim()) {
        throw new Error("Please enter a custom model name.");
      }
      
      const analysisData = await analyzeLogWithGemini(logInput, apiKey, actualModel);
      
      const newResult: AnalysisResult = {
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
        logPreview: logInput.slice(0, 100) + (logInput.length > 100 ? '...' : ''),
        analysis: analysisData,
      };

      setResults(prev => [newResult, ...prev]);
      setCurrentResult(newResult);
      setLogInput('');
    } catch (err: any) {
      console.error("Analysis failed:", err);
      setError(err.message || "Failed to analyze log. Please check your API key and model selection.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearHistory = () => {
    setResults([]);
    setCurrentResult(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'Warning': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-green-500 bg-green-500/10 border-green-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-gray-100 font-sans selection:bg-indigo-500/30">
      {/* Background Decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Terminal className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                LogMiro
              </h1>
              <p className="text-sm text-gray-500">Intelligent Log Analysis</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                "p-2 rounded-lg transition-all",
                showSettings ? "bg-indigo-600 text-white" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
              )}
              title="Settings"
            >
              <Settings2 className="w-5 h-5" />
            </button>
            <button 
              onClick={clearHistory}
              className="p-2 text-gray-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition-all"
              title="Clear History"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Settings Section */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-8"
            >
              <div className="bg-[#16161a] border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* API Key Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <Key className="w-3 h-3" />
                        Gemini API Key
                      </label>
                      {isEncrypted ? (
                        <span className="text-[10px] text-indigo-400 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Encrypted
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-600 flex items-center gap-1">
                          <Unlock className="w-2.5 h-2.5" /> Plain Text
                        </span>
                      )}
                    </div>
                    
                    <div className="relative">
                      <input 
                        type="password"
                        value={isEncrypted ? "••••••••••••••••" : apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        disabled={isEncrypted}
                        placeholder={isEncrypted ? "Decrypt to view/edit" : "Enter your API key..."}
                        className={cn(
                          "w-full bg-[#0d0d0f] border border-white/5 rounded-xl px-4 py-2.5 text-sm font-mono text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all",
                          isEncrypted && "opacity-50 cursor-not-allowed"
                        )}
                      />
                    </div>
                  </div>

                  {/* Model Selection */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <Cpu className="w-3 h-3" />
                      AI Model
                    </label>
                    <select 
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full bg-[#0d0d0f] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all appearance-none"
                    >
                      {AVAILABLE_MODELS.map(model => (
                        <option key={model.id} value={model.id}>{model.name}</option>
                      ))}
                    </select>

                    {selectedModel === 'custom' && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="pt-2"
                      >
                        <input 
                          type="text"
                          value={customModelName}
                          onChange={(e) => setCustomModelName(e.target.value)}
                          placeholder="e.g., gemini-2.5-flash-lite"
                          className="w-full bg-[#0d0d0f] border border-white/5 rounded-xl px-4 py-2.5 text-sm font-mono text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                        />
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Encryption Controls */}
                <div className="pt-4 border-t border-white/5 space-y-4">
                  <div className="flex flex-col md:flex-row items-end gap-4">
                    <div className="w-full space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck className="w-3 h-3" />
                        Master Password
                      </label>
                      <input 
                        type="password"
                        value={masterPassword}
                        onChange={(e) => setMasterPassword(e.target.value)}
                        placeholder="Enter Master Password..."
                        className="w-full bg-[#0d0d0f] border border-white/5 rounded-xl px-4 py-2.5 text-sm font-mono text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                      />
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {isEncrypted ? (
                        <>
                          <button 
                            onClick={handleDecrypt}
                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            Decrypt
                          </button>
                          <button 
                            onClick={handleRemoveEncryption}
                            className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-red-500/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Clear
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={handleEncrypt}
                          disabled={!apiKey || !masterPassword}
                          className="px-4 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          Encrypt Key
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-600 leading-relaxed">
                    <ShieldAlert className="w-2.5 h-2.5 inline mr-1 mb-0.5" />
                    Encryption uses AES-GCM. Your Master Password is used to derive a secure key. 
                    If you forget your Master Password, you will need to re-enter your API key.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Input Section */}
          <section className="lg:col-span-7 space-y-6">
            <div className="bg-[#16161a] border border-white/5 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Input Logs
                </h2>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload File
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  accept=".log,.txt"
                />
              </div>

              <textarea
                value={logInput}
                onChange={(e) => setLogInput(e.target.value)}
                placeholder="Paste your error logs, stack traces, or server output here..."
                className="w-full h-64 bg-[#0d0d0f] border border-white/5 rounded-xl p-4 text-sm font-mono text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none transition-all"
              />

              <div className="mt-4 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-gray-600 uppercase tracking-widest">
                    {logInput.length} characters
                  </span>
                  <span className="text-[10px] text-indigo-500/60 font-mono">
                    Using {selectedModel === 'custom' ? customModelName || 'Custom Model' : AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name}
                  </span>
                </div>
                <button
                  onClick={analyzeLog}
                  disabled={isAnalyzing || !logInput.trim()}
                  className={cn(
                    "px-6 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all",
                    isAnalyzing || !logInput.trim() 
                      ? "bg-gray-800 text-gray-500 cursor-not-allowed" 
                      : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 active:scale-95"
                  )}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Analyze with Gemini
                    </>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-200">{error}</p>
              </motion.div>
            )}

            {/* Current Analysis Result */}
            <AnimatePresence mode="wait">
              {currentResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-[#16161a] border border-white/5 rounded-2xl overflow-hidden shadow-2xl"
                >
                  <div className="bg-indigo-600/10 border-b border-white/5 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-indigo-400" />
                      <h3 className="text-sm font-semibold text-indigo-100">AI Analysis</h3>
                    </div>
                    <div className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                      getSeverityColor(currentResult.analysis.severity)
                    )}>
                      {currentResult.analysis.severity}
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-6">
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Summary</h4>
                      <p className="text-gray-200 leading-relaxed">{currentResult.analysis.summary}</p>
                    </div>

                    <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                      <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Bug className="w-3 h-3" />
                        Root Cause
                      </h4>
                      <p className="text-gray-300 text-sm leading-relaxed">{currentResult.analysis.cause}</p>
                    </div>

                    <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-4">
                      <h4 className="text-xs font-bold text-green-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Lightbulb className="w-3 h-3" />
                        Suggested Solution
                      </h4>
                      <p className="text-gray-300 text-sm leading-relaxed">{currentResult.analysis.solution}</p>
                    </div>

                    <div className="flex justify-end">
                      <button 
                        onClick={() => copyToClipboard(JSON.stringify(currentResult.analysis, null, 2))}
                        className="text-[10px] text-gray-500 hover:text-indigo-400 flex items-center gap-1.5 transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        Copy as JSON
                      </button>
                    </div>
                  </div>
                  <div ref={resultsEndRef} />
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* History Sidebar */}
          <aside className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-2">
              <History className="w-4 h-4" />
              Recent Analyses
            </div>
            
            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 custom-scrollbar">
              {results.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl">
                  <p className="text-sm text-gray-600 italic">No history yet</p>
                </div>
              ) : (
                results.map((result) => (
                  <motion.button
                    key={result.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => setCurrentResult(result)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border transition-all group",
                      currentResult?.id === result.id 
                        ? "bg-indigo-600/10 border-indigo-500/30" 
                        : "bg-[#16161a] border-white/5 hover:border-white/10"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {result.analysis.severity === 'Critical' ? (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        ) : result.analysis.severity === 'Warning' ? (
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                        <span className="text-[10px] text-gray-500 font-mono">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-gray-500 transition-colors" />
                    </div>
                    <p className="text-xs text-gray-400 font-mono line-clamp-2 bg-black/20 p-2 rounded border border-white/5">
                      {result.logPreview}
                    </p>
                  </motion.button>
                ))
              )}
            </div>
          </aside>
        </main>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
