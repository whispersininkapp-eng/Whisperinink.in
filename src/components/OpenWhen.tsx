import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';
import { Heart, Moon, Wind, MessageSquare } from 'lucide-react';

const PROMPTS = [
  { 
    id: 'sleep', 
    title: 'Open when you can’t sleep', 
    icon: Moon,
    content: "The night is not your enemy. It's just a space for the thoughts that don't fit into the daylight. Let them breathe. They'll let you rest soon."
  },
  { 
    id: 'miss', 
    title: 'Open when you miss someone', 
    icon: Heart,
    content: "Missing them is just a sign that they are still a part of who you are. Love doesn't die; it just changes form into memory."
  },
  { 
    id: 'loud', 
    title: 'Open when life feels too loud', 
    icon: Wind,
    content: "Close your eyes. The world outside is just noise. Your internal silence is where your strength lives. Find the center."
  },
  { 
    id: 'nothing', 
    title: 'Open when you feel nothing', 
    icon: MessageSquare,
    content: "Numbness is and always was a shield. You're not empty; you're just protecting yourself. It's okay to stay behind the shield until it's safe."
  }
];

export function OpenWhen() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { theme } = useTheme();

  return (
    <section className="relative z-10 px-6 md:px-12 py-32">
      <div className="max-w-7xl mx-auto">
        <div className="mb-20 space-y-4">
           <h4 className="text-[10px] font-bold tracking-[0.5em] uppercase text-purple-500">Interactive Empathy</h4>
           <h2 className="text-5xl md:text-6xl font-serif italic">Open When...</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {PROMPTS.map((prompt) => (
            <div key={prompt.id} className="relative">
              <motion.button
                onClick={() => setActiveId(activeId === prompt.id ? null : prompt.id)}
                className={cn(
                  "w-full glass-panel p-8 rounded-[40px] text-left transition-all duration-700 relative overflow-hidden group",
                  activeId === prompt.id ? "ring-2 ring-purple-500/40 translate-y-[-4px]" : "hover:translate-y-[-4px]"
                )}
              >
                <div className="mb-6 w-12 h-12 rounded-2xl bg-purple-500/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <prompt.icon className="w-5 h-5 text-purple-500" />
                </div>
                <h3 className="text-xl font-serif italic mb-2 leading-tight">{prompt.title}</h3>
                <p className="text-[10px] tracking-widest text-zinc-500 uppercase font-bold">
                  {activeId === prompt.id ? 'Close Whisper' : 'Read Now'}
                </p>

                {/* Decorative ink spill on background */}
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-500/5 blur-3xl rounded-full group-hover:bg-purple-500/10 transition-colors" />
              </motion.button>

              <AnimatePresence>
                {activeId === prompt.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: 10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: 10 }}
                    className="overflow-hidden mt-4"
                  >
                    <div className={cn(
                      "p-8 rounded-[32px] font-serif italic text-lg leading-relaxed border",
                      theme === 'dark' ? "bg-white/[0.02] border-white/5 text-zinc-400" : "bg-black/[0.02] border-black/5 text-zinc-600"
                    )}>
                       “{prompt.content}”
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
