'use client'

import React, { useState, useRef, useEffect } from 'react';
import { extractMetadata } from '../utils/metadata-parser';

export default function Home() {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'json'
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setMetadata(null);
    
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else {
      setPreview(null);
    }

    try {
      const data = await extractMetadata(file);
      if (data.error) {
        setError(data.error);
      } else {
        setMetadata(data);
      }
    } catch (err) {
      setError(err.message || 'Failed to read metadata.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const formatValue = (val) => {
    if (Array.isArray(val) && val.length === 2 && typeof val[0] === 'number') {
      if (val[1] === 1) return val[0];
      if (val[1] === 0) return '0';
      return `${val[0]}/${val[1]} (${(val[0]/val[1]).toFixed(3)})`;
    }
    if (Array.isArray(val)) {
      return val.map(v => typeof v === 'object' ? JSON.stringify(v) : v).join(', ');
    }
    if (typeof val === 'object' && val !== null) {
      return JSON.stringify(val);
    }
    return String(val);
  };

  const filteredMetadata = metadata 
    ? Object.fromEntries(Object.entries(metadata).filter(([_, v]) => {
        if (v === null || v === undefined || v === '') return false;
        if (Array.isArray(v) && v.length === 0) return false;
        if (typeof v === 'object' && Object.keys(v).length === 0) return false;
        return true;
      }))
    : null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <header className="mb-16 text-center space-y-4">
          <div className="inline-flex items-center justify-center p-2 mb-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-emerald-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
            </svg>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white">
            Metadata <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Extractor</span>
          </h1>
          <p className="text-zinc-400 max-w-2xl mx-auto text-lg md:text-xl font-light">
            Instantly reveal hidden EXIF, IPTC, and XMP data from your images. 100% secure, processed locally in your browser.
          </p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Left Column: Upload & Preview */}
          <div className="lg:col-span-4 space-y-6">
            <div
              className={`relative flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-3xl transition-all duration-300 ease-out cursor-pointer group
                ${isDragging 
                  ? 'border-emerald-500 bg-emerald-500/10 scale-[1.02]' 
                  : 'border-zinc-800 hover:border-emerald-500/50 bg-zinc-900/50 hover:bg-zinc-900/80'}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFile(e.target.files[0])}
                className="hidden"
                accept="image/*"
              />
              <div className="text-center space-y-5 pointer-events-none">
                <div className={`mx-auto w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${isDragging ? 'bg-emerald-500/20 text-emerald-400 scale-110' : 'bg-zinc-800 text-zinc-400 group-hover:text-emerald-400 group-hover:bg-zinc-800/80'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-zinc-200 font-semibold text-lg">Choose a file</p>
                  <p className="text-zinc-500 text-sm mt-1">or drag and drop here</p>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs font-medium text-zinc-600 uppercase tracking-wider">
                  <span>JPEG</span> • <span>PNG</span> • <span>WEBP</span>
                </div>
              </div>
            </div>

            {preview && (
              <div className="rounded-3xl overflow-hidden bg-zinc-900/50 border border-zinc-800/80 shadow-2xl backdrop-blur-sm">
                <div className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/80 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-300 tracking-wide uppercase">Preview</h3>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                </div>
                <div className="relative aspect-square flex items-center justify-center p-6 bg-black/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Uploaded preview" className="max-w-full max-h-full object-contain rounded-xl drop-shadow-2xl" />
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-8">
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl min-h-[600px] shadow-2xl backdrop-blur-md flex flex-col relative overflow-hidden">
              
              {/* Decorative top gradient */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500/50 to-cyan-500/0"></div>

              {loading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm space-y-6">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-t-2 border-emerald-400 animate-spin"></div>
                    <div className="absolute inset-2 rounded-full border-r-2 border-cyan-400 animate-spin border-opacity-50" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                  </div>
                  <p className="text-emerald-400 font-medium tracking-widest uppercase text-sm animate-pulse">Analyzing File...</p>
                </div>
              )}

              {error && (
                <div className="m-6 p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start space-x-4">
                  <div className="p-2 bg-red-500/20 rounded-lg text-red-400 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-red-400 font-bold text-lg mb-1">Extraction Failed</h3>
                    <p className="text-red-400/80 leading-relaxed">{error}</p>
                  </div>
                </div>
              )}

              {!loading && !error && !filteredMetadata && (
                <div className="flex flex-col items-center justify-center flex-grow text-zinc-500 space-y-6 py-32 px-6 text-center">
                  <div className="p-6 rounded-full bg-zinc-800/30 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 text-zinc-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-zinc-300">Ready to Inspect</h3>
                  <p className="max-w-md text-zinc-500">Upload an image to securely read its hidden metadata tags. All processing happens entirely within your device.</p>
                </div>
              )}

              {!loading && !error && filteredMetadata && (
                <div className="flex flex-col h-full max-h-[800px]">
                  
                  {/* Results Toolbar */}
                  <div className="px-6 py-5 border-b border-zinc-800/80 bg-zinc-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 z-10 backdrop-blur-xl">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-white">Metadata Results</h2>
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold tracking-wider uppercase rounded-full border border-emerald-500/20">
                        {Object.keys(filteredMetadata).length} Tags
                      </span>
                    </div>

                    <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 shrink-0">
                      <button
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${viewMode === 'list' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                        List View
                      </button>
                      <button
                        onClick={() => setViewMode('json')}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${viewMode === 'json' ? 'bg-zinc-800 text-emerald-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                        JSON View
                      </button>
                    </div>
                  </div>

                  {/* Results Content */}
                  <div className="p-6 overflow-y-auto custom-scrollbar flex-grow">
                    {viewMode === 'list' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(metadata).map(([key, value]) => (
                          <div key={key} className="group bg-zinc-950/50 p-5 rounded-2xl border border-zinc-800/60 hover:border-emerald-500/30 hover:bg-zinc-900 transition-all duration-200">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 group-hover:bg-emerald-400 transition-colors"></div>
                              <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider truncate" title={key}>
                                {key}
                              </div>
                            </div>
                            <div className="font-mono text-sm text-zinc-200 break-words pl-3.5 leading-relaxed selection:bg-emerald-500/30">
                              {formatValue(value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-[#0d1117] rounded-2xl border border-zinc-800 p-6 overflow-x-auto shadow-inner relative group">
                        <button 
                          onClick={() => navigator.clipboard.writeText(JSON.stringify(metadata, null, 2))}
                          className="absolute top-4 right-4 p-2 bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          title="Copy JSON"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                          </svg>
                        </button>
                        <pre className="text-emerald-400/90 font-mono text-sm leading-relaxed">
                          {JSON.stringify(metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
        
        <footer className="mt-24 pt-8 border-t border-zinc-800/80 flex flex-col md:flex-row items-center justify-between gap-4 text-zinc-500 text-sm">
          <p>© {new Date().getFullYear()} Image Metadata Explorer.</p>
          <div className="flex items-center gap-6">
            <a href="https://github.com/gni/ime" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"></path></svg>
              GitHub
            </a>
          </div>
        </footer>
      </div>

      {/* Add custom scrollbar styles globally for the specific container */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(63, 63, 70, 0.4);
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(63, 63, 70, 0.8);
        }
      `}} />
    </div>
  );
}