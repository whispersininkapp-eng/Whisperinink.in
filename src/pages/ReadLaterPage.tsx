import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PostCard } from '../components/PostCard';
import { AmbienceToggle } from '../components/AmbienceToggle';
import { motion } from 'motion/react';
import { Bookmark, Sparkles, BookOpen, Clock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

export function ReadLaterPage() {
  const { theme } = useTheme();
  const { user, login } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchSavedPosts() {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'readLater'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const savedList = snapshot.docs.map(doc => doc.data());

        if (savedList.length === 0) {
          setPosts([]);
          setLoading(false);
          return;
        }

        // Fetch each post doc in parallel
        const postPromises = savedList.map(async (savedItem) => {
          try {
            const postDocRef = doc(db, 'posts', savedItem.postId);
            const postDocSnap = await getDoc(postDocRef);
            if (postDocSnap.exists()) {
              return { id: postDocSnap.id, ...postDocSnap.data() };
            }
          } catch (err) {
            console.error(`Error loading saved post item ${savedItem.postId}:`, err);
          }
          return null;
        });

        const fetched = await Promise.all(postPromises);
        const validPosts = fetched.filter(p => p !== null && p !== undefined);
        setPosts(validPosts);
      } catch (error) {
        console.error("Error fetching readLater items:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSavedPosts();
  }, [user]);

  // Handle case where post is removed page-side (we can optionally support reactive updates, 
  // but standard reload or filtering out state directly is robust. Let's subscribe or just local state filter if they un-bookmark)
  // Let's add an action handler so if they un-bookmark, it eventually syncs or they can refresh.
  // To keep it clean and performant, we can listen or just show what we fetched. 

  if (!user) {
    return (
      <div className="min-h-screen bg-transparent pt-20 pb-32 px-12 flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-8 glass-panel p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
          <div className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-inner",
            theme === 'dark' ? "bg-white/5 text-purple-400" : "bg-purple-500/5 text-purple-600"
          )}>
            <Bookmark className="w-10 h-10 animate-pulse" />
          </div>
          <div className="space-y-3">
            <h2 className={cn(
              "text-3xl font-serif italic tracking-tight font-light",
              theme === 'dark' ? "text-zinc-100" : "text-zinc-900"
            )}>
              Archive Locked
            </h2>
            <p className={cn(
              "text-xs font-serif italic leading-relaxed",
              theme === 'dark' ? "text-zinc-500" : "text-zinc-650"
            )}>
              The threads of read-later fragments are tied intimately to your soul's identity. Sign in to reveal them.
            </p>
          </div>
          <button
            onClick={login}
            className={cn(
              "w-full py-4 rounded-full font-bold text-xs tracking-[0.2em] uppercase transition-all duration-300 hover:scale-[1.02] active:scale-95 cursor-pointer shadow-lg",
              theme === 'dark' ? "bg-white text-black hover:bg-zinc-100" : "bg-zinc-950 text-white hover:bg-zinc-800"
            )}
          >
            Access Your Archive
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent pt-10 pb-32 px-12 transition-colors duration-500">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className={cn(
          "flex flex-col md:flex-row md:items-end justify-between border-b pb-12 gap-8",
          theme === 'dark' ? "border-white/5" : "border-black/5"
        )}>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-purple-500 pb-2 border-b-2 border-purple-500">
                Your Library
              </span>
            </div>
            
            <div>
              <h2 className={cn(
                "text-6xl font-serif font-light italic tracking-tight",
                theme === 'dark' ? "text-zinc-100" : "text-zinc-900"
              )}>
                Read Later
              </h2>
              <p className={cn(
                "text-xs font-serif italic mt-3 transition-colors",
                theme === 'dark' ? "text-zinc-500" : "text-zinc-600"
              )}>
                Curated fragments of ink and voice, kept safe for quiet midnights.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-full border border-black/5 dark:border-white/5">
              <div className={cn(
                "p-3 rounded-full transition-all text-purple-500 bg-white dark:bg-zinc-900 shadow-sm"
              )}>
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-12 space-y-12">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {[1, 2, 3].map(i => (
                  <div key={i} className={cn(
                    "h-80 rounded-[32px] animate-pulse",
                    theme === 'dark' ? "bg-white/[0.02]" : "bg-zinc-100"
                  )} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {posts.length > 0 ? (
                  posts.map(post => (
                    <PostCard key={post.id} post={post} />
                  ))
                ) : (
                  <div className="col-span-full py-40 text-center space-y-6 max-w-lg mx-auto">
                    <div className={cn(
                      "w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-inner",
                      theme === 'dark' ? "bg-white/5 text-white/10" : "bg-zinc-100 text-zinc-300"
                    )}>
                      <Bookmark className="w-10 h-10" />
                    </div>
                    <div className="space-y-3">
                      <h3 className={cn(
                        "font-serif italic text-2xl transition-colors",
                        theme === 'dark' ? "text-white/40" : "text-zinc-500"
                      )}>
                        Your library is resting
                      </h3>
                      <p className={cn(
                        "text-xs font-serif italic leading-relaxed",
                        theme === 'dark' ? "text-zinc-500" : "text-zinc-600"
                      )}>
                        You haven't added any whispers to read later. Explore the community flows to discover some echoes.
                      </p>
                    </div>
                    <Link
                      to="/explore"
                      className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-purple-500 text-white font-bold text-xs tracking-[0.2em] rounded-full hover:bg-purple-600 transition-all cursor-pointer shadow-lg hover:shadow-purple-500/10"
                    >
                      <Sparkles className="w-4 h-4" />
                      EXPLORE ECHOES
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <AmbienceToggle />
    </div>
  );
}
