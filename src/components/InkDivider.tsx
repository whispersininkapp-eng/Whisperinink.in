import React from 'react';
import { motion } from 'motion/react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

export function InkDivider() {
  const { theme } = useTheme();

  return (
    <div className="relative w-full py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-12 relative h-12 flex items-center justify-center">
        {/* The organic ink line */}
        <motion.svg 
          viewBox="0 0 1200 60" 
          className={cn(
            "w-full h-full preserve-3d opacity-20",
            theme === 'dark' ? "text-purple-500" : "text-purple-900"
          )}
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 0.2 }}
          viewport={{ once: true }}
          transition={{ duration: 2, ease: "easeInOut" }}
        >
          <path 
            d="M0 35 Q 120 15, 280 40 T 580 25 T 880 45 T 1200 30" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.2" 
            strokeLinecap="round"
            className="filter blur-[0.3px]"
          />
          {/* Subtle staggered ink blotches */}
          <motion.circle 
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 4, repeat: Infinity }}
            cx="120" cy="15" r="1.5" fill="currentColor" 
          />
          <circle cx="480" cy="38" r="1" fill="currentColor" opacity="0.3" />
          <motion.circle 
            animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 6, repeat: Infinity }}
            cx="780" cy="22" r="2.5" fill="currentColor" 
          />
          <circle cx="1100" cy="42" r="1.2" fill="currentColor" opacity="0.5" />
          
          {/* Vertical ink drips */}
          <rect x="300" y="30" width="0.5" height="15" fill="currentColor" opacity="0.1" />
          <rect x="850" y="45" width="0.5" height="10" fill="currentColor" opacity="0.1" />
        </motion.svg>

        {/* Floating signature element */}
        <div className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-12 transition-colors duration-700",
          theme === 'dark' ? "bg-[#08080a]" : "bg-[#f8f5f2]"
        )}>
          <motion.span 
            animate={{ 
              opacity: [0.2, 0.5, 0.2],
              filter: ["blur(0px)", "blur(0.5px)", "blur(0px)"]
            }}
            transition={{ 
              duration: 5, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="font-serif italic text-3xl text-purple-500/30 select-none tracking-widest block"
          >
            Whispers
          </motion.span>
        </div>
      </div>
    </div>
  );
}
