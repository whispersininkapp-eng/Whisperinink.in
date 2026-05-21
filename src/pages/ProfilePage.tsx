import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, orderBy, setDoc, deleteDoc, updateDoc, increment, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { PostCard } from '../components/PostCard';
import { ConnectionsModal } from '../components/ConnectionsModal';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, UserPlus, Users, Edit3, X, Camera, Save, Feather, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { AnimatedLoader } from '../components/AnimatedLoader';

export function ProfilePage() {
  const { theme } = useTheme();
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [errorUserMsg, setErrorUserMsg] = useState<string | null>(null);

  // Connections lists states (followers/following)
  const [connectionsModalOpen, setConnectionsModalOpen] = useState(false);
  const [connectionsModalTab, setConnectionsModalTab] = useState<'followers' | 'following'>('followers');

  const handleOpenConnections = (tab: 'followers' | 'following') => {
    setConnectionsModalTab(tab);
    setConnectionsModalOpen(true);
  };

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editPhotoURL, setEditPhotoURL] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [pfpErrorMsg, setPfpErrorMsg] = useState<string | null>(null);

  const handleEditClick = () => {
    setEditDisplayName(profile?.displayName || '');
    setEditPhotoURL(profile?.photoURL || '');
    setEditBio(profile?.bio || '');
    setPfpErrorMsg(null);
    setIsEditing(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      setPfpErrorMsg("Please select an image smaller than 1MB to preserve ledger limits.");
      return;
    }
    setPfpErrorMsg(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setEditPhotoURL(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    setSaveLoading(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        displayName: editDisplayName,
        photoURL: editPhotoURL,
        bio: editBio
      });
      setProfile((prev: any) => ({
        ...prev,
        displayName: editDisplayName,
        photoURL: editPhotoURL,
        bio: editBio
      }));
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      try {
        handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
      } catch (mappedErr: any) {
        setErrorUserMsg(mappedErr.message);
      }
    } finally {
      setSaveLoading(false);
    }
  };

  useEffect(() => {
    async function checkFollow() {
      if (!currentUser || !userId || currentUser.uid === userId) return;
      try {
        const followDoc = await getDoc(doc(db, 'follows', `${currentUser.uid}_${userId}`));
        setIsFollowing(followDoc.exists());
      } catch (err) {
        console.error('Error checking follow status:', err);
      }
    }
    checkFollow();
  }, [currentUser, userId]);

  const handleFollowToggle = async () => {
    if (!currentUser || !userId || followLoading) return;
    setFollowLoading(true);
    try {
      const batch = writeBatch(db);
      const followId = `${currentUser.uid}_${userId}`;
      const followRef = doc(db, 'follows', followId);
      
      const userRef = doc(db, 'users', userId);
      const currentUserRef = doc(db, 'users', currentUser.uid);

      if (isFollowing) {
        batch.delete(followRef);
        batch.set(userRef, { followerCount: increment(-1) }, { merge: true });
        batch.set(currentUserRef, { followingCount: increment(-1) }, { merge: true });
        await batch.commit();
        setIsFollowing(false);
        setProfile((prev: any) => ({ ...prev, followerCount: Math.max(0, (prev?.followerCount || 0) - 1) }));
      } else {
        batch.set(followRef, {
          followerId: currentUser.uid,
          followingId: userId,
          createdAt: new Date().toISOString()
        });
        batch.set(userRef, { followerCount: increment(1) }, { merge: true });
        batch.set(currentUserRef, { followingCount: increment(1) }, { merge: true });
        await batch.commit();
        setIsFollowing(true);
        setProfile((prev: any) => ({ ...prev, followerCount: (prev?.followerCount || 0) + 1 }));
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
      try {
        handleFirestoreError(err, OperationType.WRITE, `follows/${currentUser.uid}_${userId}`);
      } catch (mappedErr: any) {
        setErrorUserMsg(mappedErr.message);
      }
    } finally {
      setFollowLoading(false);
    }
  };

  useEffect(() => {
    async function fetchProfileData() {
      if (!userId) return;
      setLoading(true);
      try {
        const profileDoc = await getDoc(doc(db, 'users', userId));
        if (profileDoc.exists()) {
          setProfile(profileDoc.data());
        }

        let q;
        if (currentUser?.uid === userId) {
          // Owner sees all their posts
          q = query(
            collection(db, 'posts'), 
            where('authorId', '==', userId),
            orderBy('createdAt', 'desc')
          );
        } else {
          // Others only see approved posts
          q = query(
            collection(db, 'posts'), 
            where('authorId', '==', userId),
            where('moderationStatus', '==', 'approved'),
            orderBy('createdAt', 'desc')
          );
        }
        
        try {
          const snapshot = await getDocs(q);
          setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })));
        } catch (postError: any) {
          console.warn('Post query failed:', postError);
          // Fallback for non-indexed status or mixed posts
          const legacyQ = query(collection(db, 'posts'), where('authorId', '==', userId), orderBy('createdAt', 'desc'));
          const snapshot = await getDocs(legacyQ);
          const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
          
          if (currentUser?.uid === userId) {
            setPosts(fetchedPosts);
          } else {
            setPosts(fetchedPosts.filter(p => p.moderationStatus !== 'flagged'));
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchProfileData();
  }, [userId]);

  if (loading) return <AnimatedLoader message="Whispering to the cosmic server..." />;

  return (
    <div className="min-h-screen bg-transparent pt-20 pb-32 px-12 transition-colors duration-500">
      <div className="max-w-6xl mx-auto space-y-20">
        <AnimatePresence>
          {errorUserMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className={cn(
                "text-xs p-5 rounded-3xl border flex items-start gap-4 relative z-10",
                theme === 'dark' 
                  ? "bg-red-500/10 border-red-500/20 text-red-400" 
                  : "bg-red-500/5 border-red-200 text-red-600"
              )}
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 pr-6 font-serif italic">
                <span className="font-bold block not-italic uppercase tracking-wider text-[10px] mb-1">Profile Action Failed</span>
                {errorUserMsg}
              </div>
              <button 
                onClick={() => setErrorUserMsg(null)} 
                aria-label="Dismiss error message"
                className="hover:opacity-75 cursor-pointer font-bold px-2 py-0.5 text-lg"
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile Header */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-16 items-center">
          <div className="md:col-span-4 flex flex-col items-center">
             <div className="relative group">
                <div className="w-56 h-56 rounded-[60px] overflow-hidden border border-black/5 dark:border-white/5 p-2 group-hover:border-purple-500/30 transition-all duration-700 shadow-2xl">
                  <img 
                    src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`} 
                    alt={profile?.displayName} 
                    className="w-full h-full rounded-[50px] object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000" 
                  />
                </div>
                <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-white dark:bg-[#08080a] border border-black/5 dark:border-white/10 rounded-2xl flex items-center justify-center shadow-xl">
                  <Feather className="w-6 h-6 text-purple-500/60" />
                </div>
             </div>
          </div>

          <div className="md:col-span-8 space-y-10">
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-6">
                  <h2 className={cn(
                    "text-6xl font-serif font-light italic tracking-tight",
                    theme === 'dark' ? "text-zinc-100" : "text-zinc-900"
                  )}>{profile?.displayName}</h2>
                  {currentUser?.uid === userId && (
                    <button 
                      onClick={handleEditClick}
                      className="p-3 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl text-zinc-500 hover:text-purple-500 transition-all"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  )}
                </div>
                {profile?.username && (
                  <p className="font-mono text-xs tracking-wider text-purple-500 font-medium">
                    @{profile.username}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-10">
                <button 
                  onClick={() => handleOpenConnections('followers')}
                  className="flex flex-col text-left group hover:opacity-85 transition-all text-inherit bg-transparent p-0 border-0 cursor-pointer"
                >
                  <span className="text-2xl font-serif italic text-purple-500 group-hover:underline decoration-purple-500/30 font-medium flex items-baseline gap-1">
                    {profile?.followerCount || 0}
                  </span>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600 group-hover:text-purple-500 transition-colors" />
                    Followers
                  </span>
                </button>

                <div className="w-px h-8 bg-black/5 dark:bg-white/5" />

                <button 
                  onClick={() => handleOpenConnections('following')}
                  className="flex flex-col text-left group hover:opacity-85 transition-all text-inherit bg-transparent p-0 border-0 cursor-pointer"
                >
                  <span className="text-2xl font-serif italic text-purple-500 group-hover:underline decoration-purple-500/30 font-medium flex items-baseline gap-1">
                    {profile?.followingCount || 0}
                  </span>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600 group-hover:text-purple-500 transition-colors" />
                    Following
                  </span>
                </button>

                <div className="w-px h-8 bg-black/5 dark:bg-white/5" />

                <div className="flex flex-col text-left">
                  <span className="text-2xl font-serif italic text-purple-500">
                    {posts.length}
                  </span>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold flex items-center gap-1.5">
                    <Feather className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600" />
                    Fragments
                  </span>
                </div>
              </div>

              <p className={cn(
                "max-w-xl text-xl font-serif italic leading-relaxed transition-colors",
                theme === 'dark' ? "text-zinc-500" : "text-zinc-600"
              )}>
                {profile?.bio ? `“${profile.bio}”` : "This soul hasn't written their essence yet."}
              </p>
            </div>

            <div className="flex gap-6">
              {currentUser?.uid !== userId && (
                <button 
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  className={cn(
                    "px-12 py-4 font-bold text-[10px] tracking-[0.3em] uppercase rounded-full transition-all hover-lift hover-glow active:scale-95 shadow-xl",
                    isFollowing 
                      ? "bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-zinc-500 hover:text-white" 
                      : (theme === 'dark' ? "bg-white text-black" : "bg-zinc-900 text-white")
                  )}
                >
                  {followLoading ? (
                    <span className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    isFollowing ? 'Unfollow Signal' : 'Follow Signal'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* User Content */}
        <div className="space-y-12">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-8">
            <h3 className="text-[10px] font-bold text-zinc-500 tracking-[0.4em] uppercase">The Soul's Archive</h3>
            <div className="h-px flex-1 mx-8 bg-black/5 dark:bg-white/5 hidden md:block" />
            <span className="text-[10px] font-bold text-purple-500 tracking-[0.3em] uppercase">{posts.length} entries written</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {posts.map(post => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg glass-panel rounded-[40px] p-10 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className={cn(
                  "text-2xl font-serif font-light italic transition-colors",
                  theme === 'dark' ? "text-white/90" : "text-zinc-900"
                )}>Refine Your Soul</h3>
                <button 
                  onClick={() => setIsEditing(false)}
                  className={cn(
                    "p-2 transition-colors",
                    theme === 'dark' ? "text-white/20 hover:text-white" : "text-black/20 hover:text-black"
                  )}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Photo URL / Custom PFP Upload */}
                <div className="space-y-4">
                  <label className={cn(
                    "text-[10px] font-bold uppercase tracking-[0.3em] flex items-center gap-2 transition-colors",
                    theme === 'dark' ? "text-white/30" : "text-zinc-500"
                  )}>
                    <Camera className="w-3 h-3" /> Profile Picture (PFP)
                  </label>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-3xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                    <div className="relative group/pfp-upload w-20 h-20 rounded-2xl overflow-hidden border border-purple-500/20 shadow-inner shrink-0 bg-zinc-800">
                      <img 
                        src={editPhotoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`} 
                        alt="Preview" 
                        className="w-full h-full object-cover grayscale opacity-85 group-hover/pfp-upload:grayscale-0 group-hover/pfp-upload:opacity-100 transition-all duration-300" 
                      />
                      <label 
                        htmlFor="pfp-file-input"
                        className="absolute inset-0 bg-black/55 opacity-0 group-hover/pfp-upload:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                      >
                        <Camera className="w-5 h-5 text-white/80" />
                      </label>
                    </div>

                    <div className="flex-1 space-y-2 w-full">
                      <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">
                        Upload PFP Image or Choose File
                      </p>
                      <input 
                        id="pfp-file-input"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById('pfp-file-input')?.click()}
                        className={cn(
                          "px-4 py-2 text-[9px] font-bold tracking-widest uppercase rounded-full border transition-all hover-lift active:scale-95 cursor-pointer",
                          theme === 'dark' ? "bg-white text-black border-white" : "bg-zinc-900 text-white border-zinc-900"
                        )}
                      >
                        Select Device Image
                      </button>
                    </div>
                  </div>

                  {pfpErrorMsg && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-sans tracking-wide"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                      <span>{pfpErrorMsg}</span>
                    </motion.div>
                  )}

                  <div className="space-y-2">
                    <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block">
                      Or Paste Avatar URL
                    </span>
                    <input 
                      type="text"
                      value={editPhotoURL}
                      onChange={(e) => setEditPhotoURL(e.target.value)}
                      placeholder="https://..."
                      className={cn(
                        "w-full border rounded-2xl px-6 py-4 text-sm transition-colors focus:outline-none focus:border-purple-500/50",
                        theme === 'dark' ? "bg-white/5 border-white/5 text-zinc-100 placeholder-zinc-700" : "bg-black/5 border-black/5 text-zinc-900 placeholder-zinc-400"
                      )}
                    />
                  </div>
                </div>

                {/* Display Name */}
                <div className="space-y-2">
                  <label className={cn(
                    "text-[10px] font-bold uppercase tracking-[0.3em] transition-colors",
                    theme === 'dark' ? "text-white/30" : "text-zinc-500"
                  )}>Display Name</label>
                  <input 
                    type="text"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    placeholder="What shall we call you?"
                    className={cn(
                      "w-full border rounded-2xl px-6 py-4 text-sm transition-colors focus:outline-none focus:border-purple-500/50",
                      theme === 'dark' ? "bg-white/5 border-white/5 text-zinc-100 placeholder-zinc-700" : "bg-black/5 border-black/5 text-zinc-900 placeholder-zinc-400"
                    )}
                  />
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <label className={cn(
                    "text-[10px] font-bold uppercase tracking-[0.3em] transition-colors",
                    theme === 'dark' ? "text-white/30" : "text-zinc-500"
                  )}>The Essence (Bio)</label>
                  <textarea 
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Tell your story in a whisper..."
                    rows={4}
                    className={cn(
                      "w-full border rounded-2xl px-6 py-4 text-sm transition-colors resize-none focus:outline-none focus:border-purple-500/50",
                      theme === 'dark' ? "bg-white/5 border-white/5 text-zinc-100 placeholder-zinc-700" : "bg-black/5 border-black/5 text-zinc-900 placeholder-zinc-400"
                    )}
                  />
                </div>

                <button 
                  onClick={handleSaveProfile}
                  disabled={saveLoading}
                  className={cn(
                    "w-full py-5 font-bold text-xs tracking-[0.2em] rounded-full hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50",
                    theme === 'dark' ? "bg-white text-black" : "bg-zinc-900 text-white"
                  )}
                >
                  {saveLoading ? (
                    <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      SAVE CHANGES
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Connections Modal */}
      <ConnectionsModal 
        isOpen={connectionsModalOpen}
        onClose={() => setConnectionsModalOpen(false)}
        profileUserId={userId || ''}
        profileName={profile?.displayName || 'Poet'}
        initialTab={connectionsModalTab}
      />
    </div>
  );
}
