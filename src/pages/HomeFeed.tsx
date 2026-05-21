import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PostCard } from '../components/PostCard';
import { AmbienceToggle } from '../components/AmbienceToggle';
import { CurrentlyHaunting } from '../components/CurrentlyHaunting';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, TrendingUp, Clock, Users, Music } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { curatedWritings } from '../data/curatedWritings';

export function HomeFeed() {
  const [posts, setPosts] = useState<any[]>(curatedWritings);
  const [loading, setLoading] = useState(true);
  const [feedType, setFeedType] = useState<'global' | 'trending' | 'following'>('global');
  const [sortBy, setSortBy] = useState<'latest' | 'trending'>('latest');
  const { theme } = useTheme();
  const { user } = useAuth();

  const sortedPosts = React.useMemo(() => {
    const getTimestamp = (post: any) => {
      if (post.createdAt?.toDate) {
        return post.createdAt.toDate().getTime();
      }
      if (post.createdAt instanceof Date) {
        return post.createdAt.getTime();
      }
      if (typeof post.createdAt === 'string') {
        return new Date(post.createdAt).getTime();
      }
      if (post.createdAt?.seconds) {
        return post.createdAt.seconds * 1000;
      }
      return 0;
    };

    return [...posts].sort((a, b) => {
      if (sortBy === 'trending' || feedType === 'trending') {
        const scoreA = (a.likesCount || 0) + (a.commentCount || 0) * 2;
        const scoreB = (b.likesCount || 0) + (b.commentCount || 0) * 2;
        if (scoreB === scoreA) {
          return getTimestamp(b) - getTimestamp(a);
        }
        return scoreB - scoreA;
      } else {
        return getTimestamp(b) - getTimestamp(a);
      }
    });
  }, [posts, sortBy, feedType]);

  useEffect(() => {
    async function fetchPosts() {
      setLoading(true);
      try {
        if (feedType === 'global') {
          // Querying only approved posts for the public feed
          const q = query(
            collection(db, 'posts'), 
            where('moderationStatus', '==', 'approved'),
            orderBy('createdAt', 'desc'), 
            limit(20)
          );
          const snapshot = await getDocs(q);
          const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          const fetchedIds = new Set(fetchedPosts.map(p => p.id));
          const finalCurated = curatedWritings.filter(p => !fetchedIds.has(p.id));
          setPosts([...finalCurated, ...fetchedPosts]);
        } else if (feedType === 'trending') {
          // Limit to recent scale of posts (last 100) and then let the memoed sorted selector rank them by engagement
          const q = query(
            collection(db, 'posts'), 
            where('moderationStatus', '==', 'approved'),
            orderBy('createdAt', 'desc'), 
            limit(100)
          );
          const snapshot = await getDocs(q);
          const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          const fetchedIds = new Set(fetchedPosts.map(p => p.id));
          const finalCurated = curatedWritings.filter(p => !fetchedIds.has(p.id));
          setPosts([...finalCurated, ...fetchedPosts]);
        } else {
          // Following feed logic
          if (!user) {
            setPosts([]);
            setLoading(false);
            return;
          }

          // 1. Fetch the list of user IDs that the current user follows
          const followsQuery = query(
            collection(db, 'follows'),
            where('followerId', '==', user.uid)
          );
          const followsSnapshot = await getDocs(followsQuery);
          const followedIds = followsSnapshot.docs.map(doc => doc.data().followingId);

          if (followedIds.length === 0) {
            setPosts([]);
          } else {
            // 2. Fetch posts from these users (limit to 30 as per Firestore "in" constraint)
            const followingPostsQuery = query(
              collection(db, 'posts'),
              where('authorId', 'in', followedIds.slice(0, 30)),
              where('moderationStatus', '==', 'approved'),
              orderBy('createdAt', 'desc'),
              limit(20)
            );
            const postsSnapshot = await getDocs(followingPostsQuery);
            setPosts(postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          }
        }
      } catch (error: any) {
        console.warn('Query failed, falling back to legacy filtering:', error);
        // Fallback for missing fields or status filter issues
        try {
          if (feedType === 'global' || feedType === 'trending') {
            const limitVal = feedType === 'trending' ? 100 : 20;
            const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(limitVal));
            const snapshot = await getDocs(q);
            const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any))
              .filter((p: any) => p.moderationStatus !== 'flagged');
            
            const fetchedIds = new Set(fetchedPosts.map(p => p.id));
            const finalCurated = curatedWritings.filter(p => !fetchedIds.has(p.id));
            setPosts([...finalCurated, ...fetchedPosts]);
          } else if (user) {
             const followsQuery = query(collection(db, 'follows'), where('followerId', '==', user.uid));
             const followsSnapshot = await getDocs(followsQuery);
             const followedIds = followsSnapshot.docs.map(doc => doc.data().followingId);
             
             if (followedIds.length > 0) {
               const q = query(collection(db, 'posts'), where('authorId', 'in', followedIds.slice(0, 30)), orderBy('createdAt', 'desc'), limit(20));
               const snapshot = await getDocs(q);
               setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any))
                 .filter((p: any) => p.moderationStatus !== 'flagged'));
             }
          }
        } catch (innerError) {
          console.error('Final fetch error:', innerError);
          if (feedType === 'global' || feedType === 'trending') {
            setPosts(curatedWritings);
          }
        }
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, [feedType, user]);

  return (
    <div className="min-h-screen bg-transparent pt-10 pb-32 px-12 transition-colors duration-500">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className={cn(
          "flex flex-col md:flex-row md:items-end justify-between border-b pb-12 gap-8",
          theme === 'dark' ? "border-white/5" : "border-black/5"
        )}>
          <div className="space-y-6">
            <div className="flex items-center gap-8">
              <button 
                onClick={() => setFeedType('global')}
                className={cn(
                  "text-[10px] font-bold tracking-[0.4em] uppercase transition-all pb-2 border-b-2 hover-lift",
                  feedType === 'global' 
                    ? "text-purple-500 border-purple-500" 
                    : "text-zinc-500 border-transparent hover:text-zinc-400"
                )}
              >
                Global Flow
              </button>
              <button 
                onClick={() => setFeedType('trending')}
                className={cn(
                  "text-[10px] font-bold tracking-[0.4em] uppercase transition-all pb-2 border-b-2 hover-lift",
                  feedType === 'trending' 
                    ? "text-purple-500 border-purple-500" 
                    : "text-zinc-500 border-transparent hover:text-zinc-400"
                )}
              >
                Trending Flow
              </button>
              {user && (
                <button 
                  onClick={() => setFeedType('following')}
                  className={cn(
                    "text-[10px] font-bold tracking-[0.4em] uppercase transition-all pb-2 border-b-2 hover-lift",
                    feedType === 'following' 
                      ? "text-purple-500 border-purple-500" 
                      : "text-zinc-500 border-transparent hover:text-zinc-400"
                  )}
                >
                  Inner Circle
                </button>
              )}
            </div>
            
            <div>
              <h2 className={cn(
                "text-6xl font-serif font-light italic tracking-tight",
                theme === 'dark' ? "text-zinc-100" : "text-zinc-900"
              )}>
                {feedType === 'global' ? 'Digital Ink' : feedType === 'trending' ? 'Rising Whispers' : 'Whispered Souls'}
              </h2>
              <p className={cn(
                "text-xs font-serif italic mt-3 transition-colors",
                theme === 'dark' ? "text-zinc-500" : "text-zinc-600"
              )}>
                {feedType === 'global' 
                  ? "Where the unfinished thoughts of dreamers find their true form." 
                  : feedType === 'trending'
                    ? "The most resonant echoes and sparks catching fire in the community."
                    : "The intimate fragments of the souls you've chosen to follow."}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-full border border-black/5 dark:border-white/5">
              <button 
                onClick={() => setSortBy('latest')}
                title="Sort by latest"
                aria-label="Sort by latest"
                className={cn(
                  "p-3 rounded-full transition-all cursor-pointer active:scale-95",
                  sortBy === 'latest'
                    ? "text-purple-500 bg-white dark:bg-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                <Clock className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setSortBy('trending')}
                title="Sort by trending"
                aria-label="Sort by trending"
                className={cn(
                  "p-3 rounded-full transition-all cursor-pointer active:scale-95",
                  sortBy === 'trending'
                    ? "text-purple-500 bg-white dark:bg-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                <TrendingUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-8 space-y-12">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={cn(
                    "h-80 rounded-[32px] animate-pulse",
                    theme === 'dark' ? "bg-white/[0.02]" : "bg-zinc-100"
                  )} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {sortedPosts.length > 0 ? (
                  sortedPosts.map(post => (
                    <PostCard key={post.id} post={post} />
                  ))
                ) : (
                  <div className="col-span-full py-40 text-center space-y-6">
                    <div className={cn(
                      "w-20 h-20 rounded-full flex items-center justify-center mx-auto",
                      theme === 'dark' ? "bg-white/5 text-white/10" : "bg-zinc-100 text-zinc-300"
                    )}>
                      {feedType === 'global' ? (
                        <Sparkles className="w-10 h-10" />
                      ) : feedType === 'trending' ? (
                        <TrendingUp className="w-10 h-10" />
                      ) : (
                        <Users className="w-10 h-10" />
                      )}
                    </div>
                    <h3 className={cn(
                      "font-serif italic text-2xl transition-colors",
                      theme === 'dark' ? "text-white/40" : "text-zinc-500"
                    )}>
                      {feedType === 'global' 
                        ? "The ink hasn't flowed yet..." 
                        : feedType === 'trending'
                          ? "No ripples rising in the feeds yet..."
                          : "No voices from your circle yet."}
                    </h3>
                    <p className={cn(
                      "text-sm tracking-widest uppercase",
                      theme === 'dark' ? "text-white/20" : "text-zinc-300"
                    )}>
                      {feedType === 'global' 
                        ? "Be the first to share your whisper." 
                        : feedType === 'trending'
                          ? "Like and comment on posts to get them trending!"
                          : "Follow some artistic souls to see their work here."}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Moody Side Panel */}
          <aside className="lg:col-span-4 space-y-12 hidden lg:block">
            <CurrentlyHaunting />
            
            <div className="glass-panel p-8 rounded-[40px] space-y-8 sticky top-[500px] hover:shadow-2xl hover:shadow-purple-500/5 transition-all duration-[800ms]">
              <div>
                <h4 className="text-[10px] font-bold tracking-[0.4em] uppercase text-purple-500/60 mb-6">Community Vibe</h4>
                <div className="space-y-6">
                  <div className="flex items-center gap-4 group">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Music className="w-4 h-4 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Listening To</p>
                      <p className="text-sm font-serif italic text-zinc-400 group-hover:text-purple-400 transition-colors">Coffee Shop Jazz & Rain</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 group">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Clock className="w-4 h-4 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Current Era</p>
                      <p className="text-sm font-serif italic text-zinc-400 group-hover:text-purple-400 transition-colors">The Midnight Writing Era</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className={cn(
                "pt-8 border-t transition-colors",
                theme === 'dark' ? "border-white/5" : "border-black/5"
              )}>
                <h4 className="text-[10px] font-bold tracking-[0.4em] uppercase text-purple-500/60 mb-4">Prompt of the Day</h4>
                <p className={cn(
                  "text-xl font-serif italic leading-relaxed transition-colors",
                  theme === 'dark' ? "text-zinc-300" : "text-zinc-700"
                )}>
                  “Describe a color that doesn't exist, using only the sounds of a crowded room.”
                </p>
              </div>

              <div className={cn(
                "pt-8 border-t transition-colors",
                theme === 'dark' ? "border-white/5" : "border-black/5"
              )}>
                <h4 className="text-[10px] font-bold tracking-[0.4em] uppercase text-purple-500/60 mb-4">Current Obsession</h4>
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl overflow-hidden border group-hover:border-purple-500/30 transition-all duration-700",
                    theme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
                  )}>
                    <img 
                      src="https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=200&auto=format&fit=crop" 
                      alt="Nineteenth century book details pile" 
                      width={48}
                      height={48}
                      className="w-full h-full object-cover grayscale opacity-60" 
                    />
                  </div>
                  <div>
                    <p className={cn(
                      "text-sm font-serif italic transition-colors",
                      theme === 'dark' ? "text-zinc-300" : "text-zinc-600"
                    )}>The aesthetic of 19th century letters.</p>
                  </div>
                </div>
              </div>

              <div className={cn(
                "pt-8 border-t transition-colors",
                theme === 'dark' ? "border-white/5" : "border-black/5"
              )}>
                <h4 className="text-[10px] font-bold tracking-[0.4em] uppercase text-purple-500/60 mb-4">Unfinished Fragments</h4>
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className="group cursor-pointer">
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500/30 w-[60%] group-hover:w-[100%] transition-all duration-700" />
                      </div>
                      <p className="text-[10px] mt-2 text-zinc-600 italic">Untitled Piece #{i+12}...</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <AmbienceToggle />
    </div>
  );
}
