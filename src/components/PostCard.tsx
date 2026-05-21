import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Tag, Music, Feather, Check, Twitter, Facebook, MessageSquare, Link as LinkIcon, Trash2, Bookmark, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { doc, getDoc, setDoc, deleteDoc, updateDoc, increment, serverTimestamp, collection, query, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { AudioPlayer } from './AudioPlayer';

interface PostCardProps {
  post: {
    id: string;
    authorId: string;
    authorName: string;
    authorPhoto: string;
    title?: string;
    content: string;
    tags?: string[];
    mood?: string;
    audioUrl?: string;
    audiomp3?: string;
    moderationStatus?: 'approved' | 'flagged' | 'pending';
    likesCount: number;
    commentCount: number;
    createdAt: any;
  };
}

export function PostCard({ post }: PostCardProps) {
  const { theme } = useTheme();
  const { user, login } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [isLiking, setIsLiking] = useState(false);
  const [showBurst, setShowBurst] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  // Read later states
  const [isReadLater, setIsReadLater] = useState(false);
  const [isReadLaterLoading, setIsReadLaterLoading] = useState(false);

  // Error state for human-facing failures
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showError = (message: string) => {
    setErrorMessage(message);
    setTimeout(() => {
      setErrorMessage(null);
    }, 6000);
  };

  // Comments states
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeletePost = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || user.uid !== post.authorId) return;

    const confirmDelete = window.confirm("Are you sure you want to delete this whisper forever into the ink of time?");
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      const postRef = doc(db, 'posts', post.id);
      await deleteDoc(postRef);
      window.location.reload();
    } catch (error) {
      console.error("Error deleting post:", error);
      try {
        handleFirestoreError(error, OperationType.DELETE, `posts/${post.id}`);
      } catch (err: any) {
        showError(err.message || "Failed to delete whisper.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const date = post.createdAt?.toDate ? post.createdAt.toDate() : new Date();

  const getPostUrl = () => {
    return `${window.location.origin}/post/${post.id}`;
  };

  const copyToClipboard = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(getPostUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  useEffect(() => {
    setLikesCount(post.likesCount);
  }, [post.likesCount]);

  useEffect(() => {
    if (!user) {
      setLiked(false);
      return;
    }
    const checkLike = async () => {
      try {
        const likeRef = doc(db, 'likes', `${user.uid}_${post.id}`);
        const likeSnap = await getDoc(likeRef);
        setLiked(likeSnap.exists());
      } catch (error) {
        console.error("Error checking like status:", error);
      }
    };
    checkLike();
  }, [user, post.id]);

  useEffect(() => {
    if (!user) {
      setIsReadLater(false);
      return;
    }
    const checkReadLater = async () => {
      try {
        const readLaterId = `${user.uid}_${post.id}`;
        const ref = doc(db, 'readLater', readLaterId);
        const snap = await getDoc(ref);
        setIsReadLater(snap.exists());
      } catch (error) {
        console.error("Error checking readLater status:", error);
      }
    };
    checkReadLater();
  }, [user, post.id]);

  const handleReadLater = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      login();
      return;
    }

    if (isReadLaterLoading) return;

    const newStatus = !isReadLater;
    setIsReadLater(newStatus);
    setIsReadLaterLoading(true);

    try {
      const readLaterId = `${user.uid}_${post.id}`;
      const ref = doc(db, 'readLater', readLaterId);

      if (newStatus) {
        await setDoc(ref, {
          userId: user.uid,
          postId: post.id,
          createdAt: serverTimestamp()
        });
      } else {
        await deleteDoc(ref);
      }
    } catch (error) {
      setIsReadLater(!newStatus);
      try {
        handleFirestoreError(error, OperationType.WRITE, `readLater/${user.uid}_${post.id}`);
      } catch (err: any) {
        showError(err.message);
      }
    } finally {
      setIsReadLaterLoading(false);
    }
  };

  // Comments live subscription
  useEffect(() => {
    if (!showComments) return;

    const commentsRef = collection(db, 'posts', post.id, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: any[] = [];
      snapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() });
      });
      setComments(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `posts/${post.id}/comments`);
    });

    return () => unsubscribe();
  }, [showComments, post.id]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      login();
      return;
    }

    if (isLiking) return;

    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount(prev => prev + (newLiked ? 1 : -1));
    setIsLiking(true);

    if (newLiked) {
      setShowBurst(true);
      setTimeout(() => setShowBurst(false), 600);
    }

    try {
      const likeId = `${user.uid}_${post.id}`;
      const likeRef = doc(db, 'likes', likeId);
      const postRef = doc(db, 'posts', post.id);

      if (newLiked) {
        await setDoc(likeRef, {
          userId: user.uid,
          postId: post.id,
          createdAt: serverTimestamp()
        });
        await updateDoc(postRef, {
          likesCount: increment(1)
        });
      } else {
        await deleteDoc(likeRef);
        await updateDoc(postRef, {
          likesCount: increment(-1)
        });
      }
    } catch (error) {
      // Revert optimistic updates on error
      setLiked(!newLiked);
      setLikesCount(prev => prev + (newLiked ? -1 : 1));
      try {
        handleFirestoreError(error, OperationType.WRITE, `likes/${user.uid}_${post.id}`);
      } catch (err: any) {
        showError(err.message);
      }
    } finally {
      setIsLiking(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!user) {
      login();
      return;
    }

    setIsSubmitting(true);
    const commentContent = newComment.trim();

    try {
      const commentData = {
        postId: post.id,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous User',
        authorPhoto: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
        content: commentContent,
        createdAt: serverTimestamp()
      };

      const commentsRef = collection(db, 'posts', post.id, 'comments');
      await addDoc(commentsRef, commentData);

      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, {
        commentCount: increment(1)
      });

      setNewComment("");
    } catch (err) {
      console.error("Error writing comment:", err);
      try {
        handleFirestoreError(err, OperationType.WRITE, `posts/${post.id}/comments`);
      } catch (mappedErr: any) {
        showError(mappedErr.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'posts', post.id, 'comments', commentId));
      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, {
        commentCount: increment(-1)
      });
    } catch (err) {
      console.error("Error deleting comment:", err);
      try {
        handleFirestoreError(err, OperationType.WRITE, `posts/${post.id}/comments/${commentId}`);
      } catch (mappedErr: any) {
        showError(mappedErr.message);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover="hover"
      className={cn(
        "glass-panel rounded-[40px] p-10 transition-all duration-[700ms] group relative overflow-hidden",
        "hover:-translate-y-2",
        theme === 'dark' 
          ? "hover:border-purple-500/30 hover:shadow-[0_0_100px_-20px_rgba(168,85,247,0.15)] shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]" 
          : "hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/10",
        post.moderationStatus === 'flagged' && "border-red-500/20"
      )}
    >
      {/* Ink Spread Effect on Hover */}
      <motion.div 
        variants={{
          hover: { scale: 6, opacity: 0.08 }
        }}
        initial={{ scale: 0, opacity: 0 }}
        transition={{ duration: 2, ease: [0.32, 0.72, 0, 1] }}
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 blur-[120px] rounded-full pointer-events-none z-0",
          theme === 'dark' ? "bg-purple-500" : "bg-purple-400"
        )}
      />
      {post.moderationStatus === 'flagged' && (
        <div className="absolute top-0 left-0 w-full bg-red-500/10 py-1 flex items-center justify-center gap-2 border-b border-red-500/20 z-20">
          <span className="text-[10px] text-red-400 font-bold tracking-[0.3em] uppercase">Flagged: Pending Review</span>
        </div>
      )}
      <div className={cn(
        "absolute top-0 right-0 p-8 transition-opacity",
        theme === 'dark' ? "opacity-5 group-hover:opacity-10" : "opacity-10 group-hover:opacity-20"
      )}>
        <Feather className="w-20 h-20" />
      </div>

      <div className="flex items-start justify-between mb-10 relative z-10">
        <Link to={`/profile/${post.authorId}`} className="flex items-center gap-4">
          <div className="relative">
            <img 
              src={post.authorPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.authorId}`} 
              alt={post.authorName} 
              className={cn(
                "w-12 h-12 rounded-full border-2 transition-all",
                theme === 'dark' ? "border-white/10 grayscale hover:grayscale-0" : "border-zinc-200"
              )} 
            />
            <div className="absolute inset-0 rounded-full border border-purple-500/0 group-hover:border-purple-500/20 transition-all"></div>
          </div>
          <div>
            <h4 className={cn(
              "font-medium group-hover:text-purple-400 transition-colors",
              theme === 'dark' ? "text-white/90" : "text-zinc-900"
            )}>{post.authorName}</h4>
            <p className={cn(
              "text-[10px] uppercase tracking-wider",
              theme === 'dark' ? "text-white/30" : "text-zinc-500"
            )}>
              {Math.ceil(post.content.length / 500)} min read • {formatDistanceToNow(date)} ago
            </p>
          </div>
        </Link>
        {post.mood && (
          <span className="px-3 py-1 bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase tracking-[0.2em] rounded-full border border-purple-500/20">
            {post.mood}
          </span>
        )}
      </div>

      {post.title && (
        <h3 className={cn(
          "text-3xl font-serif font-light mb-5 tracking-tight leading-tight italic transition-all",
          theme === 'dark' 
            ? "text-white/95 text-shadow-md hover:text-shadow-purple" 
            : "text-zinc-900 text-shadow-sm"
        )}>
          {post.title}
        </h3>
      )}

      <div className={cn(
        "prose prose-zinc max-w-2xl mb-10 font-serif italic text-xl md:text-2xl leading-[1.8] mask-fade-bottom",
        theme === 'dark' ? "prose-invert text-zinc-400" : "text-zinc-600"
      )}>
        <ReactMarkdown>{post.content}</ReactMarkdown>
      </div>

      {(post.audiomp3 || post.audioUrl) && (
        <div className="mb-8">
          <AudioPlayer 
            url={post.audiomp3 || post.audioUrl || ""} 
            title={post.title || "Spoken Word Poem"} 
            author={post.authorName} 
          />
        </div>
      )}

      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: 10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className={cn(
              "text-xs p-4 rounded-3xl mb-6 flex items-start gap-3 border transition-all relative z-10",
              theme === 'dark' 
                ? "text-red-400 bg-red-500/10 border-red-500/20" 
                : "text-red-600 bg-red-500/5 border-red-200"
            )}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-serif italic pr-4">
              {errorMessage}
            </div>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setErrorMessage(null);
              }}
              className="hover:opacity-75 cursor-pointer font-bold px-1.5 py-0.5 rounded-lg text-lg line-height-none absolute top-2 right-2 text-current"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn(
        "flex items-center gap-4 pt-6 border-t",
        theme === 'dark' ? "border-white/5" : "border-zinc-100"
      )}>
        <button 
          onClick={handleLike}
          disabled={isLiking}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 relative overflow-hidden group",
            liked 
              ? theme === 'dark' 
                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" 
                : "bg-purple-500/5 text-purple-600 border border-purple-500/10"
              : theme === 'dark' 
                ? "text-white/40 bg-white/5 hover:bg-white/10 hover:text-purple-400 border border-transparent" 
                : "text-zinc-500 bg-zinc-100 hover:bg-zinc-200/80 hover:text-purple-600 border border-transparent"
          )}
        >
          <motion.div
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.85 }}
            animate={showBurst ? { 
              scale: [1, 1.45, 0.9, 1.15, 1],
              rotate: [0, -15, 15, -5, 0]
            } : { 
              scale: 1, 
              rotate: 0 
            }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="flex items-center justify-center relative"
          >
            <Heart 
              className={cn(
                "w-4 h-4 transition-colors duration-300 relative z-10",
                liked ? "fill-current" : ""
              )} 
            />
            <AnimatePresence>
              {showBurst && (
                <>
                  <motion.span
                    initial={{ scale: 0, opacity: 0.8 }}
                    animate={{ scale: 3.5, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="absolute w-4 h-4 bg-purple-500 rounded-full pointer-events-none z-0"
                  />
                  <motion.span
                    initial={{ scale: 0, opacity: 0.5 }}
                    animate={{ scale: 5, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.02 }}
                    className="absolute w-4 h-4 border border-purple-400 rounded-full pointer-events-none z-0"
                  />
                  {/* Elegant particle burst */}
                  {[...Array(6)].map((_, i) => {
                    const angle = (i * 60 * Math.PI) / 180;
                    const distance = 22;
                    const x = Math.cos(angle) * distance;
                    const y = Math.sin(angle) * distance;
                    return (
                      <motion.span
                        key={i}
                        initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                        animate={{ x, y, scale: [0, 1.5, 0], opacity: [1, 1, 0] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.02 }}
                        className={cn(
                          "absolute w-1 h-1 rounded-full pointer-events-none z-0",
                          theme === 'dark' ? "bg-purple-400" : "bg-purple-600"
                        )}
                      />
                    );
                  })}
                </>
              )}
            </AnimatePresence>
          </motion.div>
          <span className="text-xs font-mono font-medium">{likesCount}</span>
        </button>

        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowComments(!showComments);
          }}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 border cursor-pointer",
            showComments
              ? theme === 'dark' 
                ? "bg-purple-500/10 text-purple-400 border-purple-500/20" 
                : "bg-purple-500/5 text-purple-600 border-purple-500/10"
              : theme === 'dark' 
                ? "text-white/40 bg-white/5 hover:bg-white/10 hover:text-purple-400 border-transparent" 
                : "text-zinc-500 bg-zinc-100 hover:bg-zinc-200/80 hover:text-purple-600 border-transparent"
          )}
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-xs font-mono font-medium">{comments.length > 0 ? comments.length : post.commentCount}</span>
        </button>

        <button 
          onClick={handleReadLater}
          disabled={isReadLaterLoading}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 border cursor-pointer",
            isReadLater
              ? theme === 'dark' 
                ? "bg-purple-500/10 text-purple-400 border-purple-500/20" 
                : "bg-purple-500/5 text-purple-600 border-purple-500/10"
              : theme === 'dark' 
                ? "text-white/40 bg-white/5 hover:bg-white/10 hover:text-purple-400 border-transparent" 
                : "text-zinc-500 bg-zinc-100 hover:bg-zinc-200/80 hover:text-purple-600 border-transparent"
          )}
          title={isReadLater ? "Remove from Read Later" : "Read Later"}
        >
          <Bookmark className={cn("w-4 h-4 transition-colors duration-300", isReadLater ? "fill-current text-purple-500 dark:text-purple-400" : "")} />
          <span className="text-xs font-sans font-medium">{isReadLater ? "Saved" : "Save"}</span>
        </button>

        {user?.uid === post.authorId && (
          <div className="flex items-center gap-2">
            <Link
              to={`/edit/${post.id}`}
              onClick={(e) => {
                e.stopPropagation();
              }}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-full border transition-all duration-300 text-xs font-sans font-medium hover:scale-105 active:scale-95",
                theme === 'dark' 
                  ? "text-zinc-300 bg-white/5 hover:bg-white/10 hover:text-purple-400 border-white/5" 
                  : "text-zinc-600 bg-zinc-100 hover:bg-zinc-200/80 hover:text-purple-600 border-transparent"
              )}
              title="Edit original write"
            >
              <Feather className="w-3.5 h-3.5" />
              <span>Edit</span>
            </Link>
            
            <button
              onClick={handleDeletePost}
              disabled={isDeleting}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-full border transition-all duration-300 text-xs font-sans font-medium hover:scale-105 active:scale-95 cursor-pointer",
                theme === 'dark' 
                  ? "text-red-400 bg-red-500/10 hover:bg-red-500/20 border-red-500/5" 
                  : "text-red-600 bg-red-500/5 hover:bg-red-500/10 border-transparent"
              )}
              title="Delete publish"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? "Deleting..." : "Delete"}</span>
            </button>
          </div>
        )}

        <div className="relative ml-auto">
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowShareMenu(!showShareMenu);
            }}
            className={cn(
              "p-2 rounded-full transition-all duration-300 hover:scale-105 active:scale-95",
              showShareMenu
                ? theme === 'dark' ? "text-purple-400 bg-white/5" : "text-purple-600 bg-zinc-100"
                : theme === 'dark' ? "text-white/30 hover:text-white bg-white/0 hover:bg-white/5" : "text-zinc-300 hover:text-zinc-600 bg-zinc-0 hover:bg-zinc-100"
            )}
          >
            <Share2 className="w-4 h-4" />
          </button>

          <AnimatePresence>
            {showShareMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowShareMenu(false);
                  }} 
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className={cn(
                    "absolute right-0 bottom-full mb-3 z-50 w-56 p-2 rounded-2xl shadow-2xl border backdrop-blur-2xl flex flex-col gap-1",
                    theme === 'dark' 
                      ? "bg-zinc-950/95 border-white/10 text-zinc-300" 
                      : "bg-white/95 border-zinc-200 text-zinc-700"
                  )}
                >
                  <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500 border-b border-zinc-500/10 mb-1">
                    Share Writing
                  </div>
                  
                  <button
                    onClick={copyToClipboard}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-medium transition-all duration-200 w-full cursor-pointer",
                      theme === 'dark' ? "hover:bg-white/5" : "hover:bg-zinc-100"
                    )}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-green-500 font-medium font-sans">Copied Link!</span>
                      </>
                    ) : (
                      <>
                        <LinkIcon className="w-3.5 h-3.5 text-purple-500" />
                        <span className="font-sans">Copy Direct Link</span>
                      </>
                    )}
                  </button>

                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                      `“${post.title || 'Whispers in Ink...'}” by ${post.authorName} on @WhispersInInk\n`
                    )}&url=${encodeURIComponent(getPostUrl())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowShareMenu(false)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-medium transition-all duration-200 w-full",
                      theme === 'dark' ? "hover:bg-white/5" : "hover:bg-zinc-100"
                    )}
                  >
                    <Twitter className="w-3.5 h-3.5 text-sky-400" />
                    <span className="font-sans">Share on X / Twitter</span>
                  </a>

                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getPostUrl())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowShareMenu(false)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-medium transition-all duration-200 w-full",
                      theme === 'dark' ? "hover:bg-white/5" : "hover:bg-zinc-100"
                    )}
                  >
                    <Facebook className="w-3.5 h-3.5 text-blue-500" />
                    <span className="font-sans">Share on Facebook</span>
                  </a>

                  <a
                    href={`https://www.reddit.com/submit?url=${encodeURIComponent(getPostUrl())}&title=${encodeURIComponent(post.title || 'A beautiful writing on Whispers in Ink')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowShareMenu(false)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-medium transition-all duration-200 w-full",
                      theme === 'dark' ? "hover:bg-white/5" : "hover:bg-zinc-100"
                    )}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-orange-500" />
                    <span className="font-sans">Share on Reddit</span>
                  </a>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className={cn(
              "mt-8 pt-8 border-t flex flex-col gap-6",
              theme === 'dark' ? "border-white/5" : "border-zinc-100"
            )}>
              <div className="flex items-center justify-between">
                <h3 className={cn(
                  "text-sm font-bold uppercase tracking-[0.2em] font-sans",
                  theme === 'dark' ? "text-purple-400/90" : "text-purple-600/90"
                )}>
                  Responses ({comments.length})
                </h3>
              </div>

              {/* Comments List */}
              <div className="flex flex-col gap-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                {comments.length > 0 ? (
                  comments.map((comment) => {
                    const cDate = comment.createdAt?.toDate ? comment.createdAt.toDate() : new Date();
                    const isAuthor = user?.uid === comment.authorId;
                    return (
                      <div 
                        key={comment.id}
                        className={cn(
                          "p-4 rounded-[24px] border flex gap-4 transition-all duration-300 relative group/comment",
                          theme === 'dark' 
                            ? "bg-white/[0.02] border-white/5 hover:bg-white/[0.04]" 
                            : "bg-zinc-50 border-zinc-100 hover:bg-zinc-150/50"
                        )}
                      >
                        <Link to={`/profile/${comment.authorId}`} className="shrink-0">
                          <img 
                            src={comment.authorPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.authorId}`}
                            alt={comment.authorName}
                            className={cn(
                              "w-8 h-8 rounded-full border",
                              theme === 'dark' ? "border-white/10" : "border-zinc-200"
                            )}
                          />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2 mb-1">
                            <Link 
                              to={`/profile/${comment.authorId}`}
                              className={cn(
                                "text-xs font-semibold font-sans hover:text-purple-500 transition-colors truncate",
                                theme === 'dark' ? "text-zinc-200" : "text-zinc-800"
                              )}
                            >
                              {comment.authorName}
                            </Link>
                            <span className={cn(
                              "text-[10px] font-mono shrink-0",
                              theme === 'dark' ? "text-zinc-500" : "text-zinc-400"
                            )}>
                              {formatDistanceToNow(cDate)} ago
                            </span>
                          </div>
                          <p className={cn(
                            "text-xs font-sans leading-relaxed whitespace-pre-wrap break-words",
                            theme === 'dark' ? "text-zinc-300" : "text-zinc-600"
                          )}>
                            {comment.content}
                          </p>
                        </div>

                        {/* Delete comment on hover */}
                        {isAuthor && (
                          <button
                            onClick={(e) => handleDeleteComment(comment.id, e)}
                            className={cn(
                              "absolute right-4 top-4 p-1.5 rounded-full opacity-0 group-hover/comment:opacity-100 transition-all active:scale-90 cursor-pointer",
                              theme === 'dark' 
                                ? "text-red-400 bg-red-500/10 hover:bg-red-500/20" 
                                : "text-red-600 bg-red-500/5 hover:bg-red-500/10"
                            )}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className={cn(
                    "text-xs font-serif italic text-center py-6",
                    theme === 'dark' ? "text-zinc-500" : "text-zinc-400"
                  )}>
                    Silence fills the air. Write the first response.
                  </p>
                )}
              </div>

              {/* Add Comment Section */}
              {user ? (
                <form onSubmit={handleSubmitComment} className="flex gap-3 items-end">
                  <div className="relative flex-1 min-w-0">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Whisper a response..."
                      maxLength={1000}
                      rows={2}
                      className={cn(
                        "w-full px-5 py-3.5 rounded-2xl border text-xs font-serif italic focus:outline-none focus:ring-1 transition-all resize-none",
                        theme === 'dark'
                          ? "bg-zinc-900 border-white/5 focus:border-purple-500/40 focus:ring-purple-500/20 text-zinc-200 placeholder:text-zinc-600"
                          : "bg-zinc-50 border-zinc-200 focus:border-purple-500/50 focus:ring-purple-500/20 text-zinc-800 placeholder:text-zinc-400"
                      )}
                    />
                    <div className={cn(
                      "absolute right-4 bottom-2 text-[9px] font-mono",
                      theme === 'dark' ? "text-zinc-600" : "text-zinc-400"
                    )}>
                      {newComment.length}/1000
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newComment.trim()}
                    className={cn(
                      "px-6 py-3.5 rounded-2xl text-[10px] font-bold tracking-[0.2em] uppercase transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed h-fit cursor-pointer",
                      theme === 'dark'
                        ? "bg-white text-black hover:scale-105 active:scale-95"
                        : "bg-black text-white hover:scale-105 active:scale-95"
                    )}
                  >
                    {isSubmitting ? "Sending..." : "Whisper"}
                  </button>
                </form>
              ) : (
                <div className={cn(
                  "p-6 rounded-2xl border text-center flex flex-col items-center gap-3",
                  theme === 'dark' ? "border-white/5 bg-white/[0.02]" : "border-zinc-100 bg-zinc-50"
                )}>
                  <p className={cn(
                    "text-xs font-serif italic",
                    theme === 'dark' ? "text-zinc-400" : "text-zinc-500"
                  )}>
                    You must be signed in to leave a response.
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      login();
                    }}
                    className="px-6 py-2.5 rounded-full text-[9px] font-bold tracking-[0.2em] uppercase bg-purple-500 text-white hover:bg-purple-600 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
