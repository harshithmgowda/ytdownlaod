/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Music, 
  Video, 
  PlaySquare, 
  Download, 
  X, 
  Clipboard, 
  Moon, 
  ChevronDown,
  Youtube
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type DownloadMode = 'AUDIO' | 'VIDEO' | 'V+A';

export default function App() {
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState<DownloadMode>('VIDEO');
  const [quality, setQuality] = useState('1080p (Full HD)');
  const [format, setFormat] = useState('MP4');
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState('');

  const handleDownload = async () => {
    if (!url || isDownloading) return;
    setIsDownloading(true);
    setProgress(0);
    setError('');
    setStatusText('Starting download...');

    try {
      // Start the download on the server
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, mode, quality, format }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start download');
      }

      const { downloadId } = await res.json();

      // Connect to SSE progress stream
      const eventSource = new EventSource(`/api/download/${downloadId}/progress`);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.status === 'downloading') {
          setProgress(data.progress);
          setStatusText(`Downloading... ${data.progress}%`);
        } else if (data.status === 'complete') {
          setProgress(100);
          setStatusText('Download complete! Saving file...');
          eventSource.close();

          // Trigger file download in browser
          const a = document.createElement('a');
          a.href = `/api/download/${downloadId}/file`;
          a.download = '';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          setTimeout(() => {
            setIsDownloading(false);
            setProgress(0);
            setStatusText('');
          }, 3000);
        } else if (data.status === 'error') {
          eventSource.close();
          setError(data.error || 'Download failed');
          setStatusText('');
          setIsDownloading(false);
          setProgress(0);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setError('Connection to server lost');
        setStatusText('');
        setIsDownloading(false);
        setProgress(0);
      };

    } catch (err: any) {
      setError(err.message || 'Download failed');
      setStatusText('');
      setIsDownloading(false);
      setProgress(0);
    }
  };

  const clearUrl = () => setUrl('');

  const pasteUrl = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
    } catch (err) {
      console.error('Failed to read clipboard', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0505] text-white font-sans selection:bg-brand selection:text-white flex flex-col items-center justify-center p-4">
      {/* Header */}
      <header className="w-full max-w-4xl flex flex-col items-center mb-12 relative">
        <div className="absolute top-0 right-0">
          <button className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
            <Moon className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(255,59,48,0.3)] mb-6"
        >
          <div className="w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-sm" />
        </motion.div>

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2 text-center">
          QuickTube Downloader
        </h1>
        <p className="text-brand font-bold tracking-[0.2em] text-xs">
          FAST • SIMPLE • CLEAN
        </p>
      </header>

      {/* Main Card */}
      <motion.main 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-xl bg-[#1a0b0b] border border-white/5 rounded-[2rem] p-8 md:p-10 shadow-2xl"
      >
        <div className="space-y-8">
          {/* URL Input */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-400 ml-1">Video URL</label>
            <div className="relative group">
              <input 
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste video link here..."
                className="w-full bg-[#0f0505] border border-white/5 rounded-2xl py-5 px-6 pr-24 text-lg focus:outline-none focus:border-brand/50 transition-all placeholder:text-gray-600"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {url && (
                  <button 
                    onClick={clearUrl}
                    className="p-2 text-gray-500 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
                <button 
                  onClick={pasteUrl}
                  className="p-2 text-brand hover:scale-110 transition-transform"
                >
                  <Clipboard className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-3 gap-2 bg-[#0f0505] p-1.5 rounded-2xl border border-white/5">
            <button 
              onClick={() => setMode('AUDIO')}
              className={`flex flex-col items-center justify-center py-4 rounded-xl transition-all ${mode === 'AUDIO' ? 'bg-brand text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Music className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-bold tracking-widest">AUDIO</span>
            </button>
            <button 
              onClick={() => setMode('VIDEO')}
              className={`flex flex-col items-center justify-center py-4 rounded-xl transition-all ${mode === 'VIDEO' ? 'bg-brand text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Video className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-bold tracking-widest">VIDEO</span>
            </button>
            <button 
              onClick={() => setMode('V+A')}
              className={`flex flex-col items-center justify-center py-4 rounded-xl transition-all ${mode === 'V+A' ? 'bg-brand text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <PlaySquare className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-bold tracking-widest">V + A</span>
            </button>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-500 tracking-widest uppercase ml-1">Quality</label>
              <div className="relative">
                <select 
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  className="w-full appearance-none bg-[#0f0505] border border-white/5 rounded-xl py-4 px-5 pr-10 text-sm focus:outline-none focus:border-brand/30 transition-all cursor-pointer"
                >
                  <option>1080p (Full HD)</option>
                  <option>720p (HD)</option>
                  <option>480p</option>
                  <option>360p</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-500 tracking-widest uppercase ml-1">Format</label>
              <div className="relative">
                <select 
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full appearance-none bg-[#0f0505] border border-white/5 rounded-xl py-4 px-5 pr-10 text-sm focus:outline-none focus:border-brand/30 transition-all cursor-pointer"
                >
                  <option>MP4</option>
                  <option>MKV</option>
                  <option>WEBM</option>
                  <option>MP3</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Download Button */}
          <button 
            onClick={handleDownload}
            disabled={!url || isDownloading}
            className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-bold text-lg transition-all ${
              !url ? 'bg-white/5 text-gray-600 cursor-not-allowed' : 
              isDownloading ? 'bg-brand/20 text-brand cursor-wait' : 
              'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white active:scale-[0.98]'
            }`}
          >
            <span>Download Now</span>
            <Download className="w-5 h-5" />
          </button>

          {/* Progress Bar */}
          <AnimatePresence>
            {isDownloading && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-3 pt-2"
              >
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-gray-400 italic">{statusText || 'Preparing download...'}</span>
                  <span className="text-brand font-bold">{progress}%</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-brand shadow-[0_0_10px_rgba(255,59,48,0.5)]"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400"
              >
                <p className="font-medium">⚠️ {error}</p>
                <button
                  onClick={() => setError('')}
                  className="mt-2 text-xs text-red-500 hover:text-red-300 underline"
                >
                  Dismiss
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.main>

      {/* Footer */}
      <footer className="mt-16 text-center space-y-6">
        <div className="flex items-center justify-center gap-8 text-sm font-medium text-gray-400">
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-white transition-colors">Contact</a>
        </div>
        <div className="space-y-2">
          <p className="text-gray-600 text-[11px] font-medium">
            © 2026 QuickTube Downloader. Built for efficiency.
          </p>
          <p className="text-brand/60 text-[10px] font-bold tracking-[0.1em] uppercase">
            FOR PERSONAL USE ONLY
          </p>
        </div>
      </footer>
    </div>
  );
}
