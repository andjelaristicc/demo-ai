import React, { useState, useRef, useEffect } from 'react';
import { ChatConfig } from '@/types';
import { MicIcon, PhoneIcon, StopIcon, XIcon } from './Icons';
import Waveform from './Waveform';
import TranscriptionPanel from './TranscriptionPanel';

interface TranscriptionMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
}

interface VoiceWidgetProps {
  config: ChatConfig;
}

const VoiceWidget: React.FC<VoiceWidgetProps> = ({ config }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [messages, setMessages] = useState<TranscriptionMessage[]>([]);
  const [audioAmplitude, setAudioAmplitude] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPromptReady, setIsPromptReady] = useState(false);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isActiveRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const messagesRef = useRef<TranscriptionMessage[]>([]);
  const systemPromptRef = useRef<string>('');

  // Keep all refs in sync with state
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Track when systemPrompt is ready
  useEffect(() => {
    if (config.systemPrompt && config.systemPrompt.length > 100) {
      systemPromptRef.current = config.systemPrompt;
      setIsPromptReady(true);
      console.log('✅ Prompt ready:', config.systemPrompt.length, 'chars');
    } else {
      systemPromptRef.current = '';
      setIsPromptReady(false);
    }
  }, [config.systemPrompt]);

  // Setup speech recognition ONCE on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported');
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript.trim();
      
      if (event.results[current].isFinal && transcript) {
        // Ignore if AI is speaking (prevent feedback loop)
        if (isSpeakingRef.current) {
          console.log('🔇 Ignored (AI speaking):', transcript);
          return;
        }

        console.log('🎤 User said:', transcript);
        
        setMessages(prev => [...prev, {
          id: 'user-' + Date.now(),
          text: transcript,
          sender: 'user',
          timestamp: Date.now()
        }]);
        
        handleVoiceInput(transcript);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      if (event.error === 'no-speech') return; // Ignore no-speech
      console.error('Speech error:', event.error);
    };

    recognitionRef.current.onend = () => {
      // Only restart if active and not speaking
      if (isActiveRef.current && !isSpeakingRef.current) {
        setTimeout(() => {
          if (isActiveRef.current && !isSpeakingRef.current) {
            try {
              recognitionRef.current?.start();
            } catch (e) {}
          }
        }, 300);
      }
    };

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          recognitionRef.current.abort();
        } catch (e) {}
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []); // ✅ Only runs ONCE on mount - no dependencies

  const handleVoiceInput = async (text: string) => {
    try {
      // Stop listening immediately
      try {
        recognitionRef.current?.stop();
      } catch (e) {}

      setIsSpeaking(true);
      isSpeakingRef.current = true;

      console.log('🎤 Sending:', text);
      console.log('📋 Prompt length:', systemPromptRef.current?.length);

      const response = await fetch('/api/gpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          systemPrompt: systemPromptRef.current, // ✅ Always fresh via ref
          conversationHistory: messagesRef.current.map(m => ({ // ✅ Always fresh via ref
            role: m.sender === 'ai' ? 'assistant' : 'user',
            content: m.text
          }))
        })
      });

      if (!response.ok) throw new Error(`API failed: ${response.status}`);

      const data = await response.json();
      console.log('🤖 Response:', data.response);
      
      setMessages(prev => [...prev, {
        id: 'ai-' + Date.now(),
        text: data.response,
        sender: 'ai',
        timestamp: Date.now()
      }]);
      
      await speakTextElevenLabs(data.response);

    } catch (error) {
      console.error('❌ Error:', error);
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      
      // Resume listening on error
      if (isActiveRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch (e) {}
        }, 800);
      }
    }
  };

  const speakTextElevenLabs = async (text: string) => {
    try {
      setAudioAmplitude(0.7);

      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      const response = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) throw new Error('Voice API failed');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onplay = () => setAudioAmplitude(0.8);

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
        
        // Check if call is still active
        if (!isActiveRef.current) {
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          setAudioAmplitude(0);
          return;
        }
        
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        setAudioAmplitude(0);
        
        // Resume listening after AI finishes
        setTimeout(() => {
          if (isActiveRef.current && !isSpeakingRef.current) {
            try {
              recognitionRef.current?.start();
              console.log('🎤 Resumed listening');
            } catch (e) {}
          }
        }, 500);
      };

      await audio.play();

    } catch (error) {
      console.error('Voice error:', error);
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      setAudioAmplitude(0);
      
      if (isActiveRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch (e) {}
        }, 800);
      }
    }
  };

  const handleStart = async () => {
    if (!recognitionRef.current) {
      alert('Speech recognition not supported. Use Chrome or Edge.');
      return;
    }

    if (!isPromptReady) {
      alert('Please wait - still analyzing the website...');
      return;
    }

    setIsConnecting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      
      source.connect(analyser);
      analyser.fftSize = 256;
      
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateAmplitude = () => {
        if (analyser && isActiveRef.current) {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          if (!isSpeakingRef.current) {
            setAudioAmplitude(average / 255);
          }
          animationFrameRef.current = requestAnimationFrame(updateAmplitude);
        }
      };
      updateAmplitude();

      recognitionRef.current.start();
      setIsActive(true);
      setIsConnecting(false);
      console.log('🎤 Call started');
    } catch (err) {
      console.error(err);
      alert('Microphone access denied');
      setIsConnecting(false);
    }
  };

  const handleStop = () => {
    console.log('🛑 Call stopped');
    
    // Set refs immediately - don't wait for state
    isActiveRef.current = false;
    isSpeakingRef.current = false;
    
    setIsActive(false);
    setIsSpeaking(false);

    try {
      recognitionRef.current?.stop();
      recognitionRef.current?.abort();
    } catch (e) {}

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }

    audioContextRef.current = null;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }

    setAudioAmplitude(0);
    setMessages([]);
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-28 right-6 z-50 flex items-center justify-center w-16 h-16 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 ${
          isOpen 
            ? 'bg-white text-slate-950 ring-2 ring-white' 
            : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
        }`}
      >
        <PhoneIcon className="w-6 h-6" />
      </button>

      {/* Voice Panel */}
      {isOpen && (
        <div className="fixed bottom-28 right-6 z-50 w-[380px] max-w-[calc(100vw-32px)] flex flex-col bg-slate-900/95 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="p-5 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="relative group">
                <div className={`absolute -inset-1.5 bg-pink-500 rounded-full blur-md opacity-20 group-hover:opacity-40 transition-opacity ${isActive ? 'animate-pulse scale-110 opacity-60' : ''}`}></div>
                <img 
                  src={config.avatarUrl} 
                  alt="AI" 
                  className={`relative w-11 h-11 rounded-full object-cover border-2 ${isActive ? 'border-pink-500' : 'border-white/20'}`} 
                />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">{config.businessName} Assistant</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`}></span>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    {isSpeaking ? 'AI Speaking' : isActive ? 'Listening' : 'Standby'}
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => { handleStop(); setIsOpen(false); }}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all hover:scale-110"
            >
              <XIcon className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Main Area */}
          <div className="p-6 flex flex-col gap-6">
            {isActive ? (
              <>
                <div className="bg-black/20 rounded-2xl p-6 border border-white/5 flex flex-col items-center justify-center gap-4">
                  <Waveform isActive={isActive || isSpeaking} amplitude={audioAmplitude} color="bg-pink-500" />
                  <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest flex items-center gap-2">
                    <div className="w-1 h-1 bg-pink-500 rounded-full animate-ping"></div>
                    {isSpeaking ? 'AI Responding' : 'Listening...'}
                  </div>
                </div>

                <div className="h-44">
                  <TranscriptionPanel messages={messages} />
                </div>

                <button 
                  onClick={handleStop}
                  className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-red-500/20 active:scale-95"
                >
                  <StopIcon className="w-5 h-5" /> End Call
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-6 py-4 text-center">
                <div className="w-24 h-24 bg-pink-600/10 rounded-full flex items-center justify-center border border-pink-500/20 relative">
                  <MicIcon className="w-10 h-10 text-pink-500" />
                  <div className="absolute inset-0 rounded-full border border-pink-500/10 animate-[ping_3s_infinite]"></div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="text-white text-lg font-bold tracking-tight">How can I help you today?</h4>
                  <p className="text-xs text-slate-400 leading-relaxed px-4">
                    Start a voice conversation with {config.businessName}. Speak naturally!
                  </p>
                </div>

                <button 
                  onClick={handleStart}
                  disabled={isConnecting || !isPromptReady}
                  className="w-full py-4 bg-gradient-to-r from-pink-600 to-pink-500 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-pink-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isConnecting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : !isPromptReady ? (
                    <>⏳ Analyzing Website...</>
                  ) : (
                    <><PhoneIcon className="w-5 h-5" /> Start Call</>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/5 bg-black/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Natural Voice AI</span>
            </div>
            <span className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">ElevenLabs</span>
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceWidget;