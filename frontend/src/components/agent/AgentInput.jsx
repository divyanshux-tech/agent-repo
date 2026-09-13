import React, { useState, useRef } from 'react';
import { Send, PlusSquare, Mic, AudioLines } from 'lucide-react';
import { cn } from '../../utils/cn';

export const AgentInput = ({ onSubmit, isLoading, placeholder = "Describe your trip idea..." }) => {
  const [inputValue, setInputValue] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recognitionRef = useRef(null);

  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else if (file) {
      alert("Only PDF files are supported for RAG upload.");
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim() || selectedFile) {
      onSubmit?.(inputValue, false, selectedFile);
      setInputValue('');
      removeFile();
    }
  };

  const toggleTranscription = () => {
    if (isTranscribing) {
      recognitionRef.current?.stop();
      setIsTranscribing(false);
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech recognition is not supported in this browser.");
        return;
      }
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';
      
      let startText = inputValue;

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        const currentInput = startText + (startText && finalTranscript ? ' ' : '') + finalTranscript;
        setInputValue(currentInput + (interimTranscript ? ' ' + interimTranscript : ''));
        
        if (finalTranscript) {
          startText = currentInput;
        }
      };

      recognition.onerror = (e) => {
        console.error('Transcription error:', e.error);
        setIsTranscribing(false);
      };

      recognition.onend = () => {
        setIsTranscribing(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsTranscribing(true);
    } catch (e) {
      console.error(e);
      setIsTranscribing(false);
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes gradient-stream {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .animate-stream {
            background-size: 200% 200%;
            animation: gradient-stream 4s ease infinite;
          }
        `}
      </style>
      <div className="relative w-full rounded-[26px] p-[2px] group flex flex-col gap-2">
        
        {/* File Preview Chip */}
        {selectedFile && (
          <div className="self-start ml-4 bg-white/95 backdrop-blur-md border border-black/10 px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2 text-[12px] font-medium text-gray-700 animate-in fade-in slide-in-from-bottom-2">
            <span className="text-[#A23CFD]">📄</span>
            <span className="truncate max-w-[150px]">{selectedFile.name}</span>
            <button type="button" onClick={removeFile} className="text-gray-400 hover:text-red-500 ml-1">
              ✕
            </button>
          </div>
        )}

        {/* Streaming Gradient Glow Layers */}
        <div className="absolute -inset-[1px] bg-gradient-to-r from-[#FF4D79] via-[#A23CFD] to-[#FF8A65] rounded-[26px] opacity-100 blur-[2px] animate-stream z-0"></div>
        <div className="absolute -inset-[4px] bg-gradient-to-r from-[#FF4D79] via-[#A23CFD] to-[#FF8A65] rounded-[26px] opacity-40 blur-[8px] animate-stream z-0"></div>

        {/* Main Input Form */}
        <form 
          onSubmit={handleSubmit}
          className="relative z-10 flex flex-col w-full bg-white/95 backdrop-blur-xl rounded-[24px] p-2 shadow-2xl"
        >
          <div className="relative flex items-center w-full">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isTranscribing ? "Listening..." : placeholder}
              className="w-full bg-transparent outline-none border-none text-nura-dark text-[15px] font-sans placeholder:text-[#888] px-5 py-3 pr-12"
            />
            {/* Transcription Mic Button (Inside Input) */}
            <button
              type="button"
              onClick={toggleTranscription}
              className={cn(
                "absolute right-2 flex items-center justify-center w-[32px] h-[32px] rounded-full transition-colors",
                isTranscribing ? "bg-red-100 text-red-500 animate-pulse" : "text-[#555] hover:bg-gray-100 hover:text-nura-dark"
              )}
              title="Dictate message"
            >
              <Mic size={18} strokeWidth={isTranscribing ? 2 : 1.5} />
            </button>
          </div>

          <div className="flex items-center justify-between px-4 pb-1 pt-1 mt-1 border-t border-black/5">
            <input type="file" accept="application/pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            <button type="button" onClick={handleUploadClick} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-black/5 hover:bg-black/10 text-gray-700 text-[10px] font-bold tracking-widest uppercase transition-colors border border-black/5 shadow-sm">
              <PlusSquare size={14} strokeWidth={2.5} />
              <span>Sign Up to Add files</span>
            </button>

            <div className="flex items-center gap-2">
              {/* Voice Agent Trigger Button */}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); onSubmit?.("", true); }}
                className="flex items-center justify-center w-[36px] h-[36px] rounded-full text-[#A23CFD] hover:bg-[#A23CFD]/10 transition-colors"
                title="Start Full Voice Agent"
              >
                <AudioLines size={20} strokeWidth={1.8} />
              </button>

              <button
                type="submit"
                disabled={isLoading || (!inputValue.trim() && !selectedFile)}
                className={cn(
                  "flex items-center justify-center w-[36px] h-[36px] rounded-full text-white transition-all duration-300 ml-1",
                  (inputValue.trim() || selectedFile) 
                    ? "bg-[#FF6B4A] hover:bg-[#ff5b36] shadow-md hover:scale-105" 
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
              >
                <Send size={16} strokeWidth={2} className={(inputValue.trim() || selectedFile) ? "ml-0.5" : ""} />
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};