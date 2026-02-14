"use client";

import React, { useState, useEffect, Suspense } from "react";
import ChatWidget from "@/components/ChatWidget";
import VoiceWidget from "@/components/VoiceWidget";
import { DEFAULT_CONFIG } from "@/constants";
import { MonitorIcon, SmartphoneIcon } from "@/components/Icons";
import { useSearchParams } from "next/navigation";
import { ChatConfig } from "@/types";

const DemoPageContent: React.FC = () => {
  const searchParams = useSearchParams();
  const siteUrlParam = searchParams.get("site");

  const initialUrl = siteUrlParam
    ? siteUrlParam.startsWith("http")
      ? siteUrlParam
      : `https://${siteUrlParam}`
    : DEFAULT_CONFIG.previewUrl;

  const [config, setConfig] = useState<ChatConfig>(DEFAULT_CONFIG);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [urlInput, setUrlInput] = useState(initialUrl);
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePromptForSite = async (url: string) => {
    setIsGenerating(true);
    setConfig(prev => ({ ...prev, previewUrl: url }));
    
    try {
      const response = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl: url })
      });

      if (response.ok) {
        const data = await response.json();
        setConfig({
          businessName: data.businessName,
          greeting: data.greeting,
          primaryColor: data.brandColor,
          previewUrl: url,
          avatarUrl: config.avatarUrl,
          systemPrompt: data.systemPrompt
        });
      }
    } catch (error) {
      console.error('Failed to generate prompt:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUrlChange = (e: React.FormEvent) => {
    e.preventDefault();
    const newUrl = urlInput.startsWith("http") ? urlInput : `https://${urlInput}`;
    generatePromptForSite(newUrl);
  };

  useEffect(() => {
    if (siteUrlParam && siteUrlParam !== DEFAULT_CONFIG.previewUrl) {
      const newUrl = siteUrlParam.startsWith("http")
        ? siteUrlParam
        : `https://${siteUrlParam}`;
      setUrlInput(newUrl);
      generatePromptForSite(newUrl);
    }
  }, [siteUrlParam]);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 overflow-hidden">
      {/* Top Navbar */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 z-20 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-pink-600 rounded-lg flex items-center justify-center text-white font-bold text-lg italic">C</div>
            <span className="text-white font-semibold text-lg hidden sm:block">Cosmetix</span>
          </div>
          
          <div className="h-8 w-px bg-slate-800 mx-2 hidden sm:block"></div>
          
          <form onSubmit={handleUrlChange} className="hidden md:flex items-center bg-slate-800 rounded-full px-4 py-1.5 gap-2 w-80">
            <span className="text-slate-500 text-xs">https://</span>
            <input 
              type="text" 
              value={urlInput.replace(/^https?:\/\//, '')}
              onChange={(e) => setUrlInput(e.target.value)}
              className="bg-transparent border-none text-slate-300 text-sm focus:ring-0 w-full outline-none"
              placeholder="example.com"
            />
          </form>
        </div>

        <div className="flex items-center gap-3">
          {isGenerating && (
            <div className="flex items-center gap-2 text-pink-400 text-xs">
              <div className="w-4 h-4 border-2 border-pink-400 border-t-transparent rounded-full animate-spin"></div>
              Analyzing site...
            </div>
          )}
          
          <div className="flex bg-slate-800 rounded-lg p-1">
            <button 
              onClick={() => setViewMode("desktop")}
              className={`p-1.5 rounded ${viewMode === "desktop" ? "bg-slate-700 text-pink-400 shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
              title="Desktop Preview"
            >
              <MonitorIcon className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode("mobile")}
              className={`p-1.5 rounded ${viewMode === "mobile" ? "bg-slate-700 text-pink-400 shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
              title="Mobile Preview"
            >
              <SmartphoneIcon className="w-5 h-5" />
            </button>
          </div>
          
          <button className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-pink-600/20">
            Export Demo
          </button>
        </div>
      </header>

      {/* Main Preview Container */}
      <main className="flex-1 relative flex items-center justify-center bg-slate-950 p-4 sm:p-8">
        {/* Background Mesh */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-600 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600 rounded-full blur-[120px]"></div>
        </div>

        {/* Viewport Frame */}
        <div 
          className={`relative transition-all duration-500 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-white overflow-hidden rounded-xl ring-1 ring-slate-800 ${
            viewMode === "desktop" 
              ? "w-full h-full" 
              : "w-[375px] h-[750px] max-h-full"
          }`}
        >
          {/* Mock Browser Header */}
          {viewMode === "desktop" && (
            <div className="h-8 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
              <div className="ml-4 h-5 flex-1 bg-white rounded-md border border-slate-200 flex items-center px-3">
                <span className="text-[10px] text-slate-400 truncate">{config.previewUrl}</span>
              </div>
            </div>
          )}

          {/* Client Website Iframe */}
          <iframe 
            src={config.previewUrl} 
            className="w-full h-full border-none pointer-events-auto"
            title="Website Preview"
          />

          {/* Chat Widget */}
          <ChatWidget config={config} />

          {/* Voice Widget */}
          <VoiceWidget config={config} />
        </div>
      </main>

      {/* Footer */}
      <footer className="h-10 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-6 px-6 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
          <span className="text-slate-500 text-[10px] uppercase tracking-widest font-semibold">Live Simulation Engine</span>
        </div>
        <div className="text-slate-600 text-[11px]">
          Simulating interaction on <span className="text-slate-400">{config.previewUrl.replace(/^https?:\/\//, '')}</span>
        </div>
      </footer>
    </div>
  );
};

export default function DemoPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    }>
      <DemoPageContent />
    </Suspense>
  );
}