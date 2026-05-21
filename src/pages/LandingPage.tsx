import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Heart, Feather, Music, BookOpen, Coffee, Quote, Instagram, Twitter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PostCard } from '../components/PostCard';
import { InkDivider } from '../components/InkDivider';
import { MidnightThought } from '../components/MidnightThought';
import { OpenWhen } from '../components/OpenWhen';
import { curatedWritings } from '../data/curatedWritings';

export function LandingPage() {
  const { login, user } = useAuth();
  const { theme } = useTheme();
  const [featuredPosts, setFeaturedPosts] = useState<any[]>(curatedWritings);

  useEffect(() => {
    async function fetchFeatured() {
      try {
        const q = query(
          collection(db, 'posts'),
          where('moderationStatus', '==', 'approved'),
          orderBy('createdAt', 'desc'),
          limit(2)
        );
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (docs.length > 0) {
          setFeaturedPosts([...docs, ...curatedWritings]);
        } else {
          setFeaturedPosts(curatedWritings);
        }
      } catch (err) {
        console.error('Error fetching featured posts:', err);
        setFeaturedPosts(curatedWritings);
      }
    }
    fetchFeatured();
  }, []);

  return (
    <div className={cn(
      "min-h-screen relative overflow-hidden transition-colors duration-500",
      theme === 'dark' ? "bg-[#08080a] text-zinc-100" : "bg-[#f8f5f2] text-[#1a1a1a]"
    )}>
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0">
        <div className={cn(
          "absolute top-0 left-0 w-full h-[100vh] pointer-events-none opacity-20",
          theme === 'dark' ? "bg-gradient-to-b from-purple-900/20 to-transparent" : "bg-gradient-to-b from-purple-500/5 to-transparent"
        )} />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 px-6 md:px-12 pt-16 md:pt-32 pb-40 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          <div className="lg:col-span-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="h-px w-12 bg-purple-500/30" />
                <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-purple-500/60">
                  A Pen Name by Abhinav
                </span>
              </div>
              
              <h1 className="text-7xl md:text-[13rem] font-serif font-light tracking-tighter leading-[0.8] mb-8 italic ink-spread-hover">
                Stories written <br /> 
                <span className={cn(
                  "not-italic relative group transition-colors",
                  theme === 'dark' ? "text-white" : "text-zinc-900"
                )}>
                  between
                  <span className="absolute bottom-4 left-0 w-0 h-1 bg-purple-500/20 group-hover:w-full transition-all duration-1000" />
                </span> 
                <br /> 
                silence & <span className="ink-cursor">insomnia</span>.
              </h1>

              <div className="max-w-2xl">
                <div className="mb-12">
                   <p className={cn(
                    "text-2xl md:text-3xl font-serif italic leading-relaxed",
                    theme === 'dark' ? "text-zinc-400" : "text-zinc-600"
                  )}>
                    “I started writing because some thoughts become too loud when left alone.”
                  </p>
                  <p className="text-purple-500 font-serif italic text-lg mt-4 opacity-80">
                    For the thoughts that refuse to stay quiet.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-8">
                  <Link 
                    to="/explore"
                    className={cn(
                      "group relative px-12 py-6 font-bold text-[11px] tracking-[0.3em] uppercase rounded-full overflow-hidden transition-all hover:scale-105 hover-glow active:scale-95 shadow-2xl ink-spread-hover",
                      theme === 'dark' ? "bg-white text-black" : "bg-zinc-900 text-white shadow-zinc-900/20"
                    )}
                  >
                    <span className="relative z-10">Read My Writing</span>
                  </Link>

                  <button 
                    onClick={login}
                    className={cn(
                      "group relative px-12 py-6 font-bold text-[11px] tracking-[0.3em] uppercase rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-xl ink-spread-hover border",
                      theme === 'dark' 
                        ? "border-purple-500/20 bg-[#6b21a8]/10 text-purple-300 hover:border-purple-500/40" 
                        : "border-purple-500/20 bg-purple-500/5 text-purple-700 hover:border-purple-500/40 shadow-purple-500/5"
                    )}
                  >
                    <span className="relative z-10">Write Something</span>
                  </button>
                  
                  <button 
                    onClick={login}
                    className={cn(
                      "font-bold text-[11px] tracking-[0.3em] uppercase transition-all border-b-2 pb-1 ink-underline",
                      theme === 'dark' ? "text-white/40 hover:text-white border-white/5" : "text-zinc-400 hover:text-zinc-900 border-zinc-900/5 transition-colors"
                    )}
                  >
                    Join the Circle
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Side Profile Card (About) */}
          <div className="lg:col-span-4 lg:pt-20">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="glass-panel p-8 rounded-[40px] sticky top-32 group"
            >
              <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 -rotate-12">
                <span className="font-serif italic text-purple-500/20 text-4xl select-none">Abhinav</span>
              </div>
              <div className="relative mb-8 group-inner">
                <div className="w-20 h-20 bg-purple-500/5 dark:bg-white/5 rounded-2xl flex items-center justify-center border border-black/5 dark:border-white/10 group-hover:border-purple-500/30 transition-all duration-500">
                   <span className="text-3xl font-serif italic text-purple-500 opacity-40 group-hover:opacity-100 transition-opacity">A</span>
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white dark:bg-[#08080a] border border-black/5 dark:border-white/10 rounded-lg flex items-center justify-center">
                  <Feather className="w-4 h-4 text-purple-400" />
                </div>
              </div>

              <h2 className="text-3xl font-serif italic mb-4">Abhinav</h2>
              <p className={cn(
                "font-serif italic leading-relaxed text-lg mb-8 transition-colors",
                theme === 'dark' ? "text-zinc-500" : "text-zinc-600"
              )}>
                Most of these pieces were written late at night with coffee going cold beside me. I'm just here to translate the quiet chaos of being human into something you can hold.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-[10px] tracking-[0.2em] uppercase font-bold text-zinc-500">
                  <Coffee className="w-3 h-3 text-purple-400/60" />
                  Currently Drinking: Cold Brew
                </div>
                <div className="flex items-center gap-3 text-[10px] tracking-[0.2em] uppercase font-bold text-zinc-500">
                  <BookOpen className="w-3 h-3 text-purple-400/60" />
                  Currently Reading: "No Longer Human"
                </div>
              </div>

              <div className={cn(
                "flex gap-4 mt-8 pt-8 border-t transition-colors",
                theme === 'dark' ? "border-white/5" : "border-black/5"
              )}>
                <a 
                  href="https://www.instagram.com/abhi.nv.6?igsh=MWpmZGY0ZG85aGUxcA==" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-zinc-600 hover:text-purple-400 transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <InkDivider />
      <MidnightThought />

      <section className="relative z-10 px-6 md:px-12 pb-40">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-6 mb-16">
            <div className="h-px w-10 bg-purple-500/30" />
            <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-purple-500/60">Archives by Mood</span>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { name: 'Midnight Thoughts', count: 12, offset: false },
              { name: 'Letters Not Sent', count: 8, offset: true },
              { name: 'Dark Fiction', count: 15, offset: false },
              { name: 'Poetic Fragments', count: 24, offset: true }
            ].map((cat, i) => (
              <Link 
                key={i}
                to="/explore"
                className={cn(
                    "glass-panel p-8 rounded-[32px] hover:border-purple-500/20 group transition-all duration-700 ink-spread-hover",
                    cat.offset ? "lg:mt-16" : "lg:mb-16"
                )}
              >
                <h4 className="text-xl font-serif italic mb-2 group-hover:text-purple-400 transition-colors">{cat.name}</h4>
                <p className="text-[10px] tracking-widest text-zinc-500 uppercase font-bold">{cat.count} Whispers</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 md:px-12 py-40 bg-zinc-900/5 dark:bg-white/[0.02] border-y border-black/5 dark:border-white/5">
        <div className="max-w-4xl mx-auto text-center">
            <Quote className="w-16 h-16 text-purple-500/10 mx-auto mb-12" />
            <h2 className={cn(
                "text-4xl md:text-6xl font-serif italic leading-tight mb-8",
                theme === 'dark' ? "text-zinc-200" : "text-zinc-800"
            )}>
                “Some thoughts become stories because silence cannot hold them anymore.”
            </h2>
            <div className="w-12 h-px bg-purple-500 relative mx-auto after:content-[''] after:absolute after:inset-0 after:blur-md after:bg-purple-500" />
        </div>
      </section>

      <InkDivider />
      <OpenWhen />

      {/* Start Here / Featured Section */}
      <section className="relative z-10 px-6 md:px-12 py-32 md:pb-40">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-20 md:mb-28 border-b border-white/5 pb-8 gap-8">
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold tracking-[0.5em] uppercase text-purple-500">Curated Entry</h4>
              <h2 className="text-5xl md:text-6xl font-serif font-light italic">Start Here.</h2>
            </div>
            <Link to="/explore" className="text-[10px] tracking-[0.4em] uppercase text-purple-500 transition-colors hover:text-purple-400 ink-underline pb-1 w-fit">The Full Archive</Link>
          </div>

          <div className="space-y-32 md:space-y-20">
            {featuredPosts.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-16 items-center">
                <div className="lg:col-span-6">
                    <PostCard post={featuredPosts[0]} />
                </div>
                <div className="lg:col-span-5 lg:col-start-8">
                    <div className="space-y-8 md:space-y-12">
                        <Quote className="w-10 h-10 text-purple-500/20" />
                        <h3 className="text-4xl md:text-5xl font-serif italic leading-tight">
                            “The first step into the archive is often the hardest. Begin with a piece that resonates with the quietest part of you.”
                        </h3>
                        <p className={cn(
                            "text-lg md:text-xl font-serif italic leading-relaxed",
                            theme === 'dark' ? "text-zinc-500" : "text-zinc-600"
                        )}>
                            This featured piece is selected manually for its emotional weight. It represents the core essence of Whispers in Ink.
                        </p>
                        <div className="pt-8 md:pt-12 flex flex-wrap gap-8 items-center">
                             <Link 
                              to={`/post/${featuredPosts[0].id}`}
                              className={cn(
                                "px-10 py-5 font-bold text-[10px] tracking-[0.3em] uppercase rounded-full transition-all hover:scale-105 active:scale-95 ink-spread-hover",
                                theme === 'dark' ? "bg-white text-black" : "bg-black text-white"
                              )}
                            >
                              Read Now
                            </Link>

                             <Link 
                              to="/explore"
                              className="inline-flex items-center gap-3 text-[10px] font-bold tracking-[0.5em] uppercase text-zinc-500 hover:text-purple-500 transition-all group"
                            >
                              <span>Archive</span>
                              <div className="w-8 h-px bg-zinc-500/30 group-hover:bg-purple-500/50 transition-all group-hover:w-16" />
                            </Link>
                        </div>
                    </div>
                </div>
              </div>
            ) : (
                <div className="h-[400px] md:h-[600px] glass-panel rounded-[40px] animate-pulse" />
            )}
          </div>
        </div>
      </section>

      {/* Moodboard / Personality Section */}
      <section className="relative z-10 px-6 md:px-12 pb-40 overflow-hidden">
        <div className="max-w-7xl mx-auto">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
             <div className="space-y-12">
               <div>
                 <Quote className="w-12 h-12 text-purple-500/20 mb-8" />
                 <h2 className="text-6xl font-serif font-light leading-tight italic mb-8">
                   “The ink doesn't lie. It just bleeds until the truth is visible.”
                 </h2>
                 <p className="text-zinc-500 font-serif italic text-xl">
                   This sanctuary was built for the 3 AM thoughts that wouldn't let me sleep. For the feelings that felt too heavy to carry but too beautiful to forget.
                 </p>
               </div>

               <div className="grid grid-cols-2 gap-8">
                 <div className="glass-panel p-8 rounded-3xl">
                   <h4 className="text-[10px] tracking-[0.3em] uppercase mb-4 text-purple-500/60 font-bold">Midnight Playlist</h4>
                   <ul className="space-y-3 text-sm font-serif italic text-zinc-400">
                     <li>Cigarettes After Sex</li>
                     <li>The Antlers</li>
                     <li>Bon Iver</li>
                  </ul>
                 </div>
                 <div className="glass-panel p-8 rounded-3xl">
                   <h4 className="text-[10px] tracking-[0.3em] uppercase mb-4 text-purple-500/60 font-bold">Aesthetic</h4>
                   <ul className="space-y-3 text-sm font-serif italic text-zinc-400">
                     <li>Subtle Grain</li>
                     <li>Purple Shadows</li>
                     <li>Empty Inkwells</li>
                  </ul>
                 </div>
               </div>
             </div>

             <div className="relative">
                <div className="grid grid-cols-2 gap-4">
                  <div className="aspect-[3/4] rounded-[40px] overflow-hidden grayscale hover:grayscale-0 transition-all duration-700 shadow-2xl">
                    <img 
                      src="https://images.unsplash.com/photo-1516414447565-b14be0adf13e?q=80&w=1000&auto=format&fit=crop" 
                      alt="Desk with antique notebook and ink pen" 
                      width={500} 
                      height={667} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="aspect-[3/4] rounded-[40px] overflow-hidden pt-12 grayscale hover:grayscale-0 transition-all duration-700 shadow-2xl">
                    <img 
                      src="https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=1000&auto=format&fit=crop" 
                      alt="Vintage quill typing set on rustic wood" 
                      width={500} 
                      height={667} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="aspect-[3/4] rounded-[40px] overflow-hidden -mt-12 grayscale hover:grayscale-0 transition-all duration-700 shadow-2xl">
                    <img 
                      src="https://images.unsplash.com/photo-1471107340929-a87cd0f5b5f3?q=80&w=1000&auto=format&fit=crop" 
                      alt="Close perspective of a writer pen tip and ink bottle" 
                      width={500} 
                      height={667} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="aspect-[3/4] rounded-[40px] overflow-hidden grayscale hover:grayscale-0 transition-all duration-700 shadow-2xl">
                    <img 
                      src="https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=1000&auto=format&fit=crop" 
                      alt="Cozy ambient study desk with warm light" 
                      width={500} 
                      height={667} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-purple-500/20 blur-[100px] rounded-full pointer-events-none" />
             </div>
           </div>
        </div>
      </section>

      <footer className={cn(
        "px-6 md:px-12 py-24 border-t",
        theme === 'dark' ? "border-white/5" : "border-black/5"
      )}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12 text-[11px] uppercase tracking-[0.4em] font-bold">
            <div className="space-y-4">
              <div className={theme === 'dark' ? "text-zinc-100" : "text-zinc-900"}>&copy; 2024 Whispers in Ink &mdash; Abhinav</div>
              <p className={cn(
                "text-[10px] tracking-[0.3em] font-serif italic normal-case lowercase leading-relaxed max-w-xs",
                theme === 'dark' ? "text-zinc-500" : "text-zinc-400"
              )}>
                Written slowly, somewhere between midnight and overthinking.
              </p>
            </div>
            <div className={cn(
                "hidden lg:block text-center flex-1 italic text-purple-500/40 normal-case",
                theme === 'dark' ? "text-white/5" : "text-black/5"
            )}>
                Silence is just another way of speaking.
            </div>
            <div className="flex gap-12 whitespace-nowrap">
               <a href="#" className="hover:text-purple-500 transition-colors ink-underline pb-1">Privacy</a>
               <a href="#" className="hover:text-purple-500 transition-colors ink-underline pb-1">Archive</a>
               <a href="https://www.instagram.com/abhi.nv.6" target="_blank" className="hover:text-purple-500 transition-colors ink-underline pb-1">Instagram</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
