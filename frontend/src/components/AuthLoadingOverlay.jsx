import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const messages = [
  "Authenticating credentials...",
  "Establishing secure enclave...",
  "Decrypting session tokens...",
  "Entering CYPHR Workspace..."
];

const AuthLoadingOverlay = ({ isVisible }) => {
  const [msgIndex, setMsgIndex] = useState(0);
  const [show, setShow] = useState(isVisible);
  const [isRendered, setIsRendered] = useState(isVisible);

  useEffect(() => {
    if (isVisible) {
      setIsRendered(true);
      setTimeout(() => setShow(true), 10);
      setMsgIndex(0);
    } else {
      setShow(false);
      const timer = setTimeout(() => setIsRendered(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  useEffect(() => {
    if (!show) return;
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1 < messages.length ? prev + 1 : prev));
    }, 550);
    return () => clearInterval(interval);
  }, [show]);

  if (!isRendered) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 backdrop-blur-xl transition-all duration-500 ${show ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
      <div className="relative flex flex-col items-center justify-center p-10 rounded-3xl border border-teal-500/20 bg-slate-900/50 shadow-2xl shadow-teal-500/10">
        <div className="relative flex items-center justify-center w-32 h-32 mb-8">
          {/* Outer Ring */}
          <div className="absolute w-32 h-32 rounded-full border-t-2 border-r-2 border-teal-500 animate-[spin_3s_linear_infinite]"></div>
          {/* Middle Ring */}
          <div className="absolute w-24 h-24 rounded-full border-b-2 border-l-2 border-cyan-400 animate-[spin_2s_linear_infinite_reverse]"></div>
          {/* Core Glow */}
          <div className="absolute w-16 h-16 bg-gradient-to-tr from-cyan-500 to-emerald-500 rounded-full blur-md opacity-40 animate-pulse"></div>
          {/* Icon */}
          <Loader2 className="w-10 h-10 text-white animate-spin relative z-10" />
        </div>
        <h3 className="text-teal-400 font-medium tracking-widest uppercase text-sm animate-pulse h-5">
          {messages[msgIndex]}
        </h3>
      </div>
    </div>
  );
};

export default AuthLoadingOverlay;