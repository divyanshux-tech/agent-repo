/**
 * ChatMessage — Rich renderer for all message types
 *
 * Supports:
 *  - role=user     : right-aligned bubble
 *  - role=agent    : left-aligned bubble with markdown rendering
 *  - role=thinking : animated dots with optional text
 *  - role=tool_steps: progress steps list
 *  - role=cards    : (handled by NuraAgentDashboard, not here)
 *
 * Markdown rendering:
 *  - **bold** → <strong>
 *  - _italic_ → <em>
 *  - • / - / * bullet list items
 *  - numbered 1. 2. lists
 *  - `code` → inline code
 *  - ₹ amounts highlighted in green
 */
import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, ExternalLink } from 'lucide-react';

// ── Typewriter hook ──────────────────────────────────────────────────────────
function useTypewriter(text, speed = 18, enabled = true) {
  const [displayed, setDisplayed] = useState(enabled ? '' : text);
  const idx = useRef(0);

  useEffect(() => {
    if (!enabled) { setDisplayed(text); return; }
    idx.current = 0;
    setDisplayed('');
    const iv = setInterval(() => {
      idx.current += 1;
      setDisplayed(text.slice(0, idx.current));
      if (idx.current >= text.length) clearInterval(iv);
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed, enabled]);

  return displayed;
}

// ── Markdown-lite renderer ───────────────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let listItems = [];
  let orderedItems = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length) {
      elements.push(
        <ul key={key++} className="space-y-1 my-2 pl-1">
          {listItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[14px] text-[#1A1A1A] leading-relaxed">
              <span className="text-[#FF4D79] mt-0.5 shrink-0 text-[10px]">●</span>
              <span dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
    if (orderedItems.length) {
      elements.push(
        <ol key={key++} className="space-y-1 my-2 pl-1 list-none">
          {orderedItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[14px] text-[#1A1A1A] leading-relaxed">
              <span className="text-[#FF4D79] shrink-0 font-mono text-[12px] font-bold min-w-[18px] mt-0.5">{i + 1}.</span>
              <span dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
            </li>
          ))}
        </ol>
      );
      orderedItems = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Bullet list
    if (/^[•\-\*]\s+/.test(trimmed)) {
      flushList(); // flush ordered if switching
      listItems.push(trimmed.replace(/^[•\-\*]\s+/, ''));
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      flushList(); // flush unordered if switching
      orderedItems.push(trimmed.replace(/^\d+\.\s+/, ''));
      continue;
    }

    // Non-list line — flush any pending list first
    flushList();

    if (!trimmed) {
      elements.push(<div key={key++} className="h-1.5" />);
      continue;
    }

    // Headings ##
    if (trimmed.startsWith('## ')) {
      elements.push(
        <div key={key++} className="font-semibold text-[15px] text-[#1A1A1A] mt-3 mb-1">
          {trimmed.slice(3)}
        </div>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      elements.push(
        <div key={key++} className="font-bold text-[16px] text-[#1A1A1A] mt-3 mb-1">
          {trimmed.slice(2)}
        </div>
      );
      continue;
    }

    // Normal paragraph
    elements.push(
      <p key={key++} className="text-[13px] font-thin tracking-wide antialiased text-[#222] leading-relaxed"
        dangerouslySetInnerHTML={{ __html: inlineFormat(trimmed) }} />
    );
  }

  // Flush any trailing list
  flushList();

  return <div className="space-y-0.5">{elements}</div>;
}

function inlineFormat(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-black/6 text-[#D83B8F] px-1.5 py-0.5 rounded-md text-[12px] font-mono">$1</code>')
    .replace(/(₹[\d,]+(?:\s*(?:–|-)\s*₹[\d,]+)?)/g, '<span class="text-[#10B981] font-semibold">$1</span>')
    .replace(/(\d+(?:\.\d+)?)\s*(km|hrs?|min|days?|nights?|persons?|people)/gi, '<span class="font-medium text-[#3A7BD5]">$1 $2</span>');
}

// ── Source chip ──────────────────────────────────────────────────────────────
const SourceChip = ({ source }) => (
  <a
    href={source.url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-black/[0.08] rounded-xl text-[11px] text-[#555] hover:text-[#FF4D79] hover:border-[#FF4D79]/30 transition-colors shadow-sm"
  >
    <Globe size={10} className="shrink-0 opacity-60" />
    <span className="truncate max-w-[120px]">{source.title || new URL(source.url).hostname}</span>
    <ExternalLink size={9} className="shrink-0 opacity-40" />
  </a>
);

// ── Tool step indicator ──────────────────────────────────────────────────────
const ToolStep = ({ step }) => (
  <div className="flex items-center gap-2">
    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${step.status === 'done' ? 'bg-[#10B981]' : step.status === 'error' ? 'bg-red-400' : 'bg-[#FF4D79] animate-pulse'}`} />
    <span className="text-[12px] text-[#777] font-sans">{step.message}</span>
  </div>
);

// ── Thinking bubble ──────────────────────────────────────────────────────────
const ThinkingBubble = ({ text }) => (
  <div className="flex items-center gap-3 bg-gradient-to-r from-[#FF6B4A]/8 to-[#A23CFD]/8 border border-[#FF6B4A]/15 px-4 py-3 rounded-2xl rounded-tl-sm max-w-[75%]">
    <div className="flex gap-1 shrink-0">
      {[0, 150, 300].map(d => (
        <div key={d} className="w-1.5 h-1.5 bg-[#FF4D79] rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
      ))}
    </div>
    {text && <p className="text-[13px] text-[#666] italic leading-relaxed">{text}</p>}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// Main ChatMessage Component
// ═══════════════════════════════════════════════════════════════════════════════
export const ChatMessage = ({ msg, animate = true }) => {
  // Thinking
  if (msg.role === 'thinking') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="self-start"
      >
        <ThinkingBubble text={msg.content} />
      </motion.div>
    );
  }

  // Tool steps
  if (msg.role === 'tool_steps') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="self-start flex flex-col gap-1.5 py-1"
      >
        {(msg.steps || []).map((step, i) => (
          <ToolStep key={i} step={step} />
        ))}
      </motion.div>
    );
  }

  // User message
  if (msg.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="self-end"
      >
        <div className={`bg-white/90 backdrop-blur-md border border-black/[0.06] px-5 py-3.5 rounded-2xl rounded-tr-sm shadow-sm max-w-[75%] text-[13px] font-thin tracking-wide antialiased text-[#222] leading-relaxed ${msg.isInterim ? 'opacity-50 italic' : ''}`}>
          {msg.content}
        </div>
      </motion.div>
    );
  }

  // Agent / knowledge message
  if (msg.role === 'agent' || msg.role === 'knowledge') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const displayed = useTypewriter(msg.content || '', 12, animate && !msg._typed);
    const hasWebSources = msg.webSources?.length > 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="self-start flex flex-col gap-2 max-w-[82%]"
      >
        <div className={`backdrop-blur-md border px-5 py-4 rounded-2xl rounded-tl-sm shadow-sm ${msg.isError ? 'bg-red-50 border-red-200' : 'bg-white/85 border-black/[0.06]'}`}>
          {renderMarkdown(displayed || msg.content)}
        </div>

        {/* Web source chips */}
        {hasWebSources && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-1.5"
            >
              <span className="text-[10px] font-bold tracking-widest text-[#888] uppercase mr-1 self-center">Sources</span>
              {msg.webSources.slice(0, 4).map((src, i) => (
                <SourceChip key={i} source={src} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </motion.div>
    );
  }

  return null;
};
