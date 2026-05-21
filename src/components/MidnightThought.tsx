import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

const THOUGHTS = [
  "Maybe some people exist only as unfinished sentences in our lives.",
  "The hardest part of moving on is not looking back at the house you set on fire.",
  "Silence is just the sound of things we're too afraid to say out loud.",
  "We are all just stories waiting for someone to read between our lines.",
  "The stars are just holes in the ceiling of the world, letting the light of the void in.",
  "Some nights, loneliness sounds exactly like your own voice.",
  "I am a collection of everyone I have ever loved and everyone who has ever left.",
  "We don't lose people, we just lose the version of them we knew.",
  "Echoes are just ghosts of sounds that refuse to die.",
  "The moon is a reminder that even when we are empty, we are still complete."
];

export function MidnightThought() {
  const [thought, setThought] = useState("");
  const { theme } = useTheme();

  useEffect(() => {
    const randomThought = THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)];
    setThought(randomThought);
  }, []);

  return (
    <div className="py-12 flex justify-center">
      <AnimatePresence mode="wait">
        {thought && (
          <motion.div
            key={thought}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="max-w-md text-center px-6"
          >
            <span className={cn(
              "font-serif italic text-lg md:text-xl leading-relaxed block",
              theme === 'dark' ? "text-purple-400/60" : "text-purple-600/60"
            )}>
              “{thought}”
            </span>
            <div className="mt-4 flex justify-center">
               <div className="w-8 h-px bg-purple-500/20" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
