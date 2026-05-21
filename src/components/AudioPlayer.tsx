import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, Volume1, VolumeX, Maximize } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

interface AudioPlayerProps {
  url: string;
  title?: string;
  author?: string;
}

export function AudioPlayer({ url, title, author }: AudioPlayerProps) {
  const { theme } = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [activeAmplitudes, setActiveAmplitudes] = useState<number[]>([]);
  const [useLiveAnalyser, setUseLiveAnalyser] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const prevAmplitudesRef = useRef<number[]>([]);

  const speeds = [1, 1.25, 1.5, 2, 0.75];

  const cycleSpeed = () => {
    const currentIndex = speeds.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setPlaybackRate(speeds[nextIndex]);
  };

  // Parse or synthesize audio waveform peaks
  useEffect(() => {
    if (!url) return;

    let isCancelled = false;
    setUseLiveAnalyser(false);

    // Generate highly elegant, default symmetric organic curve peaks
    const defaultPeaks = Array.from({ length: 44 }, (_, i) => {
      const normalizedIndex = i / 43;
      const envelope = Math.sin(normalizedIndex * Math.PI);
      const noise = Math.sin(i * 1.5) * 0.2 + Math.cos(i * 3.7) * 0.15;
      const height = Math.max(0.15, Math.min(1, envelope * (0.65 + noise)));
      return Math.round(height * 100);
    });
    setPeaks(defaultPeaks);

    // Try fetching and decoding audio buffer to render exact acoustic peaks
    const analyzeAudio = async () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();

        // fetch with cors mode to test browser compatibility and CORS headers
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) {
          throw new Error('CORS error or network error');
        }
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        const rawData = audioBuffer.getChannelData(0);
        const samples = 44;
        const blockSize = Math.floor(rawData.length / samples);
        const tempPeaks: number[] = [];

        for (let i = 0; i < samples; i++) {
          const blockStart = i * blockSize;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[blockStart + j]);
          }
          tempPeaks.push(sum / blockSize);
        }

        const maxVal = Math.max(...tempPeaks);
        if (maxVal > 0 && !isCancelled) {
          const normalized = tempPeaks.map(val => {
            const ratio = val / maxVal;
            // Map strictly to an aesthetic visual range (15% to 100%)
            return Math.max(15, Math.round(ratio * 90) + 10);
          });
          setPeaks(normalized);
        }

        if (!isCancelled) {
          // Successfully fetched and verified CORS, can use live analyser safely
          setUseLiveAnalyser(true);
        }
        await ctx.close();
      } catch (err) {
        // Fallback is already loaded silently, proceed without Live Web Audio to avoid muting!
        if (!isCancelled) {
          setUseLiveAnalyser(false);
        }
      }
    };

    analyzeAudio();

    return () => {
      isCancelled = true;
    };
  }, [url]);

  const initAnalyser = () => {
    if (!useLiveAnalyser) return; // Skip compiling live audio graph if target fails CORS test
    if (analyserRef.current || !audioRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const ctx = audioCtxRef.current || new AudioContextClass();
      audioCtxRef.current = ctx;
      
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128; // gives 64 frequency bins, perfect for our 44 peaks!
      
      let source = sourceNodeRef.current;
      if (!source) {
        source = ctx.createMediaElementSource(audioRef.current);
        sourceNodeRef.current = source;
      }
      
      source.connect(analyser);
      analyser.connect(ctx.destination);
      
      analyserRef.current = analyser;
      const bufferLength = analyser.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
    } catch (e) {
      console.warn("Failed to initialize Web Audio Analyser (possibly CORS or gesture limits):", e);
    }
  };

  // Real-time dynamic amplitude & frequency loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      // Drifting smooth decay back to idle 1.0 multiplier
      let decayTimer: number;
      const decay = () => {
        setActiveAmplitudes(prev => {
          if (prev.length === 0) return [];
          const next = prev.map(val => val + (1 - val) * 0.12);
          const needsMore = next.some(val => Math.abs(val - 1) > 0.01);
          if (needsMore) {
            decayTimer = requestAnimationFrame(decay);
          }
          return next;
        });
      };
      decayTimer = requestAnimationFrame(decay);
      return () => {
        cancelAnimationFrame(decayTimer);
      };
    }

    initAnalyser();

    const updateWaveform = () => {
      const totalBars = 44;
      let newAmplitudes: number[] = [];

      if (analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        
        // Sum amplitude or query specific frequencies
        let sum = 0;
        for (let i = 0; i < dataArrayRef.current.length; i++) {
          sum += dataArrayRef.current[i];
        }
        const averageVolume = sum / dataArrayRef.current.length;

        newAmplitudes = Array.from({ length: totalBars }, (_, i) => {
          const ratio = i / (totalBars - 1);
          // Query low/mid frequency bands as they are highly active in voice/spoken-word
          const rawBinIndex = Math.floor(ratio * (dataArrayRef.current!.length * 0.65));
          const freqValue = dataArrayRef.current![rawBinIndex] || 0;
          
          // Map to a premium scaling factor: 0.5 to 1.7
          const singleScale = 0.45 + (freqValue / 255) * 1.1;
          // Apply overall audio power to compound the movement organically
          const globalScale = 0.95 + (averageVolume / 255) * 0.3;
          return singleScale * globalScale;
        });
      } else {
        // Procedural generator backup: highly natural synthesized frequencies
        const timeFactor = Date.now() * 0.006;
        newAmplitudes = Array.from({ length: totalBars }, (_, i) => {
          const slowSine = Math.sin(timeFactor + i * 0.18 + Math.sin(timeFactor * 0.5));
          const fastSine = Math.cos(timeFactor * 2.1 - i * 0.35);
          const complexFactor = Math.abs(slowSine * 0.45 + fastSine * 0.55);
          return 0.5 + complexFactor * 1.0;
        });
      }

      // Smooth with low-pass exponential filter for liquid, non-jittery motion
      const smoothed = newAmplitudes.map((newVal, idx) => {
        const prevVal = prevAmplitudesRef.current[idx] !== undefined ? prevAmplitudesRef.current[idx] : 1;
        return prevVal * 0.72 + newVal * 0.28;
      });
      prevAmplitudesRef.current = smoothed;
      setActiveAmplitudes(smoothed);

      animationRef.current = requestAnimationFrame(updateWaveform);
    };

    animationRef.current = requestAnimationFrame(updateWaveform);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, useLiveAnalyser]);

  // Sync state on URL change
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setPlaybackRate(1);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
      audioRef.current.playbackRate = 1;
    }
  }, [url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Apply volume changes
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = playbackRate;
    }
  }, [playbackRate, url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
    };

    const updateDuration = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePlayState = () => setIsPlaying(true);
    const handlePauseState = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlayState);
    audio.addEventListener('pause', handlePauseState);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlayState);
      audio.removeEventListener('pause', handlePauseState);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.playbackRate = playbackRate;
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      audioRef.current.play().catch((err) => {
        console.error("Playback error:", err);
      });
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const restartTrack = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      audioRef.current.playbackRate = playbackRate;
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      if (!isPlaying) {
        audioRef.current.play().catch(err => console.error(err));
      }
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Derive volume icon
  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeX className="w-4 h-4" />;
    if (volume < 0.4) return <Volume1 className="w-4 h-4" />;
    return <Volume2 className="w-4 h-4" />;
  };

  return (
    <div className={cn(
      "w-full rounded-[28px] border p-5 flex flex-col gap-4 relative transition-all duration-300",
      theme === 'dark' 
        ? "bg-zinc-900/65 backdrop-blur-md border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]" 
        : "bg-zinc-50/90 backdrop-blur-md border-zinc-150 shadow-sm"
    )}>
      <audio ref={audioRef} src={url} preload="metadata" crossOrigin={useLiveAnalyser ? "anonymous" : undefined} />
      
      {/* Top track details */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-inner",
            isPlaying 
              ? theme === 'dark' ? "bg-purple-500/20 text-purple-400 border border-purple-500/10" : "bg-purple-500/10 text-purple-600 border border-purple-500/15" 
              : theme === 'dark' ? "bg-white/5 text-zinc-400" : "bg-zinc-200/50 text-zinc-650"
          )}>
            <motion.div
              animate={{ rotate: isPlaying ? [0, 360] : 0 }}
              transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </motion.div>
          </div>
          <div className="min-w-0">
            <h4 className={cn(
              "text-xs font-semibold font-sans truncate tracking-wide",
              theme === 'dark' ? "text-zinc-200" : "text-zinc-800"
            )}>
              {title || 'Poetry Whispers'}
            </h4>
            <p className={cn(
              "text-[10px] font-mono tracking-wider uppercase truncate mt-0.5",
              theme === 'dark' ? "text-zinc-500" : "text-zinc-400"
            )}>
              Voice of {author || 'Anonymous Poet'}
            </p>
          </div>
        </div>

        {/* Dynamic audio waves when playing / loading info */}
        {isPlaying && (
          <div className="flex items-end gap-[3px] h-3.5 px-2">
            {[1, 2, 3, 4, 3, 2, 1, 3, 4, 2].map((val, idx) => (
              <motion.div
                key={idx}
                animate={{ height: ['4px', '14px', '4px'] }}
                transition={{
                  duration: 0.6 + (idx * 0.08),
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className={cn(
                  "w-[2px] rounded-full",
                  theme === 'dark' ? "bg-purple-400/80" : "bg-purple-600/80"
                )}
                style={{ height: `${val * 3}px` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Seek and timeline controls with waveform visualization */}
      <div className="space-y-2 pt-1">
        <div className="relative group/seeker flex items-center h-12 w-full select-none">
          {/* Waveform Bars Background */}
          <div className="absolute inset-x-0 bottom-0 top-0 flex items-end justify-between gap-[2.5px] w-full h-full pointer-events-none pb-0.5">
            {peaks.map((heightPercent, idx) => {
              const barProgressThreshold = (idx / (peaks.length - 1)) * 100;
              const isActive = progressPercentage >= barProgressThreshold;
              const amp = activeAmplitudes[idx] !== undefined ? activeAmplitudes[idx] : 1;
              const dynamicHeight = Math.max(12, Math.min(100, heightPercent * amp));
              return (
                <div
                  key={idx}
                  className={cn(
                    "flex-1 rounded-t-[2px] transition-all duration-100 origin-bottom",
                    isActive
                      ? theme === 'dark'
                        ? "bg-purple-500/90 shadow-[0_0_6px_rgba(168,85,247,0.35)]"
                        : "bg-purple-600/90"
                      : theme === 'dark'
                        ? "bg-zinc-800/60 group-hover/seeker:bg-zinc-700/50"
                        : "bg-zinc-200/90 group-hover/seeker:bg-zinc-300/80"
                  )}
                  style={{ 
                    height: `${dynamicHeight}%`
                  }}
                />
              );
            })}
          </div>

          {/* Transparent Input Range Overlay to handle mouse & touch interactions flawlessly */}
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleSeekChange}
            className={cn(
              "absolute inset-0 w-full appearance-none h-full bg-transparent cursor-pointer outline-none z-10",
              "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-0.5 [&::-webkit-slider-thumb]:h-full [&::-webkit-slider-thumb]:bg-purple-400/95 [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(168,85,247,0.8)] [&::-webkit-slider-thumb]:opacity-0 group-hover/seeker:[&::-webkit-slider-thumb]:opacity-100 [&::-webkit-slider-thumb]:transition-opacity",
              "[&::-moz-range-thumb]:w-0.5 [&::-moz-range-thumb]:h-full [&::-moz-range-thumb]:bg-purple-400 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:opacity-0 group-hover/seeker:[&::-moz-range-thumb]:opacity-100"
            )}
          />
        </div>

        <div className="flex justify-between items-center text-[9px] font-mono font-medium tracking-wide text-zinc-500">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main control triggers & Volume settings */}
      <div className="flex items-center justify-between gap-4 mt-1">
        {/* Playback rate & Restart Controls */}
        <div className="flex items-center gap-1.5">
          <button 
            onClick={restartTrack}
            title="Restart poem"
            className={cn(
              "p-2 rounded-full transition-colors active:scale-95 cursor-pointer",
              theme === 'dark' ? "text-zinc-500 hover:text-zinc-200 hover:bg-white/5" : "text-zinc-400 hover:text-zinc-800 hover:bg-zinc-150"
            )}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={cycleSpeed}
            title="Cycle playback speed"
            className={cn(
              "flex items-center justify-center px-2 py-1 rounded-[10px] text-[10px] font-mono tracking-wider font-bold transition-all active:scale-95 select-none cursor-pointer border",
              theme === 'dark'
                ? "bg-white/[0.04] text-purple-400 border-white/5 hover:text-purple-300 hover:bg-white/10"
                : "bg-zinc-100/80 text-purple-600 border-zinc-250/20 hover:text-purple-500 hover:bg-zinc-200/50"
            )}
          >
            {playbackRate === 1 ? '1.0x' : `${playbackRate}x`}
          </button>
        </div>

        {/* Master Play/Pause Slider */}
        <button 
          onClick={togglePlay}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg active:scale-95 hover:scale-105",
            theme === 'dark' 
              ? "bg-white text-black hover:bg-zinc-100" 
              : "bg-zinc-950 text-white hover:bg-zinc-800"
          )}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current stroke-[2.5]" />
          ) : (
            <Play className="w-4 h-4 fill-current translate-x-0.5 stroke-[2.5]" />
          )}
        </button>

        {/* Volume & Mute control combination */}
        <div 
          className="relative flex items-center"
          onMouseEnter={() => setShowVolumeSlider(true)}
          onMouseLeave={() => setShowVolumeSlider(false)}
        >
          <button 
            onClick={toggleMute}
            className={cn(
              "p-2 rounded-full transition-colors active:scale-95 cursor-pointer",
              theme === 'dark' ? "text-zinc-500 hover:text-zinc-200 hover:bg-white/5" : "text-zinc-400 hover:text-zinc-800 hover:bg-zinc-150"
            )}
          >
            {getVolumeIcon()}
          </button>

          {/* Sliding volume track on hover */}
          <AnimatePresence>
            {showVolumeSlider && (
              <motion.div
                initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                animate={{ opacity: 1, width: 70, marginLeft: 4 }}
                exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden flex items-center h-8 pr-2"
              >
                <div className="relative group/vol flex items-center h-4 w-full">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setVolume(val);
                      if (val > 0) setIsMuted(false);
                    }}
                    className={cn(
                      "absolute inset-x-0 w-full appearance-none h-1 bg-transparent cursor-pointer outline-none rounded-full z-10",
                      "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:shadow-md",
                      "[&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-purple-500"
                    )}
                  />
                  {/* Custom Volume Track */}
                  <div className="absolute inset-x-0 h-1 bg-zinc-700/30 rounded-full overflow-hidden w-full pointer-events-none">
                    <div 
                      style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                      className={cn(
                        "h-full rounded-full transition-all",
                        theme === 'dark' ? "bg-purple-500" : "bg-purple-600"
                      )}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

