import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Feather, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

interface AnimatedLoaderProps {
  fullScreen?: boolean;
  message?: string;
}

const literaryQuotes = [
  "Awakening silent whispers...",
  "Dipping the quill in dynamic ink...",
  "Gathering stray fragments of thought...",
  "Stretching the digital canvas...",
  "Attuning to the universe's frequency...",
  "Listening to the echoes of dreams...",
  "Weaving threads of inspiration..."
];

export function AnimatedLoader({ fullScreen = true, message }: AnimatedLoaderProps) {
  const { theme } = useTheme();
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    if (message) return;
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % literaryQuotes.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [message]);

  const displayMessage = message || literaryQuotes[quoteIndex];

  return (
    <div
      id="animated-loader"
      className={cn(
        "flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-500",
        fullScreen ? "fixed inset-0 z-50 min-h-screen w-screen" : "w-full py-20 min-h-[300px]",
        theme === 'dark' ? "bg-[#08080a] text-zinc-100" : "bg-[#f8f5f2] text-[#1a1a1a]"
      )}
    >
      {/* Background ambient lighting glow (delicate purple) */}
      <AnimatePresence>
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.08, 0.15, 0.08],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[100px]"
            style={{
              background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)',
            }}
          />
        </div>
      </AnimatePresence>

      {/* Subtle paper grain texture */}
      {fullScreen && (
        <div className="grain pointer-events-none opacity-[0.03] dark:opacity-[0.05]" />
      )}

      {/* Main loading element container */}
      <div className="z-10 flex flex-col items-center gap-8 px-6 text-center max-w-md">
        
        {/* Animated Icon Ring */}
        <div className="relative flex items-center justify-center">
          
          {/* Inner breathing circle */}
          <motion.div
            animate={{
              scale: [0.95, 1.08, 0.95],
              opacity: [0.4, 0.8, 0.4],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute w-20 h-20 rounded-full border border-purple-500/20 dark:border-purple-500/10 bg-purple-500/5"
          />

          {/* Outer elegant dash ring (spinning slowly) */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute w-24 h-24 rounded-full border border-dashed border-purple-500/30 dark:border-purple-400/20"
          />

          {/* Golden/Purple core bubble */}
          <motion.div
            className="relative w-16 h-16 rounded-full flex items-center justify-center bg-linear-to-tr from-purple-600/10 to-pink-500/10 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-500/30 shadow-xs"
            whileHover={{ scale: 1.05 }}
          >
            <motion.div
              animate={{
                y: [0, -4, 0],
                rotate: [0, 5, -5, 0]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="text-purple-500 dark:text-purple-400"
            >
              <Feather className="w-7 h-7 stroke-[1.25]" />
            </motion.div>

            {/* Glowing sparkle orbit */}
            <motion.div
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute inset-0 pointer-events-none"
            >
              <motion.div
                animate={{
                  scale: [0.8, 1.2, 0.8],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
                className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 text-purple-400"
              >
                <Sparkles className="w-3.5 h-3.5 fill-purple-400/20" />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        {/* Poetic typewriter-glowing message */}
        <div className="h-12 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={displayMessage}
              initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="font-serif italic text-base md:text-lg text-zinc-500 dark:text-zinc-400 tracking-wide font-light"
            >
              {displayMessage}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Elegant glowing line track progress bar */}
        <div className="w-36 h-[2px] bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden relative">
          <motion.div
            animate={{
              left: ["-100%", "100%"]
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-0 bottom-0 w-2/3 bg-linear-to-r from-transparent via-purple-500 to-transparent"
          />
        </div>
      </div>
    </div>
  );
}
