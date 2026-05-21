import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { PenTool, Music, Tag, Sparkles, Send, Loader2, UploadCloud, CheckCircle2, X, Eye, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import { AudioPlayer } from '../components/AudioPlayer';

export function CreatePostPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { postId } = useParams();
  const [title, setTitle] = useState('');
  const [publishError, setPublishError] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [mood, setMood] = useState('Hopeful');
  const [audioUrl, setAudioUrl] = useState('');
  const [audiomp3, setAudiomp3] = useState('');
  const [audiomp3Name, setAudiomp3Name] = useState('');
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompts, setAiPrompts] = useState<string[]>([]);

  const characterCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  const moods = ['Sad', 'Lonely', 'Heartbroken', 'Hopeful', 'Nostalgic', 'Love', 'Melancholy', 'Peaceful'];
  
  const [fetchingPost, setFetchingPost] = useState(false);

  useEffect(() => {
    if (!postId || !user) return;

    const fetchPost = async () => {
      setFetchingPost(true);
      try {
        const postRef = doc(db, 'posts', postId);
        const postSnap = await getDoc(postRef);
        if (postSnap.exists()) {
          const postData = postSnap.data();
          if (postData.authorId !== user.uid) {
            setPublishError("You are not authorized to edit this whisper.");
            setTimeout(() => navigate('/'), 3000);
            return;
          }
          setTitle(postData.title || '');
          setContent(postData.content || '');
          setTags(postData.tags || []);
          setMood(postData.mood || 'Hopeful');
          setAudioUrl(postData.audioUrl || '');
          setAudiomp3(postData.audiomp3 || '');
          if (postData.audiomp3) {
            setAudiomp3Name(postData.audiomp3.split('/').pop()?.split('_').slice(1).join('_') || 'audio_file.mp3');
          }
        } else {
          setPublishError("The whisper you are trying to edit could not be found.");
        }
      } catch (err: any) {
        console.error("Error fetching post for edit:", err);
        try {
          handleFirestoreError(err, OperationType.GET, `posts/${postId}`);
        } catch (mappedErr: any) {
          setPublishError(mappedErr.message);
        }
      } finally {
        setFetchingPost(false);
      }
    };

    fetchPost();
  }, [postId, user, navigate]);

  const handleFileUpload = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith('audio/')) {
      setUploadError('Please select a valid audio file.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('Audio file must be under 20MB.');
      return;
    }

    setUploadingAudio(true);
    setUploadError('');
    setUploadProgress(20);

    try {
      const path = `posts/audio/${user.uid}/${Date.now()}_${file.name}`;
      const fileRef = ref(storage, path);
      setUploadProgress(50);
      const snapshot = await uploadBytes(fileRef, file);
      setUploadProgress(85);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      setUploadProgress(100);
      setAudiomp3(downloadUrl);
      setAudiomp3Name(file.name);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Failed to upload audio.');
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleRemoveAudio = () => {
    setAudiomp3('');
    setAudiomp3Name('');
    setUploadProgress(0);
    setUploadError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGeneratePrompts = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood })
      });
      const data = await res.json();
      setAiPrompts(data.prompts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const [moderationMessage, setModerationMessage] = useState<string | null>(null);

  const handlePublish = async () => {
    if (!user || !content.trim()) return;
    setLoading(true);
    setModerationMessage(null);
    try {
      // Step 1: Call Moderation API
      const modRes = await fetch('/api/ai/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });
      const modData = await modRes.json();

      const moderationStatus = modData.isSafe ? 'approved' : 'flagged';
      const moderationReason = modData.reason || null;

      // Step 2: Save or update in Firestore
      if (postId) {
        const postRef = doc(db, 'posts', postId);
        await updateDoc(postRef, {
          title,
          content,
          tags,
          mood,
          audioUrl,
          audiomp3: audiomp3 || '',
          moderationStatus,
          moderationReason,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'posts'), {
          authorId: user.uid,
          authorName: user.displayName,
          authorPhoto: user.photoURL,
          title,
          content,
          tags,
          mood,
          audioUrl,
          audiomp3: audiomp3 || '',
          likesCount: 0,
          commentCount: 0,
          moderationStatus,
          moderationReason,
          createdAt: serverTimestamp()
        });
      }

      if (moderationStatus === 'flagged') {
        setModerationMessage("Your whisper has been flagged for manual review due to: " + moderationReason);
        setLoading(false);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      console.error("Error publishing whisper:", err);
      try {
        handleFirestoreError(err, postId ? OperationType.UPDATE : OperationType.CREATE, postId ? `posts/${postId}` : 'posts');
      } catch (mappedErr: any) {
        setPublishError(mappedErr.message || 'Failed to publish whisper. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent pt-10 pb-32 px-12">
      <div className="max-w-6xl mx-auto space-y-12">
        {fetchingPost ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            <p className="text-sm font-serif italic text-white/40">Recalling your whisper from the ink pool...</p>
          </div>
        ) : (
          <>
            <header className="flex items-end justify-between border-b border-white/5 pb-10">
              <div>
                <h2 className="text-5xl font-serif font-light italic text-white/90">{postId ? "Refine Your Whisper" : "Ink Your Soul"}</h2>
                <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mt-2">{postId ? "Sculpt and polish your eternal words" : "Transform your feelings into art"}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsPreviewOpen(true)}
                    disabled={!content.trim() || characterCount > 5000}
                    className="flex items-center gap-2.5 px-8 py-4 border border-white/10 hover:border-white/30 text-white font-bold text-xs tracking-[0.2em] rounded-full hover:scale-105 active:scale-95 transition-transform disabled:opacity-30 disabled:grayscale cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-purple-400" />
                    PREVIEW
                  </button>
                  <button 
                    onClick={handlePublish}
                    disabled={loading || !content.trim() || characterCount > 5000}
                    className="flex items-center gap-3 px-10 py-4 bg-white text-black font-bold text-xs tracking-[0.2em] rounded-full hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:grayscale shadow-xl shadow-white/5 cursor-pointer"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
                    {postId ? "UPDATE" : "PUBLISH"}
                  </button>
                </div>
                {moderationMessage && (
                  <p className="text-[10px] text-red-400 font-bold tracking-widest max-w-[200px] text-right">
                    {moderationMessage}
                  </p>
                )}
              </div>
            </header>

        <AnimatePresence>
          {publishError && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="text-xs p-5 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 font-serif italic mb-8 flex items-start gap-4 relative z-10"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
              <div className="flex-1 pr-6 pb-1">
                <span className="font-bold block not-italic uppercase tracking-wider text-[10px] mb-1">Publishing Failed</span>
                {publishError}
              </div>
              <button 
                onClick={() => setPublishError(null)} 
                className="hover:opacity-75 cursor-pointer font-bold px-2 py-0.5 text-lg"
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-10">
            <input 
              type="text"
              placeholder="Title of your whisper..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent text-5xl font-serif italic text-white placeholder-white/5 border-none focus:ring-0 outline-none p-0"
            />
            
            <textarea 
              placeholder="Beneath the ink, the silence breathes..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[500px] bg-transparent text-2xl font-serif italic text-white/60 placeholder-white/5 border-none focus:ring-0 resize-none leading-relaxed p-0"
            />

            {/* Content Stats and Character limit warnings */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-white/5 pt-6 text-xs font-mono text-white/40">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-white/70 font-semibold">{wordCount}</span>{' '}
                  <span className="text-white/20 uppercase tracking-[0.2em] text-[9px] font-bold">Words</span>
                </div>
                <div className="w-px h-3 bg-white/10" />
                <div>
                  <span className={cn(
                    "font-semibold transition-colors",
                    characterCount > 5000 ? "text-red-400 font-bold" : characterCount > 4000 ? "text-amber-400" : "text-white/70"
                  )}>{characterCount}</span>{' '}
                  <span className="text-white/20 uppercase tracking-[0.2em] text-[9px] font-bold">Characters</span>
                  <span className="text-white/20 text-[9px]"> / 5000</span>
                </div>
              </div>
              
              <AnimatePresence>
                {characterCount > 5000 ? (
                  <motion.span 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="text-red-400 text-[10px] uppercase font-bold tracking-widest font-sans flex items-center gap-1.5 shrink-0"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    Cosmic limit exceeded (Max 5000 chars)
                  </motion.span>
                ) : characterCount > 4000 ? (
                  <motion.span 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="text-amber-400 text-[10px] uppercase font-semibold tracking-widest font-sans flex items-center gap-1.5 shrink-0"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Approaching limit
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          <aside className="space-y-8">
            <div className="glass-panel p-10 rounded-[32px] space-y-10">
              <div className="space-y-5">
                <label className="flex items-center gap-2 text-[10px] text-white/30 font-bold uppercase tracking-[0.3em]">
                  <Sparkles className="w-3 h-3 text-purple-400" /> Select Mood
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {moods.map((m) => (
                    <button 
                      key={m}
                      onClick={() => setMood(m)}
                      className={cn(
                        "px-4 py-3 rounded-2xl text-[10px] font-bold tracking-widest transition-all border",
                        mood === m 
                          ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/20" 
                          : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                  <Music className="w-3 h-3" /> Audio URL (External Link)
                </label>
                <input 
                  type="text"
                  placeholder="Link to music or speech..."
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  className="w-full bg-zinc-800 border-none rounded-xl text-zinc-300 text-sm focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* Audio File Upload */}
              <div className="space-y-3 pt-4 border-t border-zinc-800">
                <label className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                  <UploadCloud className="w-3.5 h-3.5 text-purple-400" /> Upload spoken word (MP3)
                </label>
                
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="audio/*"
                  className="hidden"
                />

                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-3 min-h-[110px]",
                    isDragging 
                      ? "border-purple-500 bg-purple-500/10" 
                      : audiomp3 
                        ? "border-green-500/30 bg-green-500/5 hover:bg-green-500/10" 
                        : "border-zinc-850 bg-white/[0.01] hover:bg-white/[0.03]"
                  )}
                >
                  {uploadingAudio ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                      <span className="text-[11px] text-zinc-400 font-sans">Uploading voice to cosmos: {uploadProgress}%</span>
                    </div>
                  ) : audiomp3 ? (
                    <div className="flex flex-col items-center gap-2 w-full">
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                      <div className="text-[11px] text-zinc-200 font-sans truncate w-full px-2" title={audiomp3Name || 'audio.mp3'}>
                        {audiomp3Name || 'audio.mp3'}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemoveAudio();
                        }}
                        className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all cursor-pointer"
                      >
                        <X className="w-3 h-3" /> Remove Audio
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <UploadCloud className="w-6 h-6 text-zinc-500 group-hover:text-purple-400 transition-colors" />
                      <span className="text-[11px] text-zinc-400 font-sans font-medium">Drag & drop or Click to choose</span>
                      <span className="text-[9px] text-zinc-600 font-mono tracking-wide">Supports standard audio (e.g. MP3, WAV)</span>
                    </div>
                  )}
                </div>

                {uploadError && (
                  <p className="text-[10px] text-red-400 font-semibold text-center mt-1">{uploadError}</p>
                )}
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <button 
                  onClick={handleGeneratePrompts}
                  disabled={aiLoading}
                  className="w-full py-3 bg-purple-600/10 border border-purple-500/20 text-purple-400 text-xs font-bold rounded-2xl hover:bg-purple-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  AI MOOD PROMPT
                </button>
                
                {aiPrompts.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 space-y-3"
                  >
                    {aiPrompts.map((p, i) => (
                      <button 
                        key={i}
                        onClick={() => { setContent(prev => prev ? prev + '\n\n' + p : p); setAiPrompts([]); }}
                        className="w-full p-3 text-left bg-zinc-800/50 rounded-xl text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors border border-transparent hover:border-zinc-700"
                      >
                        "{p}"
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
            </div>
          </aside>
        </div>
          </>
        )}

      {/* Preview Modal */}
      <AnimatePresence>
        {isPreviewOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center px-6">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPreviewOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm animate-fade-in"
            />

            {/* Modal Body */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl glass-panel border border-white/10 bg-zinc-950/95 rounded-[40px] overflow-hidden flex flex-col max-h-[85vh] shadow-[0_24px_64px_rgba(0,0,0,0.8)]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-8 pt-8 pb-5 border-b border-white/5 bg-white/[0.01]">
                <div className="space-y-1">
                  <span className="text-[9px] font-mono tracking-[0.25em] text-purple-400 font-bold uppercase block">
                    Vibe Aura & Draft Check
                  </span>
                  <h3 className="text-xl font-serif italic text-zinc-100 font-light flex items-center gap-2">
                    <Eye className="w-5 h-5 text-purple-400 shrink-0" />
                    Preview Your Whisper
                  </h3>
                </div>
                <button 
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-2 rounded-full text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Preview Area */}
              <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 custom-scrollbar">
                {/* Mood and Track Info Indicators */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-sans text-[10px] font-bold tracking-wider uppercase">
                    Mood: {mood}
                  </span>
                  {tags.map((tag, idx) => (
                    <span key={idx} className="px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700/50 text-zinc-400 font-mono text-[10px] lowercase">
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Audio Preview if present */}
                {(audiomp3 || audioUrl) && (
                  <div className="p-1 border border-white/5 rounded-[32px] bg-white/[0.02] shadow-sm">
                    <AudioPlayer 
                      url={audiomp3 || audioUrl} 
                      title={title || "Spoken Word Whisper"} 
                      author={user?.displayName || "Anonymous Poet"} 
                    />
                  </div>
                )}

                {/* Main Content Area */}
                <div className="space-y-4">
                  <h1 className="text-4xl font-serif italic tracking-tight text-white font-light">
                    {title || "Untitled Whisper"}
                  </h1>
                  
                  <div className="w-12 h-[2px] bg-purple-500/30" />

                  {/* Markdown Content rendering */}
                  <div className="prose prose-invert prose-purple max-w-none text-zinc-300 font-serif italic text-xl leading-relaxed whitespace-pre-wrap markdown-body">
                    <ReactMarkdown>{content}</ReactMarkdown>
                  </div>
                </div>
              </div>

              {/* Footer Confirmation */}
              <div className="px-8 py-5 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
                <p className="text-[10px] font-mono text-white/30 tracking-wider uppercase">
                  {wordCount} words &middot; {characterCount} characters
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsPreviewOpen(false)}
                    className="px-6 py-2.5 rounded-full text-white/50 hover:text-white text-[11px] font-bold tracking-wider hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Edit Draft
                  </button>
                  <button
                    onClick={() => {
                      setIsPreviewOpen(false);
                      handlePublish();
                    }}
                    disabled={loading || !content.trim() || characterCount > 5000}
                    className="flex items-center gap-2 px-6 py-2.5 bg-white text-black text-[11px] font-bold tracking-wider rounded-full hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Publish Now
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
}
