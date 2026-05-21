import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PenLine, Compass, Home, User, LogOut, Instagram, Moon, Sun, Bookmark, Search, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function Navbar() {
  const { user, login, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  // Account search states
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isFocused && users.length === 0) {
      setLoading(true);
      const q = query(collection(db, 'users'), limit(150));
      getDocs(q).then((snapshot) => {
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(fetched);
        setLoading(false);
      }).catch((err) => {
        console.error("Error fetching users for navbar search:", err);
        setLoading(false);
      });
    }
  }, [isFocused, users.length]);

  const filteredUsers = searchTerm.trim() 
    ? users.filter(u => 
        (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.username || '').toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 5)
    : [];

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Explore', path: '/explore', icon: Compass },
    { name: 'Create', path: '/create', icon: PenLine },
    { name: 'Read Later', path: '/read-later', icon: Bookmark },
  ];

  return (
    <nav className="relative z-50 flex justify-between items-center px-12 py-8 gap-4">
      <div className="flex items-center gap-6 flex-1">
        <Link 
          to="/" 
          onClick={() => {
            if (window.location.pathname === '/') {
              window.location.reload();
            } else {
              window.location.href = '/';
            }
          }}
          className="flex items-center gap-4 group shrink-0"
        >
          <div className="relative h-20 sm:h-24 flex items-center bg-transparent rounded-xl">
            <img 
              src="/src/assets/images/whispers_logo_png_1779209067072.png" 
              alt="Whispers in Ink Logo" 
              referrerPolicy="no-referrer"
              className={cn(
                "h-20 sm:h-24 w-auto object-contain transition-all duration-500 group-hover:scale-105",
                theme === 'dark' 
                  ? "invert mix-blend-screen opacity-95 group-hover:opacity-100" 
                  : "mix-blend-multiply opacity-95 group-hover:opacity-100"
              )}
            />
          </div>
        </Link>

        {/* Global Account Search Bar */}
        <div className="relative max-w-[180px] sm:max-w-[240px] md:max-w-[280px] w-full font-sans text-xs">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300",
            theme === 'dark' 
              ? "bg-white/[0.02] border-white/5 focus-within:border-purple-500/50" 
              : "bg-black/[0.01] border-black/5 focus-within:border-purple-500/50"
          )}>
            <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <input 
              type="text"
              placeholder="Search Whisperers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              className={cn(
                "w-full bg-transparent border-none outline-none font-medium placeholder-zinc-500 font-sans text-[11px] tracking-wide",
                theme === 'dark' ? "text-zinc-200" : "text-zinc-900"
              )}
            />
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-500 shrink-0" />}
          </div>

          <AnimatePresence>
            {isFocused && filteredUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={cn(
                  "absolute top-full left-0 right-0 mt-2 rounded-2xl border p-2 shadow-2xl z-[100] backdrop-blur-xl max-h-64 overflow-y-auto space-y-1 scale-95 origin-top",
                  theme === 'dark' ? "bg-zinc-950/95 border-white/5" : "bg-white/95 border-black/5"
                )}
              >
                {filteredUsers.map((u) => (
                  <Link
                    key={u.id}
                    to={`/profile/${u.id}`}
                    onClick={() => setSearchTerm('')}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-xl transition-all duration-200 text-left cursor-pointer",
                      theme === 'dark' ? "hover:bg-white/5" : "hover:bg-black/5"
                    )}
                  >
                    <img 
                      src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`} 
                      alt={u.displayName} 
                      className="w-7 h-7 rounded-full object-cover shrink-0"
                    />
                    <div className="truncate">
                      <p className={cn("font-medium text-[11px] tracking-wide truncate", theme === 'dark' ? "text-zinc-100" : "text-zinc-900")}>
                        {u.displayName}
                      </p>
                      <p className="text-[9px] text-zinc-500 font-mono tracking-wider truncate">
                        @{u.username || `user_${u.id.slice(0, 5)}`}
                      </p>
                    </div>
                  </Link>
                ))}
              </motion.div>
            )}
            {isFocused && searchTerm.trim() && !loading && filteredUsers.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={cn(
                  "absolute top-full left-0 right-0 mt-2 rounded-2xl border p-4 text-center text-[10px] tracking-wider text-zinc-500 font-medium z-[100] backdrop-blur-xl scale-95 origin-top",
                  theme === 'dark' ? "bg-zinc-950/95 border-white/5" : "bg-white/95 border-black/5"
                )}
              >
                No Whisperers Found
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className={cn(
        "flex items-center gap-10 text-[10px] uppercase tracking-[0.3em] font-bold",
        theme === 'dark' ? "text-zinc-500" : "text-zinc-400"
      )}>
        <div className="hidden lg:flex items-center gap-8">
          {navItems.map((item) => {
            if ((item.path === '/create' || item.path === '/read-later') && !user) {
              return (
                <button 
                  key={item.path} 
                  onClick={login}
                  className="transition-colors ink-underline whitespace-nowrap cursor-pointer hover:text-purple-500 bg-transparent border-none font-bold text-[10px] uppercase tracking-[0.3em]"
                >
                  {item.name}
                </button>
              );
            }
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={cn(
                  "transition-colors ink-underline whitespace-nowrap",
                  location.pathname === item.path ? "text-purple-500 after:w-full" : "hover:text-purple-500"
                )}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
        
        <div className="h-4 w-px bg-white/5" />

        <div className="flex items-center gap-6">
          <button 
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className={cn(
              "transition-colors",
              theme === 'dark' ? "hover:text-zinc-100" : "hover:text-zinc-900"
            )}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {user ? (
            <div className="flex items-center gap-6 pl-6 border-l border-white/5">
              <Link to={`/profile/${user.uid}`} className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-white/5 group-hover:border-purple-500/30 transition-all">
                  <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="Profile" className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
                </div>
              </Link>
              <button 
                onClick={logout} 
                aria-label="Sign Out"
                className="hover:text-red-500 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={login}
              className={cn(
                "px-6 py-2.5 rounded-full border transition-all text-purple-500 border-purple-500/20 hover:bg-purple-500/5 hover-glow hover:-translate-y-0.5 active:scale-95",
              )}
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
