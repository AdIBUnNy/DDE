import React, { useState, useEffect } from 'react';
import { Copy, Check, ThumbsUp, ThumbsDown, Send, MessageSquare, Bot, Sparkles } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  title: string;
  theme?: 'dark' | 'light';
  codeHeightClass?: string;
  onUpdate?: (newCode: string) => void;
  onAccept?: () => void;
  onReject?: (suggestion: string) => void;
  isAccepted?: boolean;
  isRefining?: boolean;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language = 'python', title, theme = 'dark', codeHeightClass, onUpdate, onAccept, onReject, isAccepted, isRefining }) => {
  const [copied, setCopied] = useState(false);
  const [localCode, setLocalCode] = useState(code);
  const [isRejecting, setIsRejecting] = useState(false);
  const [suggestion, setSuggestion] = useState('');

  useEffect(() => {
    setLocalCode(code);
  }, [code]);

  const handleCopy = () => {
    navigator.clipboard.writeText(localCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setLocalCode(newVal);
    if (onUpdate) onUpdate(newVal);
  };

  const handleSubmitRefinement = () => {
    if (!suggestion.trim()) return;
    if (onReject) onReject(suggestion);
    setIsRejecting(false);
    setSuggestion('');
  };

  return (
    <div className={`rounded-2xl overflow-hidden border shadow-2xl  ${theme === 'dark' ? 'bg-[#0a0a0a] border-gray-800' : 'bg-white border-gray-200'}`}>
      <div className={`flex items-center justify-between px-6 py-4 border-b transition-colors shrink-0 ${theme === 'dark' ? 'bg-[#0f0f0f] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full shadow-[0_0_8px] ${language === 'dockerfile' ? 'bg-blue-400 shadow-blue-400/50' : 'bg-emerald-400 shadow-emerald-400/50'}`}></div>
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 font-mono">{title}</span>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={handleCopy}
                className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-500 hover:text-white' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-900'}`}
                title="Copy code"
            >
                {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            </button>
        </div>
      </div>
      
      <div className={`relative flex ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}>
        <textarea
            value={localCode}
            onChange={handleCodeChange}
          className={`w-full ${codeHeightClass || 'h-[450px]'} p-8 font-mono text-[13px] leading-relaxed whitespace-pre bg-transparent border-none focus:outline-none resize-none custom-code-scrollbar transition-colors ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
            spellCheck={false}
        />
      </div>

        {(onAccept || onReject) && (
        <div className={`px-6 py-6 border-t transition-all ${theme === 'dark' ? 'bg-[#0c0f14] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
          {!isRejecting ? (
            <div className={`rounded-2xl border px-4 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 shadow-xl ${theme === 'dark' ? 'bg-gradient-to-br from-[#0f131a] via-[#0b0f14] to-[#0a0d12] border-gray-800/80' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
                <Sparkles size={16} />
                </div>
                <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-400">Architect Ready</span>
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tight">Finalize or request iterative refinement</span>
                </div>
              </div>
                    
              <div className="grid grid-cols-2 gap-2 w-full lg:w-auto">
                <button 
                  onClick={() => { if (!isAccepted && onAccept) onAccept(); }}
                  disabled={!!isAccepted}
                  className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.18em] transition-all shadow-xl ring-2 active:scale-95 ${
                    isAccepted
                      ? 'bg-emerald-500/60 text-white/80 cursor-not-allowed ring-emerald-400/20 shadow-emerald-600/10'
                      : 'bg-emerald-500 text-white hover:bg-emerald-400 ring-emerald-400/40 shadow-emerald-600/30'
                  }`}
                >
                  {isAccepted ? <Check size={16} /> : <ThumbsUp size={16} />} {isAccepted ? 'Accepted & Stored' : 'Accept & Store'}
                </button>
                <button 
                  onClick={() => setIsRejecting(true)}
                  disabled={!!isRefining}
                  className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.18em] transition-all shadow-xl ring-2 active:scale-95 ${
                    isRefining
                      ? 'bg-sky-600/60 text-white/80 cursor-not-allowed ring-sky-400/20 shadow-sky-600/10'
                      : 'bg-sky-600 text-white hover:bg-sky-500 shadow-sky-600/30 ring-sky-400/40'
                  }`}
                >
                  <ThumbsDown size={16} /> {isRefining ? 'Refining...' : 'Refine Design'}
                </button>
              </div>
            </div>
          ) : (
            <div className={`rounded-2xl border px-5 py-4 flex flex-col gap-4 max-w-4xl mx-auto animate-in slide-in-from-bottom-2 duration-300 ${theme === 'dark' ? 'bg-gradient-to-br from-[#0f131a] via-[#0b0f14] to-[#0a0d12] border-gray-800/80' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-blue-500">
                        <Bot size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">AI Feedback Agent</span>
                      </div>
                      <button 
                          onClick={() => setIsRejecting(false)}
                          className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
                      >
                          Cancel
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className={`flex-1 flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-black/40 border-gray-700 focus-within:border-blue-500' : 'bg-white border-gray-200 focus-within:border-blue-500'}`}>
                          <MessageSquare size={16} className="text-gray-500" />
                          <input 
                              type="text"
                              autoFocus
                              placeholder="Tell the AI Agent what to change in the architecture..."
                              value={suggestion}
                              onChange={(e) => setSuggestion(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSubmitRefinement()}
                              className={`bg-transparent border-none text-[12px] font-medium focus:outline-none w-full ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
                          />
                        </div>
                        <button 
                            onClick={handleSubmitRefinement}
                            className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest px-1 text-center md:text-left">The AI will regenerate the code based on your prompt and context.</p>
                </div>
            )}
        </div>
      )}

      <style>{`
        .custom-code-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-code-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-code-scrollbar::-webkit-scrollbar-thumb {
          background: #222;
          border-radius: 10px;
        }
        .custom-code-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #444;
        }
      `}</style>
    </div>
  );
};

export default CodeBlock;