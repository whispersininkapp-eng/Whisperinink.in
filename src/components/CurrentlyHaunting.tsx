import React from 'react';
import { motion } from 'motion/react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';
import { Music, CloudRain, Ghost, Moon } from 'lucide-react';

export function CurrentlyHaunting() {
  const { theme } = useTheme();

  const hauntingItems = [
    { icon: Music, label: "Listening", value: "Cigarettes After Sex — Apocalypse", color: "text-purple-400" },
    { icon: CloudRain, label: "Atmosphere", value: "Rain hitting glass at 3 AM", color: "text-blue-400" },
    { icon: Ghost, label: "Feeling", value: "The fear of becoming forgettable", color: "text-zinc-500" },
    { icon: Moon, label: "Current Phase", value: "The Midnight Writing Era", color: "text-purple-500" }
  ];

  return (
    <div className={cn(
      "glass-panel p-8 rounded-[40px] space-y-8",
      theme === 'dark' ? "hover:shadow-[0_0_80px_rgba(168,85,247,0.03)]" : "hover:shadow-2xl hover:shadow-purple-500/5"
    )}>
      <div>
        <h4 className="text-[10px] font-bold tracking-[0.4em] uppercase text-purple-500/60 mb-6">Currently Haunting</h4>
        <div className="space-y-6">
          {hauntingItems.map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group flex items-start gap-4"
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110",
                theme === 'dark' ? "bg-white/5" : "bg-purple-500/5"
              )}>
                <item.icon className={cn("w-4 h-4", item.color)} />
              </div>
              <div className="flex-1">
                <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-zinc-500 mb-1">{item.label}</p>
                <p className={cn(
                  "text-sm font-serif italic transition-colors duration-500 group-hover:text-purple-400",
                  theme === 'dark' ? "text-zinc-400" : "text-zinc-600"
                )}>{item.value}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      
      <div className="pt-4 border-t border-white/5">
        <p className="text-[10px] text-zinc-500 italic font-serif">
          Updated during another sleepless night.
        </p>
      </div>
    </div>
  );
}
