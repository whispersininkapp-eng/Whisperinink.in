import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, limit, doc, increment, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { PostCard } from '../components/PostCard';
import { Search, Compass, Book, Music, Heart, Globe, Users, UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { curatedWritings } from '../data/curatedWritings';

export function ExplorePage() {
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'writings' | 'writers'>('writings');
  const [posts, setPosts] = useState<any[]>([]);
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  // Writers search states
  const [writers, setWriters] = useState<any[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [writersLoading, setWritersLoading] = useState(false);
  const [followActionLoading, setFollowActionLoading] = useState<string | null>(null);

  const categories = [
    { name: 'All', icon: Globe },
    { name: 'Poetry', icon: Book },
    { name: 'Stories', icon: Compass },
    { name: 'Emotional', icon: Heart },
    { name: 'Music', icon: Music },
  ];

  const fetchPostsForCategory = async (category = activeCategory) => {
    setLoading(true);
    try {
      let q;
      if (category === 'All') {
        q = query(
          collection(db, 'posts'), 
          where('moderationStatus', '==', 'approved'),
          limit(100)
        );
      } else {
        q = query(
          collection(db, 'posts'), 
          where('mood', '==', category), 
          where('moderationStatus', '==', 'approved'),
          limit(100)
        );
      }
      
      try {
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        setAllPosts(fetched);
      } catch (postError: any) {
        console.warn('Explore query failed, fallback to unfiltered:', postError);
        let fallbackQ = query(collection(db, 'posts'), limit(100));
        if (category !== 'All') {
          fallbackQ = query(collection(db, 'posts'), where('mood', '==', category), limit(100));
        }
        const snapshot = await getDocs(fallbackQ);
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter(p => !p.moderationStatus || p.moderationStatus === 'approved');
        setAllPosts(fetched);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWriters = async () => {
    setWritersLoading(true);
    try {
      const usersSnapshot = await getDocs(query(collection(db, 'users'), limit(150)));
      const fetchedWriters = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWriters(fetchedWriters);

      if (currentUser) {
        const followsQuery = query(collection(db, 'follows'), where('followerId', '==', currentUser.uid));
        const followsSnapshot = await getDocs(followsQuery);
        const followedSet = new Set(followsSnapshot.docs.map(doc => doc.data().followingId as string));
        setFollowingIds(followedSet);
      }
    } catch (err) {
      console.error("Error fetching writers:", err);
    } finally {
      setWritersLoading(false);
    }
  };

  const handleFollowToggle = async (targetUser: any) => {
    if (!currentUser || followActionLoading) return;
    const targetId = targetUser.uid || targetUser.id;
    if (!targetId || targetId === currentUser.uid) return;

    setFollowActionLoading(targetId);
    try {
      const batch = writeBatch(db);
      const followId = `${currentUser.uid}_${targetId}`;
      const followRef = doc(db, 'follows', followId);
      
      const userRef = doc(db, 'users', targetId);
      const currentUserRef = doc(db, 'users', currentUser.uid);

      const isFollowing = followingIds.has(targetId);

      if (isFollowing) {
        batch.delete(followRef);
        batch.set(userRef, { followerCount: increment(-1) }, { merge: true });
        batch.set(currentUserRef, { followingCount: increment(-1) }, { merge: true });
        await batch.commit();
        
        setFollowingIds(prev => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
        setWriters(prev => prev.map(w => (w.uid === targetId || w.id === targetId) ? { ...w, followerCount: Math.max(0, (w.followerCount || 0) - 1) } : w));
      } else {
        batch.set(followRef, {
          followerId: currentUser.uid,
          followingId: targetId,
          createdAt: new Date().toISOString()
        });
        batch.set(userRef, { followerCount: increment(1) }, { merge: true });
        batch.set(currentUserRef, { followingCount: increment(1) }, { merge: true });
        await batch.commit();

        setFollowingIds(prev => {
          const next = new Set(prev);
          next.add(targetId);
          return next;
        });
        setWriters(prev => prev.map(w => (w.uid === targetId || w.id === targetId) ? { ...w, followerCount: (w.followerCount || 0) + 1 } : w));
      }
    } catch (err) {
      console.error('Error toggling follow of target user:', err);
    } finally {
      setFollowActionLoading(null);
    }
  };

  // Load posts for the selected category
  useEffect(() => {
    fetchPostsForCategory(activeCategory);
  }, [activeCategory, currentUser]);

  // Load writers once on mount or when currentUser changes
  useEffect(() => {
    fetchWriters();
  }, [currentUser]);

  // Dynamically filter elements client-side for immediate responsive feel
  useEffect(() => {
    let localCurated = curatedWritings;
    if (activeCategory !== 'All') {
      localCurated = localCurated.filter(p => p.mood === activeCategory);
    }
    
    let combined = [...allPosts];
    
    // De-duplicate against curated posts
    const fetchedIds = new Set(combined.map(p => p.id));
    const finalCurated = localCurated.filter(p => !fetchedIds.has(p.id));
    
    let result = [...finalCurated, ...combined];
    
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((p: any) => {
        // Find if there is a matching user for this post's authorId
        const authorUser = writers.find(w => (w.id === p.authorId || w.uid === p.authorId));
        const matchesUsername = authorUser?.username?.toLowerCase().includes(lowerSearch);
        const matchesAuthorName = p.authorName?.toLowerCase().includes(lowerSearch);
        return (
          p.title?.toLowerCase().includes(lowerSearch) || 
          p.content.toLowerCase().includes(lowerSearch) ||
          matchesAuthorName ||
          matchesUsername
        );
      });
    }
    
    setPosts(result);
  }, [allPosts, searchTerm, activeCategory, writers, currentUser]);

  return (
    <div className="min-h-screen bg-transparent pt-10 pb-32 px-12 transition-colors duration-500">
      <div className="max-w-6xl mx-auto space-y-16">
        <header className="space-y-12">
          <div className="flex flex-col items-start text-left space-y-6">
             <div className="flex items-center gap-4">
                <div className="h-px w-10 bg-purple-500/30" />
                <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-purple-500/60">Discovery</span>
             </div>
            <h2 className={cn(
              "text-6xl font-serif font-light italic tracking-tight",
              theme === 'dark' ? "text-zinc-100" : "text-zinc-900"
            )}>Explore the Void</h2>
            <p className={cn(
              "text-lg font-serif italic max-w-xl transition-colors",
              theme === 'dark' ? "text-zinc-500" : "text-zinc-600"
            )}>Discover whispers that resonate with the frequency of your own soul. The void is full of words waiting to be heard.</p>
          </div>

          {/* Toggle Type Navigation */}
          <div className="flex gap-8 border-b border-white/5 pb-1">
            <button
              onClick={() => {
                setSearchType('writings');
                setSearchTerm('');
              }}
              className={cn(
                "pb-4 text-[10px] font-bold tracking-[0.3em] uppercase transition-all relative cursor-pointer",
                searchType === 'writings' 
                  ? "text-purple-500 font-bold" 
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Whispers (Writings)
              {searchType === 'writings' && (
                <motion.div 
                  layoutId="activeSearchTab" 
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" 
                />
              )}
            </button>
            <button
              onClick={() => {
                setSearchType('writers');
                setSearchTerm('');
              }}
              className={cn(
                "pb-4 text-[10px] font-bold tracking-[0.3em] uppercase transition-all relative cursor-pointer",
                searchType === 'writers' 
                  ? "text-purple-500 font-bold" 
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Whisperers (Writers)
              {searchType === 'writers' && (
                <motion.div 
                  layoutId="activeSearchTab" 
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" 
                />
              )}
            </button>
          </div>

          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-purple-500 transition-colors" />
            <input 
              type="text"
              placeholder={searchType === 'writings' ? "Search by title, keyword, or emotion..." : "Search writers by name, username or biography..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchType === 'writings') {
                  fetchPostsForCategory();
                }
              }}
              className={cn(
                "w-full h-20 border rounded-3xl px-16 font-serif italic text-lg transition-all",
                theme === 'dark' ? "bg-white/[0.02] border-white/5 text-zinc-200 placeholder-zinc-700 focus:border-purple-500/30" : "bg-black/[0.01] border-black/[0.05] text-zinc-900 placeholder-zinc-500 focus:border-purple-500/20"
              )}
            />
          </div>

          {searchType === 'writings' ? (
            <div className="flex flex-wrap justify-start gap-4">
              {categories.map((cat) => (
                <button 
                  key={cat.name}
                  onClick={() => setActiveCategory(cat.name)}
                  className={cn(
                    "flex items-center gap-2 px-8 py-3 rounded-full text-[10px] font-bold tracking-[0.2em] transition-all border hover-lift hover-glow",
                    activeCategory === cat.name 
                      ? (theme === 'dark' ? "bg-white text-black border-white" : "bg-zinc-900 text-white border-zinc-900 shadow-xl")
                      : (theme === 'dark' ? "bg-zinc-900/50 text-zinc-500 border-white/5 hover:text-zinc-300" : "bg-white text-zinc-600 border-black/5 hover:text-zinc-900")
                  )}
                >
                  <cat.icon className="w-4 h-4" />
                  {cat.name.toUpperCase()}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[10px] font-sans tracking-[0.2em] font-medium text-zinc-500 uppercase">
              Showing active whisperers in the ink universe
            </p>
          )}
        </header>

        {searchType === 'writings' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {posts.length > 0 ? (
              posts.map(post => <PostCard key={post.id} post={post} />)
            ) : (
              !loading && (
                <div className="col-span-full py-20 text-center text-zinc-600 font-serif text-xl italic">
                  No whispers found in this corner of the void...
                </div>
              )
            )}
            {loading && (
              [1, 2, 4].map(i => <div key={i} className="h-64 bg-zinc-900/30 rounded-3xl animate-pulse" />)
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {writersLoading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="h-48 border border-white/5 bg-zinc-900/10 rounded-[32px] animate-pulse" />
              ))
            ) : (
              (() => {
                const queryStr = searchTerm.toLowerCase();
                const filteredWriters = writers.filter((writer: any) => {
                  return (
                    writer.displayName?.toLowerCase().includes(queryStr) ||
                    writer.username?.toLowerCase().includes(queryStr) ||
                    writer.bio?.toLowerCase().includes(queryStr)
                  );
                });

                if (filteredWriters.length > 0) {
                  return filteredWriters.map((writer) => (
                    <div
                      key={writer.uid || writer.id}
                      className={cn(
                        "glass-panel rounded-[32px] p-8 flex flex-col justify-between transition-all duration-500 hover:-translate-y-1 relative overflow-hidden group border",
                        theme === 'dark' 
                          ? "bg-white/[0.01] border-white/5 hover:border-purple-500/30 hover:shadow-[0_0_80px_-20px_rgba(168,85,247,0.12)]" 
                          : "bg-black/[0.01] border-black/[0.05] hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <Link to={`/profile/${writer.uid || writer.id}`} className="flex items-center gap-4">
                          <img 
                            src={writer.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${writer.uid || writer.id}`} 
                            alt={writer.displayName} 
                            className={cn(
                              "w-12 h-12 rounded-full border-2",
                              theme === 'dark' ? "border-white/10 grayscale group-hover:grayscale-0 transition-all" : "border-zinc-200"
                            )} 
                          />
                          <div>
                            <h4 className={cn(
                              "font-serif font-medium text-lg leading-tight group-hover:text-purple-400 transition-colors",
                              theme === 'dark' ? "text-white/90" : "text-zinc-900"
                            )}>
                              {writer.displayName}
                            </h4>
                            <p className={cn(
                              "text-[10px] font-mono tracking-wider mt-0.5",
                              theme === 'dark' ? "text-white/30" : "text-zinc-500"
                            )}>
                              @{writer.username || `user_${(writer.uid || writer.id || '').slice(0, 5)}`}
                            </p>
                          </div>
                        </Link>
                      </div>

                      <p className={cn(
                        "text-sm font-serif italic my-6 line-clamp-3 min-h-[4.5rem]",
                        theme === 'dark' ? "text-zinc-400" : "text-zinc-600"
                      )}>
                        {writer.bio || "This whisperer has left their ledger blank, writing only in silence."}
                      </p>

                      <div className="flex items-center justify-between border-t border-white/5 pt-4">
                        <div className="flex gap-4">
                          <div>
                            <span className={cn(
                              "text-sm font-mono font-medium block",
                              theme === 'dark' ? "text-white/80" : "text-zinc-800"
                            )}>{writer.followerCount || 0}</span>
                            <span className="text-[9px] uppercase tracking-widest text-zinc-500">Followers</span>
                          </div>
                          <div>
                            <span className={cn(
                              "text-sm font-mono font-medium block",
                              theme === 'dark' ? "text-white/80" : "text-zinc-800"
                            )}>{writer.followingCount || 0}</span>
                            <span className="text-[9px] uppercase tracking-widest text-zinc-500">Following</span>
                          </div>
                        </div>

                        <div>
                          {currentUser && (currentUser.uid === writer.uid || currentUser.uid === writer.id) ? (
                            <span className="text-[10px] font-mono uppercase tracking-widest text-purple-400/50 italic px-4 py-1.5 border border-purple-500/10 rounded-full">
                              (You)
                            </span>
                          ) : (
                            <button
                              onClick={() => handleFollowToggle(writer)}
                              disabled={followActionLoading === (writer.uid || writer.id)}
                              className={cn(
                                "flex items-center gap-1 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase border transition-all cursor-pointer active:scale-95 disabled:opacity-50",
                                followingIds.has(writer.uid || writer.id)
                                  ? (theme === 'dark' ? "bg-white text-black border-white" : "bg-zinc-900 text-white border-zinc-900")
                                  : "bg-transparent text-purple-400 border-purple-500/30 hover:border-purple-400/60 hover:text-purple-400"
                              )}
                            >
                              {followActionLoading === (writer.uid || writer.id) ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : followingIds.has(writer.uid || writer.id) ? (
                                <>
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Following</span>
                                </>
                              ) : (
                                <>
                                  <UserPlus className="w-3.5 h-3.5" />
                                  <span>Follow</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ));
                } else {
                  return (
                    <div className="col-span-full py-20 text-center text-zinc-600 font-serif text-xl italic">
                      No matching writers found in this corner of the ledger...
                    </div>
                  );
                }
              })()
            )}
          </div>
        )}
      </div>
    </div>
  );
}
