import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CloudRain, VolumeX, Volume2, Music, Coffee, Wind } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

interface AmbienceOption {
  id: string;
  name: string;
  url: string;
  icon: React.ElementType;
}

const AMBIENCE_OPTIONS: AmbienceOption[] = [
  { 
    id: 'rain', 
    name: 'Soft Rain', 
    url: 'https://bndw.github.io/study-sounds/sounds/rain.mp3',
    icon: CloudRain 
  },
  { 
    id: 'cafe', 
    name: 'Quiet Cafe', 
    url: 'https://bndw.github.io/study-sounds/sounds/coffeeshop.mp3',
    icon: Coffee 
  },
  { 
    id: 'keyboard', 
    name: 'Indie Typing', 
    url: 'https://bndw.github.io/study-sounds/sounds/keyboard.mp3',
    icon: Music 
  },
  { 
    id: 'vinyl', 
    name: 'Vinyl Crackle', 
    url: 'https://bndw.github.io/study-sounds/sounds/bonfire.mp3',
    icon: Wind 
  }
];

export function AmbienceToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [volume, setVolume] = useState(1.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { theme } = useTheme();

  const handleToggleOption = (optionId: string) => {
    if (activeId === optionId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setActiveId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      const option = AMBIENCE_OPTIONS.find(o => o.id === optionId);
      if (option) {
        const audio = new Audio(option.url);
        audio.loop = true;
        audio.volume = volume;
        audioRef.current = audio;
        audio.play().catch(err => {
          console.error("Direct audio play failed:", err);
        });
        setActiveId(optionId);
      }
    }
  };

  const handleMute = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setActiveId(null);
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <div className="fixed bottom-10 right-10 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
            className={cn(
              "mb-6 p-6 glass-panel rounded-[32px] w-72 shadow-[0_20px_50px_rgba(0,0,0,0.3)] space-y-6 backdrop-blur-3xl",
              theme === 'dark' ? "bg-zinc-900/80 border-white/5" : "bg-white/80 border-black/5"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-[10px] font-bold tracking-[0.4em] uppercase text-purple-500">Atmosphere</h4>
                <p className="text-[9px] text-zinc-500 mt-1 uppercase tracking-widest">Select your mood</p>
              </div>
              <button 
                onClick={handleMute}
                className="text-[9px] uppercase tracking-widest text-zinc-500 hover:text-purple-500 transition-colors bg-white/5 px-3 py-1.5 rounded-full"
              >
                Mute
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {AMBIENCE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleToggleOption(option.id)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all duration-500 group border",
                    activeId === option.id 
                      ? "bg-purple-500 border-purple-400 text-white shadow-lg shadow-purple-500/20" 
                      : theme === 'dark' 
                        ? "bg-white/5 border-white/5 hover:border-purple-500/30 text-zinc-400" 
                        : "bg-black/5 border-black/5 hover:border-purple-500/30 text-zinc-600"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                    activeId === option.id ? "bg-white/20" : "bg-purple-500/10"
                  )}>
                    <option.icon className={cn("w-5 h-5", activeId === option.id ? "text-white" : "text-purple-500")} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest">{option.name}</span>
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-white/5 space-y-4">
              <div className="flex justify-between text-[9px] uppercase tracking-widest text-zinc-500 font-bold">
                <span>Volume</span>
                <span>{Math.round(volume * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1.0" 
                step="0.05" 
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-purple-500 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-12 flex items-center gap-4 px-6 rounded-full shadow-2xl transition-all duration-700 relative group overflow-hidden border backdrop-blur-md",
          activeId 
            ? "bg-purple-500 border-purple-400 text-white" 
            : theme === 'dark' 
              ? "bg-zinc-900/60 border-white/5 text-zinc-400" 
              : "bg-white/60 border-black/5 text-zinc-600"
        )}
      >
        <AnimatePresence mode="wait">
          {activeId ? (
            <motion.div
              key="active"
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 10, opacity: 0 }}
              className="flex items-center gap-3"
            >
              <div className="relative">
                <Volume2 className="w-4 h-4" />
                <motion.div 
                   animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                   transition={{ duration: 2, repeat: Infinity }}
                   className="absolute inset-0 bg-white rounded-full -z-10"
                />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] whitespace-nowrap">
                {AMBIENCE_OPTIONS.find(o => o.id === activeId)?.name}
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="inactive"
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 10, opacity: 0 }}
              className="flex items-center gap-3"
            >
              <VolumeX className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] whitespace-nowrap">
                Soundscape
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
