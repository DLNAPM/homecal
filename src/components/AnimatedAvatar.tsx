import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

export default function AnimatedAvatar({ isSpeaking }: { isSpeaking: boolean }) {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1000,
    height: typeof window !== 'undefined' ? window.innerHeight : 1000,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <motion.div 
      className={`fixed bottom-6 right-6 z-50 cursor-grab active:cursor-grabbing transition-transform duration-300 ${isSpeaking ? 'scale-110' : 'scale-100'}`}
      drag
      dragConstraints={{ 
        left: -windowSize.width + 120, 
        right: 0, 
        top: -windowSize.height + 120, 
        bottom: 0 
      }}
      dragElastic={0.1}
      dragMomentum={false}
      whileHover={{ scale: isSpeaking ? 1.15 : 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {isSpeaking && (
        <div className="absolute -top-8 -left-4 bg-white px-3 py-1 rounded-full shadow-md text-xs font-bold text-blue-600 animate-bounce whitespace-nowrap pointer-events-none">
          Speaking...
        </div>
      )}
      <svg width="120" height="120" viewBox="0 0 120 120" className={`pointer-events-none ${isSpeaking ? 'animate-[bob_1s_ease-in-out_infinite]' : ''}`}>
        <style>
          {`
            @keyframes talk {
              0%, 100% { transform: scaleY(0.2); }
              50% { transform: scaleY(1.2); }
            }
            @keyframes blink {
              0%, 96%, 100% { transform: scaleY(1); }
              98% { transform: scaleY(0.1); }
            }
            @keyframes bob {
              0%, 100% { transform: translateY(0px) rotate(0deg); }
              25% { transform: translateY(-4px) rotate(-3deg); }
              75% { transform: translateY(-4px) rotate(3deg); }
            }
            .mouth-talk { animation: talk 0.2s infinite alternate; transform-origin: 60px 75px; }
            .eye-blink { animation: blink 4s infinite; transform-origin: 60px 50px; }
          `}
        </style>
        
        {/* Headphones Band */}
        <path d="M 20 60 A 40 40 0 0 1 100 60" fill="none" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
        
        {/* Clock Body (Face) */}
        <circle cx="60" cy="60" r="35" fill="#ffffff" stroke="#0f172a" strokeWidth="6" />
        
        {/* Clock Ticks */}
        <line x1="60" y1="30" x2="60" y2="35" stroke="#cbd5e1" strokeWidth="2" />
        <line x1="60" y1="85" x2="60" y2="90" stroke="#cbd5e1" strokeWidth="2" />
        <line x1="30" y1="60" x2="35" y2="60" stroke="#cbd5e1" strokeWidth="2" />
        <line x1="85" y1="60" x2="90" y2="60" stroke="#cbd5e1" strokeWidth="2" />

        {/* Clock Hands (acting like a little nose) */}
        <line x1="60" y1="60" x2="60" y2="48" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
        <line x1="60" y1="60" x2="68" y2="60" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
        <circle cx="60" cy="60" r="3" fill="#0f172a" />

        {/* Eyes */}
        <g className="eye-blink">
          <circle cx="48" cy="50" r="4.5" fill="#0f172a" />
          <circle cx="72" cy="50" r="4.5" fill="#0f172a" />
        </g>

        {/* Mouth */}
        {isSpeaking ? (
          <ellipse cx="60" cy="75" rx="8" ry="6" fill="#0f172a" className="mouth-talk" />
        ) : (
          <path d="M 52 72 Q 60 78 68 72" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
        )}

        {/* Headphones Earcups */}
        <rect x="10" y="45" width="14" height="30" rx="6" fill="#3b82f6" />
        <rect x="96" y="45" width="14" height="30" rx="6" fill="#3b82f6" />
        <rect x="14" y="40" width="6" height="40" rx="3" fill="#1d4ed8" />
        <rect x="100" y="40" width="6" height="40" rx="3" fill="#1d4ed8" />
      </svg>
    </motion.div>
  );
}
