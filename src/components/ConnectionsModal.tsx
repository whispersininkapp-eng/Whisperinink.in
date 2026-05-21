import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { X, Users, ArrowRight, UserPlus, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConnectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileUserId: string;
  profileName: string;
  initialTab: 'followers' | 'following';
}

interface ConnectionUser {
  uid: string;
  displayName: string;
  photoURL: string;
  bio?: string;
}

export function ConnectionsModal({ isOpen, onClose, profileUserId, profileName, initialTab }: ConnectionsModalProps) {
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [usersList, setUsersList] = useState<ConnectionUser[]>([]);

  // Sync initial tab
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  // Fetch connections based on active tab and profileId
  useEffect(() => {
    if (!isOpen || !profileUserId) return;

    async function fetchConnections() {
      setLoading(true);
      setUsersList([]);
      try {
        const followsRef = collection(db, 'follows');
        let q;

        if (activeTab === 'followers') {
          // People who are following this profile
          q = query(followsRef, where('followingId', '==', profileUserId));
        } else {
          // People whom this profile is following
          q = query(followsRef, where('followerId', '==', profileUserId));
        }

        const querySnapshot = await getDocs(q);
        const userConnectionsIds: string[] = [];
        
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          const targetId = activeTab === 'followers' ? data.followerId : data.followingId;
          if (targetId && !userConnectionsIds.includes(targetId)) {
            userConnectionsIds.push(targetId);
          }
        });

        if (userConnectionsIds.length === 0) {
          setUsersList([]);
          return;
        }

        // Fetch user documents in chunks / Promise.all
        const fetchedUsers: ConnectionUser[] = [];
        const userFetchPromises = userConnectionsIds.slice(0, 50).map(async (uid) => {
          try {
            const userDocSnap = await getDoc(doc(db, 'users', uid));
            if (userDocSnap.exists()) {
              const uData = userDocSnap.data();
              return {
                uid,
                displayName: uData.displayName || 'Anonymous Poet',
                photoURL: uData.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
                bio: uData.bio || ''
              };
            }
          } catch (err) {
            console.error(`Error fetching user data for ${uid}:`, err);
          }
          return null;
        });

        const results = await Promise.all(userFetchPromises);
        results.forEach((u) => {
          if (u) fetchedUsers.push(u);
        });

        setUsersList(fetchedUsers);
      } catch (error) {
        console.error('Error fetching connections:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchConnections();
  }, [isOpen, activeTab, profileUserId]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-6">
          {/* Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              "relative w-full max-w-lg glass-panel rounded-[40px] overflow-hidden flex flex-col max-h-[80vh] shadow-2xl",
              theme === 'dark' ? "border-white/10" : "border-zinc-200"
            )}
          >
            {/* Header */}
            <div className={cn(
              "flex items-center justify-between px-8 pt-8 pb-4 border-b",
              theme === 'dark' ? "border-white/5" : "border-zinc-100"
            )}>
              <div className="space-y-1">
                <h3 className={cn(
                  "text-xl font-serif italic tracking-tight font-light",
                  theme === 'dark' ? "text-zinc-100" : "text-zinc-900"
                )}>
                  Connections
                </h3>
                <p className="text-[9px] font-mono tracking-wider text-zinc-500 uppercase">
                  Echoes surrounding {profileName}
                </p>
              </div>
              <button 
                onClick={onClose}
                className={cn(
                  "p-2 rounded-full transition-all cursor-pointer",
                  theme === 'dark' ? "text-white/40 hover:text-white hover:bg-white/5" : "text-zinc-400 hover:text-black hover:bg-zinc-100"
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Custom Tab Bar */}
            <div className={cn(
              "flex border-b text-xs font-bold tracking-[0.2em] font-sans uppercase",
              theme === 'dark' ? "border-white/5" : "border-zinc-100"
            )}>
              <button
                onClick={() => setActiveTab('followers')}
                className={cn(
                  "flex-1 py-4 text-center cursor-pointer transition-all border-b-2 relative",
                  activeTab === 'followers'
                    ? theme === 'dark' ? "border-purple-400 text-purple-400" : "border-purple-600 text-purple-600 font-bold"
                    : "border-transparent text-zinc-500 hover:text-zinc-400"
                )}
              >
                Followers
                {activeTab === 'followers' && (
                  <motion.div 
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500"
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab('following')}
                className={cn(
                  "flex-1 py-4 text-center cursor-pointer transition-all border-b-2 relative",
                  activeTab === 'following'
                    ? theme === 'dark' ? "border-purple-400 text-purple-400" : "border-purple-600 text-purple-600 font-bold"
                    : "border-transparent text-zinc-500 hover:text-zinc-400"
                )}
              >
                Following
                {activeTab === 'following' && (
                  <motion.div 
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500"
                  />
                )}
              </button>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar space-y-4">
              {loading ? (
                <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                  <span className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-serif italic text-zinc-500">Unearthing matching souls...</p>
                </div>
              ) : usersList.length > 0 ? (
                <div className="space-y-3">
                  {usersList.map((userItem) => (
                    <motion.div
                      key={userItem.uid}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "p-4 rounded-[24px] border flex items-center justify-between group/user transition-all duration-300",
                        theme === 'dark' 
                          ? "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]" 
                          : "bg-zinc-50/50 border-zinc-100 hover:bg-zinc-100/50"
                      )}
                    >
                      <Link 
                        to={`/profile/${userItem.uid}`} 
                        onClick={onClose}
                        className="flex items-center gap-4 flex-1 min-w-0"
                      >
                        <img 
                          src={userItem.photoURL}
                          alt={userItem.displayName}
                          className={cn(
                            "w-10 h-10 rounded-full border shrink-0 object-cover",
                            theme === 'dark' ? "border-white/10" : "border-zinc-200"
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className={cn(
                            "text-sm font-semibold font-sans hover:text-purple-500 transition-colors truncate",
                            theme === 'dark' ? "text-zinc-200" : "text-zinc-850"
                          )}>
                            {userItem.displayName}
                          </p>
                          {userItem.bio && (
                            <p className={cn(
                              "text-xs font-serif italic truncate mt-0.5",
                              theme === 'dark' ? "text-zinc-500" : "text-zinc-400"
                            )}>
                              {userItem.bio}
                            </p>
                          )}
                        </div>
                      </Link>

                      <Link
                        to={`/profile/${userItem.uid}`}
                        onClick={onClose}
                        className={cn(
                          "p-2.5 rounded-full transition-all duration-300 opacity-0 group-hover/user:opacity-100 hover:scale-105 active:scale-95 shrink-0 ml-3 cursor-pointer",
                          theme === 'dark' 
                            ? "bg-white/5 text-purple-400 hover:text-white hover:bg-purple-500" 
                            : "bg-zinc-100 text-purple-600 hover:text-white hover:bg-purple-600"
                        )}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center flex flex-col items-center justify-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    theme === 'dark' ? "bg-white/5" : "bg-purple-500/5"
                  )}>
                    <Users className="w-5 h-5 text-zinc-500" />
                  </div>
                  <div>
                    <p className={cn(
                      "text-sm font-serif italic",
                      theme === 'dark' ? "text-zinc-400" : "text-zinc-600"
                    )}>
                      {activeTab === 'followers' 
                        ? "Silence echoes here. No followers yet." 
                        : "This soul is solitary, following no other paths."}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500/60 mt-1">
                      No matching signals found
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer with hint */}
            <div className={cn(
              "px-8 py-4 border-t text-center text-[10px] text-zinc-500 font-serif italic",
              theme === 'dark' ? "border-white/5 bg-white/[0.01]" : "border-zinc-100 bg-zinc-50"
            )}>
              Bound by invisible threads of text and midnight whims.
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
