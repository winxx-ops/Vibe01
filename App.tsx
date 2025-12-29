
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Heart, 
  ChevronLeft, Sparkles, AlignLeft, Volume2, 
  Shuffle, Repeat, Repeat1, LayoutDashboard, 
  User, Settings, LogOut, Smartphone, Mail, Facebook, Chrome, Shield, Bell, Zap,
  Music, Mic2, Star, Disc, Compass, Layers,
  Users, Radio, Terminal, Lock, ArrowLeft, Filter, Link, Activity,
  FolderOpen, FileMusic, UploadCloud, CreditCard, ShieldCheck, Headphones, Check, Sliders,
  Waves, Cpu, MessageSquare, Send, Mic, X, Palette, Eye, VolumeX,
  LogIn, Phone, Globe
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Track, VibeAnalysis, VisualizerTheme } from './types';
import { analyzeTrackVibe, getLyricsForTrack } from './services/geminiService';
import Visualizer from './components/Visualizer';

const formatTime = (time: number) => {
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const INITIAL_PLAYLIST: Track[] = [
  {
    id: '1',
    title: 'LUZ ROJA',
    artist: 'VIBE1 // ORIGINAL',
    coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=800',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    genre: 'electronic',
    exclusive: true,
  },
  {
    id: '2',
    title: 'RETROGRADE',
    artist: 'CLASSIC ECHO',
    coverUrl: 'https://images.unsplash.com/photo-1459749411177-042180ce673c?auto=format&fit=crop&q=80&w=800',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    genre: 'classic',
  },
  {
    id: '3',
    title: 'CYBERPULSE',
    artist: 'NEON DRIFT',
    coverUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=800',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    genre: 'electronic',
  }
];

const VISUALIZER_THEMES: VisualizerTheme[] = [
  { id: 'crimson', name: 'Crimson', primaryColor: '#ef4444', secondaryColor: '#991B1B', style: 'bars' },
  { id: 'cyan', name: 'Electric', primaryColor: '#22d3ee', secondaryColor: '#0891b2', style: 'wave' },
  { id: 'violet', name: 'Ghost', primaryColor: '#a855f7', secondaryColor: '#7e22ce', style: 'dots' },
];

type ProfileTab = 'account' | 'rooms' | 'settings';
type RoomType = 'none' | 'group' | 'couple';
type RepeatMode = 'none' | 'all' | 'one';

interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: Date;
}

const App: React.FC = () => {
  // Player States
  const [queue, setQueue] = useState<Track[]>(INITIAL_PLAYLIST);
  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  const [currentTrackId, setCurrentTrackId] = useState<string>(INITIAL_PLAYLIST[0].id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [vibe, setVibe] = useState<VibeAnalysis | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isCollectionOpen, setIsCollectionOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<ProfileTab>('account');
  const [activeTab, setActiveTab] = useState<'explore' | 'local'>('explore');
  const [showLyrics, setShowLyrics] = useState(false);
  const [visualizerTheme, setVisualizerTheme] = useState<VisualizerTheme>(VISUALIZER_THEMES[0]);
  
  // Shuffle & Repeat States
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');

  // Settings States
  const [highFiEnabled, setHighFiEnabled] = useState(true);
  const [normalizationEnabled, setNormalizationEnabled] = useState(true);
  const [uiMotionEnabled, setUiMotionEnabled] = useState(true);

  // Room States
  const [roomType, setRoomType] = useState<RoomType>('none');
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [roomJoined, setRoomJoined] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [members, setMembers] = useState<{name: string, active: boolean}[]>([]);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Core Animation Values
  const energyFactor = useMemo(() => (vibe?.energyLevel || 5) / 10, [vibe]);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });
  const rotateX = useTransform(springY, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-10, 10]);

  // Subtle Parallax logic
  // Album image slides in opposite direction of monolith rotation to create depth
  const parallaxBaseX = useTransform(springX, [-0.5, 0.5], [15, -15]);
  const parallaxBaseY = useTransform(springY, [-0.5, 0.5], [15, -15]);
  // Use a spring for smooth activation/deactivation of parallax effect
  const parallaxActiveIntensity = useSpring(isPlaying ? 1 : 0, { stiffness: 100, damping: 25 });
  // Fix arithmetic errors by casting values to numbers as useTransform inferred values can be ambiguous
  const finalParallaxX = useTransform([parallaxBaseX, parallaxActiveIntensity], ([val, intensity]) => (val as number) * (intensity as number));
  const finalParallaxY = useTransform([parallaxBaseY, parallaxActiveIntensity], ([val, intensity]) => (val as number) * (intensity as number));

  const allAvailableTracks = useMemo(() => [...INITIAL_PLAYLIST, ...localTracks], [localTracks]);
  const currentTrack = allAvailableTracks.find(t => t.id === currentTrackId) || INITIAL_PLAYLIST[0];
  const isCurrentFavorite = favorites.includes(currentTrack.id);

  const themeColors = useMemo(() => {
    if (roomJoined && roomType === 'couple') return ['#f472b6', '#831843'];
    if (roomJoined && roomType === 'group') return ['#22d3ee', '#083344'];
    if (isCurrentFavorite) return ['#dc2626', '#450a0a'];
    return [visualizerTheme.primaryColor, visualizerTheme.secondaryColor];
  }, [vibe, isCurrentFavorite, visualizerTheme, roomJoined, roomType]);

  const broadcastSync = (action: string) => {
    if (!roomJoined) return;
    setSyncStatusMsg(`Syncing ${action}...`);
    setTimeout(() => setSyncStatusMsg(null), 800);
  };

  useEffect(() => {
    if (roomJoined) {
      const count = roomType === 'couple' ? 2 : 4;
      const names = roomType === 'couple' ? ['You', 'Partner'] : ['You', 'Alex', 'Sam', 'Jordan'];
      setMembers(names.slice(0, count).map(n => ({ name: n, active: true })));
      setChatMessages([{
        id: 'system',
        user: 'SERVER',
        text: `${roomType.toUpperCase()} Link Established. Welcome to the Spectrum.`,
        timestamp: new Date()
      }]);
    }
  }, [roomJoined, roomType]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => setIsPlaying(false));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrackId]);

  useEffect(() => {
    handleAnalyze(currentTrack);
  }, [currentTrackId]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!uiMotionEnabled) return;
    const { innerWidth, innerHeight } = window;
    mouseX.set((e.clientX / innerWidth) - 0.5);
    mouseY.set((e.clientY / innerHeight) - 0.5);
  };

  const handleAnalyze = async (track: Track) => {
    const result = await analyzeTrackVibe(track);
    setVibe(result);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    broadcastSync(isPlaying ? 'pause' : 'play');
  };

  const handleNext = () => {
    const currentIndex = allAvailableTracks.findIndex(t => t.id === currentTrackId);
    let nextIndex;

    if (isShuffle) {
      if (allAvailableTracks.length > 1) {
        do {
          nextIndex = Math.floor(Math.random() * allAvailableTracks.length);
        } while (nextIndex === currentIndex);
      } else {
        nextIndex = 0;
      }
    } else {
      nextIndex = currentIndex + 1;
      if (nextIndex >= allAvailableTracks.length) {
        if (repeatMode === 'all') {
          nextIndex = 0;
        } else {
          setIsPlaying(false);
          return;
        }
      }
    }

    setCurrentTrackId(allAvailableTracks[nextIndex].id);
    setIsPlaying(true);
    broadcastSync('skip-next');
  };

  const handlePrevious = () => {
    const currentIndex = allAvailableTracks.findIndex(t => t.id === currentTrackId);
    let prevIndex;

    if (isShuffle) {
      if (allAvailableTracks.length > 1) {
        do {
          prevIndex = Math.floor(Math.random() * allAvailableTracks.length);
        } while (prevIndex === currentIndex);
      } else {
        prevIndex = 0;
      }
    } else {
      prevIndex = currentIndex - 1;
      if (prevIndex < 0) {
        if (repeatMode === 'all') {
          prevIndex = allAvailableTracks.length - 1;
        } else {
          prevIndex = 0;
        }
      }
    }

    setCurrentTrackId(allAvailableTracks[prevIndex].id);
    setIsPlaying(true);
    broadcastSync('skip-prev');
  };

  const handleTrackEnded = () => {
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      handleNext();
    }
  };

  const playTrack = (track: Track) => {
    if (!queue.find(t => t.id === track.id)) setQueue(prev => [...prev, track]);
    setCurrentTrackId(track.id);
    setIsPlaying(true);
    setIsCollectionOpen(false);
    broadcastSync('track-change');
  };

  const handleJoinRoom = () => {
    if (roomCode.length < 4) return;
    setIsJoining(true);
    setTimeout(() => {
      setIsJoining(false);
      setRoomJoined(true);
      setIsProfileOpen(false);
    }, 1500);
  };

  const exitRoom = () => {
    setRoomJoined(false);
    setRoomType('none');
    setRoomCode('');
    setIsChatOpen(false);
  };

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      user: 'You',
      text: chatInput,
      timestamp: new Date()
    }]);
    setChatInput('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newTracks: Track[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      newTracks.push({
        id: `local-${Date.now()}-${i}`,
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: "LOCAL DATA",
        coverUrl: "https://images.unsplash.com/photo-1514525253344-99a42d74081c?auto=format&fit=crop&q=80&w=800",
        audioUrl: url,
        isLocal: true
      });
    }
    setLocalTracks(prev => [...prev, ...newTracks]);
    setActiveTab('local');
  };

  const toggleRepeat = () => {
    setRepeatMode(prev => {
      if (prev === 'none') return 'all';
      if (prev === 'all') return 'one';
      return 'none';
    });
  };

  // --- Dynamic Lighting Visuals ---

  const DynamicLighting = () => (
    <div className="absolute inset-0 pointer-events-none z-0">
      <motion.div 
        animate={{ 
          background: `radial-gradient(circle at 50% 50%, ${themeColors[0]}${Math.floor(20 + energyFactor * 60).toString(16)} 0%, transparent 80%)`,
          opacity: isPlaying ? [0.4, 0.6 + energyFactor * 0.4, 0.4] : 0.3
        }}
        transition={{ duration: 4 - energyFactor * 2.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0"
      />
      <motion.div
        animate={{ 
          opacity: isPlaying ? [0.05, 0.15 + energyFactor * 0.25, 0.05] : 0.05,
          scale: isPlaying ? [1, 1.1 + energyFactor * 0.15, 1] : 1,
          rotate: isPlaying ? [-2, 2, -2] : 0
        }}
        transition={{ duration: 3 - energyFactor, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[180%] h-[120%] bg-gradient-to-b from-white/10 via-transparent to-transparent blur-[120px]"
      />
      <motion.div
        animate={{ 
          opacity: isPlaying ? [0.1, 0.3 + energyFactor * 0.4, 0.1] : 0.1,
          scaleX: isPlaying ? [0.8, 1.2, 0.8] : 1
        }}
        transition={{ duration: 5 - energyFactor * 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[30%] bg-gradient-to-t from-white/5 to-transparent blur-[80px]"
        style={{ backgroundColor: `${themeColors[0]}10` }}
      />
    </div>
  );

  const CoupleVisuals = () => (
    <div className="absolute inset-0 pointer-events-none z-[5] overflow-hidden">
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: '110vh', x: `${Math.random() * 100}vw`, opacity: 0, scale: 0.5 }}
          animate={{ 
            y: '-10vh', 
            opacity: [0, 0.8 + energyFactor * 0.2, 0.8, 0], 
            scale: [0.5, 1 + energyFactor * 0.3, 1.2, 0.7],
            rotate: [0, 20, -20, 0],
            x: [`${Math.random() * 100}vw`, `${(Math.random() * 20 - 10) + (i * 6)}vw`]
          }}
          transition={{ duration: (12 + Math.random() * 8) / (1 + energyFactor * 0.5), repeat: Infinity, delay: Math.random() * 10, ease: "linear" }}
          className="absolute"
        >
          <Heart size={24 + Math.random() * 40} fill="#f472b6" className="text-pink-400 opacity-50 blur-[1px] drop-shadow-[0_0_15px_rgba(244,114,182,0.9)]" />
        </motion.div>
      ))}
      <motion.div 
        animate={{ opacity: isPlaying ? [0.1, 0.3 + energyFactor * 0.2, 0.1] : 0.1 }}
        transition={{ duration: 5 - energyFactor * 2, repeat: Infinity }}
        className="absolute inset-0 bg-gradient-to-t from-pink-500/20 via-transparent to-transparent"
      />
    </div>
  );

  const GroupVisuals = () => (
    <div className="absolute inset-0 pointer-events-none z-[5] opacity-40">
      <div className="absolute inset-0 border-[0.5px] border-cyan-500/20" style={{ backgroundSize: '100px 100px', backgroundImage: 'linear-gradient(to right, rgba(34, 211, 238, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(34, 211, 238, 0.1) 1px, transparent 1px)' }} />
      {[...Array(10)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: '-100%' }}
          animate={{ y: '100%' }}
          transition={{ duration: (8 + Math.random() * 5) / (1 + energyFactor * 0.5), repeat: Infinity, ease: "linear", delay: i * 0.8 }}
          className="absolute w-[2px] bg-gradient-to-b from-transparent via-cyan-400/60 to-transparent blur-[1px]"
          style={{ left: `${i * 10}%`, height: '40vh' }}
        />
      ))}
      {[...Array(25)].map((_, i) => (
        <motion.div
          key={`dot-${i}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.5 + energyFactor * 0.5, 0], scale: [0, 1 + energyFactor, 0] }}
          transition={{ duration: (3 + Math.random() * 3) / (1 + energyFactor), repeat: Infinity, delay: Math.random() * 10 }}
          className="absolute w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)]"
          style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%` }}
        />
      ))}
    </div>
  );

  return (
    <div 
      className={`relative min-h-screen w-full bg-black overflow-hidden select-none preserve-3d transition-colors duration-1000 ${roomJoined ? (roomType === 'couple' ? 'bg-[#1a050d]' : 'bg-[#05111a]') : ''}`}
      onMouseMove={handleMouseMove}
    >
      <div className="grid-floor" />
      <DynamicLighting />
      <AnimatePresence>
        {roomJoined && roomType === 'couple' && <CoupleVisuals />}
        {roomJoined && roomType === 'group' && <GroupVisuals />}
      </AnimatePresence>

      <AnimatePresence>
        {syncStatusMsg && (
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 80, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] px-6 py-2 bg-red-600 rounded-full shadow-2xl flex items-center space-x-3 backdrop-blur-md border border-red-400/30">
            <Zap size={14} className="text-white animate-pulse" />
            <span className="text-[10px] font-syncopate font-black uppercase tracking-widest text-white">{syncStatusMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="fixed top-0 left-0 right-0 z-50 p-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto">
          <span className="font-syncopate text-4xl font-black tracking-tighter" style={{ color: themeColors[0], textShadow: `0 0 ${20 + energyFactor * 20}px ${themeColors[0]}aa` }}>v1</span>
        </div>
        <div className="flex items-center space-x-4 pointer-events-auto">
          {roomJoined && (
            <div className="flex items-center space-x-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 backdrop-blur-xl">
              <Users size={14} className={roomType === 'couple' ? 'text-pink-500' : 'text-cyan-500'} />
              <span className="text-[8px] font-syncopate font-black uppercase tracking-widest text-white/60">{roomType} mode</span>
            </div>
          )}
          <button onClick={() => setIsProfileOpen(true)} className="p-4 bg-white/5 backdrop-blur-2xl rounded-full border border-white/10 text-white shadow-xl hover:bg-white/10 transition-all">
            <Settings size={24} />
          </button>
        </div>
      </div>

      {roomJoined && (
        <motion.div initial={{ y: -50 }} animate={{ y: 0 }} className="fixed top-[calc(env(safe-area-inset-top)+6rem)] left-1/2 -translate-x-1/2 z-[40] flex items-center space-x-3 px-6 py-3 bg-black/40 backdrop-blur-2xl rounded-full border border-white/5 shadow-2xl">
          <div className="flex -space-x-2 mr-2">
            {members.map((m, i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-zinc-900 flex items-center justify-center relative overflow-hidden">
                <User size={14} className={roomType === 'couple' ? 'text-pink-400' : 'text-cyan-400'} />
              </div>
            ))}
          </div>
          <div className="h-4 w-[1px] bg-white/10" />
          <button onClick={() => setIsChatOpen(true)} className="p-2 text-white/60 hover:text-white transition-colors relative">
            <MessageSquare size={18} />
            <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
          </button>
          <button onClick={exitRoom} className="p-2 text-white/30 hover:text-red-500 transition-colors"><X size={18} /></button>
        </motion.div>
      )}

      <motion.div 
        animate={{ opacity: (isCollectionOpen || isProfileOpen || isChatOpen) ? 0.2 : 1, filter: (isCollectionOpen || isProfileOpen || isChatOpen) ? 'blur(20px)' : 'blur(0px)' }}
        className="relative h-screen w-full flex flex-col items-center justify-center px-4"
      >
        <motion.div style={{ rotateX, rotateY }} className="w-full max-w-[420px] flex flex-col items-center preserve-3d">
          <motion.div className="relative mb-12 w-64 h-64 md:w-80 md:h-80">
            <AnimatePresence mode="wait">
              <motion.div key={currentTrack.id} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.1, opacity: 0 }} className="w-full h-full relative">
                <motion.div 
                  animate={{ rotate: isPlaying ? currentTime * 15 : 0 }} 
                  className="w-full h-full rounded-full overflow-hidden border-[8px] border-zinc-900 shadow-[0_40px_80px_rgba(0,0,0,0.8)] relative z-20"
                >
                  <motion.img 
                    src={currentTrack.coverUrl} 
                    className="w-full h-full object-cover" 
                    style={{ 
                      scale: 1.25, // Oversized so parallax doesn't show edges
                      x: finalParallaxX, 
                      y: finalParallaxY 
                    }} 
                  />
                </motion.div>
                
                <motion.div 
                  animate={{ 
                    scale: isPlaying ? [1, 1.1 + energyFactor * 0.2, 1] : 1, 
                    opacity: isPlaying ? [0.3, 0.6 + energyFactor * 0.3, 0.3] : 0.2 
                  }}
                  transition={{ duration: 2 - energyFactor, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-[-20px] rounded-full blur-[60px] z-10"
                  style={{ backgroundColor: themeColors[0] }}
                />
              </motion.div>
            </AnimatePresence>
          </motion.div>

          <motion.div className="w-full glass-panel rounded-[50px] p-8 md:p-10 flex flex-col items-center shadow-2xl">
            <div className="w-full mb-8 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <motion.h1 
                  animate={{ textShadow: `0 0 ${20 + energyFactor * 30}px ${themeColors[0]}cc` }}
                  className="font-syncopate text-xl font-black tracking-widest uppercase truncate text-white"
                >
                  {currentTrack.title}
                </motion.h1>
                <p className="font-syncopate text-[10px] tracking-[0.4em] uppercase opacity-40 mt-1" style={{ color: themeColors[0] }}>{currentTrack.artist}</p>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => setIsCollectionOpen(true)} className="p-3 bg-white/5 rounded-2xl text-zinc-500 hover:text-white transition-colors"><LayoutDashboard size={20} /></button>
                <button onClick={() => setShowLyrics(!showLyrics)} className={`p-3 rounded-2xl transition-all ${showLyrics ? 'bg-white/10 text-white' : 'bg-white/5 text-zinc-500'}`}><AlignLeft size={20} /></button>
              </div>
            </div>

            <div className="w-full mb-8">
              <Visualizer isPlaying={isPlaying} theme={{...visualizerTheme, primaryColor: themeColors[0]}} />
            </div>

            <div className="w-full mb-10">
              <div className="flex justify-between text-[10px] font-mono text-zinc-600 mb-3 tracking-widest uppercase">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <div className="relative h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden cursor-pointer" onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                if (audioRef.current) {
                  const newTime = ((e.clientX - rect.left) / rect.width) * duration;
                  audioRef.current.currentTime = newTime;
                  broadcastSync('seek');
                }
              }}>
                <motion.div className="absolute h-full" style={{ width: `${(currentTime / (duration || 1)) * 100}%`, backgroundColor: themeColors[0], boxShadow: `0 0 15px ${themeColors[0]}` }} />
              </div>
            </div>

            <div className="flex items-center space-x-6 sm:space-x-8 mb-8">
              <button 
                onClick={() => setIsShuffle(!isShuffle)} 
                className={`transition-colors ${isShuffle ? '' : 'text-zinc-600'}`}
                style={{ color: isShuffle ? themeColors[0] : undefined }}
              >
                <Shuffle size={20} />
              </button>
              
              <button onClick={handlePrevious} className="text-zinc-500 active:scale-75 transition-transform"><SkipBack size={28}/></button>
              
              <button onClick={togglePlay} className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full flex items-center justify-center text-black shadow-2xl active:scale-90 transition-transform">
                {isPlaying ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
              </button>
              
              <button onClick={handleNext} className="text-zinc-500 active:scale-75 transition-transform"><SkipForward size={28}/></button>

              <button 
                onClick={toggleRepeat} 
                className={`transition-colors ${repeatMode === 'none' ? 'text-zinc-600' : ''}`}
                style={{ color: repeatMode !== 'none' ? themeColors[0] : undefined }}
              >
                {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
              </button>
            </div>

            {roomJoined && (
              <div className="w-full pt-6 flex justify-center border-t border-white/5">
                <button 
                  onMouseDown={() => setIsMicActive(true)}
                  onMouseUp={() => setIsMicActive(false)}
                  className={`flex items-center space-x-4 px-10 py-4 rounded-full border transition-all duration-300 ${isMicActive ? 'bg-red-500 border-red-400 text-white scale-105 shadow-lg' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                >
                  <Mic size={18} className={isMicActive ? 'animate-pulse' : ''} />
                  <span className="text-[10px] font-syncopate font-black uppercase tracking-widest">Push to Talk</span>
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {isProfileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsProfileOpen(false)} className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed inset-y-0 right-0 z-[101] w-full max-sm bg-[#080808] border-l border-white/10 flex flex-col shadow-[-50px_0_100px_rgba(0,0,0,1)]">
              <div className="p-10 pt-[calc(env(safe-area-inset-top)+2rem)] flex items-center justify-between border-b border-white/5">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-red-600/10 rounded-2xl border border-red-500/20"><Settings size={22} className="text-red-500" /></div>
                  <h2 className="text-white font-syncopate text-sm font-black uppercase tracking-widest">Interface</h2>
                </div>
                <button onClick={() => setIsProfileOpen(false)} className="p-2 text-zinc-500 hover:text-white transition-colors"><X size={24} /></button>
              </div>

              <div className="flex p-2 bg-black/40 border-b border-white/5">
                {(['account', 'rooms', 'settings'] as ProfileTab[]).map(tab => (
                  <button key={tab} onClick={() => setProfileTab(tab)} className={`flex-1 py-3 px-4 rounded-xl text-[9px] font-syncopate uppercase tracking-widest transition-all ${profileTab === tab ? 'bg-white/5 text-red-500 font-bold' : 'text-zinc-600'}`}>{tab}</button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-12">
                <AnimatePresence mode="wait">
                  {profileTab === 'account' && (
                    <motion.div key="account" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-24 h-24 rounded-full bg-zinc-900 border-2 border-white/5 flex items-center justify-center">
                          <User size={40} className="text-zinc-700" />
                        </div>
                        <div>
                          <h3 className="text-white font-syncopate text-xs font-black uppercase tracking-widest">Guest Node</h3>
                          <p className="text-[9px] text-zinc-600 uppercase tracking-widest mt-1">Status: Unidentified</p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <span className="text-[8px] font-syncopate font-black text-zinc-600 uppercase tracking-widest block text-center">Establish Identity</span>
                        <div className="space-y-3">
                          <button className="w-full p-5 bg-white/5 border border-white/5 rounded-3xl flex items-center justify-between hover:bg-white/10 transition-all group">
                            <div className="flex items-center space-x-4">
                              <Chrome size={18} className="text-zinc-400 group-hover:text-red-500 transition-colors" />
                              <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-widest">Google Sync</span>
                            </div>
                            <ChevronLeft size={14} className="text-zinc-800 rotate-180" />
                          </button>
                          <button className="w-full p-5 bg-white/5 border border-white/5 rounded-3xl flex items-center justify-between hover:bg-white/10 transition-all group">
                            <div className="flex items-center space-x-4">
                              <Facebook size={18} className="text-zinc-400 group-hover:text-blue-500 transition-colors" />
                              <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-widest">Facebook Relay</span>
                            </div>
                            <ChevronLeft size={14} className="text-zinc-800 rotate-180" />
                          </button>
                          <button className="w-full p-5 bg-white/5 border border-white/5 rounded-3xl flex items-center justify-between hover:bg-white/10 transition-all group">
                            <div className="flex items-center space-x-4">
                              <Phone size={18} className="text-zinc-400 group-hover:text-emerald-500 transition-colors" />
                              <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-widest">Cellular Code</span>
                            </div>
                            <ChevronLeft size={14} className="text-zinc-800 rotate-180" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {profileTab === 'rooms' && (
                    <motion.div key="rooms" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                      <div className="grid grid-cols-1 gap-4">
                        <button onClick={() => setRoomType('couple')} className={`p-8 rounded-[40px] border flex flex-col items-center text-center transition-all ${roomType === 'couple' ? 'bg-pink-500/10 border-pink-500/40 shadow-lg' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                          <Heart size={36} className={roomType === 'couple' ? 'text-pink-400' : 'text-zinc-700'} />
                          <h4 className="text-white font-syncopate text-[10px] font-black uppercase tracking-widest mt-6">Couple Room</h4>
                          <p className="text-[8px] text-zinc-600 uppercase mt-2">Binary Link (2 Max)</p>
                        </button>
                        <button onClick={() => setRoomType('group')} className={`p-8 rounded-[40px] border flex flex-col items-center text-center transition-all ${roomType === 'group' ? 'bg-cyan-500/10 border-cyan-500/40 shadow-lg' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                          <Users size={36} className={roomType === 'group' ? 'text-cyan-400' : 'text-zinc-700'} />
                          <h4 className="text-white font-syncopate text-[10px] font-black uppercase tracking-widest mt-6">Group Room</h4>
                          <p className="text-[8px] text-zinc-600 uppercase mt-2">Neural Cluster (4 Max)</p>
                        </button>
                      </div>
                      {roomType !== 'none' && !roomJoined && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 bg-black/40 rounded-[40px] border border-white/10 space-y-6">
                          <input type="text" maxLength={4} placeholder="NODE KEY" value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())} className="w-full bg-transparent border-b border-white/20 p-5 text-center font-mono text-3xl tracking-[0.5em] text-white focus:outline-none focus:border-red-500 transition-all" />
                          <button onClick={handleJoinRoom} className={`w-full py-5 rounded-3xl font-syncopate font-black text-[11px] uppercase tracking-widest bg-white text-black active:scale-95 transition-all`}>Connect Node</button>
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  {profileTab === 'settings' && (
                    <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-12">
                      <section className="space-y-6">
                        <div className="flex items-center space-x-3 text-zinc-600">
                          <Volume2 size={16} />
                          <span className="text-[9px] font-syncopate font-black uppercase tracking-widest">Audio Core</span>
                        </div>
                        <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[40px] space-y-6">
                          {[ {label: 'High-Fi Output', state: highFiEnabled, set: setHighFiEnabled}, {label: 'Normalization', state: normalizationEnabled, set: setNormalizationEnabled} ].map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-widest">{item.label}</span>
                              <div onClick={() => item.set(!item.state)} className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${item.state ? 'bg-red-600' : 'bg-zinc-800'}`}>
                                <motion.div animate={{ x: item.state ? 22 : 4 }} className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section className="space-y-6">
                        <div className="flex items-center space-x-3 text-zinc-600">
                          <Palette size={16} />
                          <span className="text-[9px] font-syncopate font-black uppercase tracking-widest">Visual Engine</span>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {VISUALIZER_THEMES.map(theme => (
                            <button key={theme.id} onClick={() => setVisualizerTheme(theme)} className={`p-5 rounded-3xl border flex items-center justify-between transition-all ${visualizerTheme.id === theme.id ? 'bg-red-500/10 border-red-500/30 shadow-lg' : 'bg-white/5 border-white/5 opacity-60'}`}>
                              <div className="flex items-center space-x-4">
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
                                <span className="text-[10px] font-bold uppercase text-white tracking-widest">{theme.name}</span>
                              </div>
                              {visualizerTheme.id === theme.id && <Check size={14} className="text-red-500" />}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center justify-between p-8 bg-white/[0.02] border border-white/5 rounded-[40px]">
                          <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-widest">Interface Motion</span>
                          <div onClick={() => setUiMotionEnabled(!uiMotionEnabled)} className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${uiMotionEnabled ? 'bg-red-600' : 'bg-zinc-800'}`}>
                            <motion.div animate={{ x: uiMotionEnabled ? 22 : 4 }} className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md" />
                          </div>
                        </div>
                      </section>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="p-10 border-t border-white/5">
                <button className="w-full p-5 bg-red-600/10 border border-red-500/20 rounded-3xl flex items-center justify-center space-x-3 text-red-500 active:scale-95 transition-all">
                  <LogOut size={18} />
                  <span className="text-[11px] font-syncopate font-black uppercase tracking-widest">End Session</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCollectionOpen && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed inset-0 glass-panel z-[200] rounded-t-[60px] p-10 pt-[calc(env(safe-area-inset-top)+2rem)] flex flex-col shadow-[-50px_0_100px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between mb-10">
              <button onClick={() => setIsCollectionOpen(false)} className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors"><ChevronLeft size={24}/></button>
              <div className="flex items-center p-1.5 bg-black/60 rounded-full border border-white/10">
                {['explore', 'local'].map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-10 py-3 rounded-full text-[10px] font-syncopate uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-black font-black' : 'text-zinc-600'}`}>{tab}</button>
                ))}
              </div>
              <div className="w-12" />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {activeTab === 'local' ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-10 space-y-8">
                  <div className="p-10 rounded-full bg-red-600/5 border border-red-500/10"><FolderOpen size={48} className="text-red-500" /></div>
                  <div className="space-y-4">
                    <h3 className="text-white font-syncopate text-sm font-black uppercase tracking-widest">Local Signal Terminal</h3>
                    <p className="text-zinc-600 text-[10px] uppercase tracking-widest max-w-sm leading-relaxed">Broadcast your own encrypted files on the shared spectrum. Perfect for personal archives.</p>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="audio/*" multiple className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} className="px-14 py-6 bg-white text-black rounded-full font-syncopate font-black text-[11px] uppercase tracking-widest flex items-center space-x-4 shadow-3xl active:scale-95 transition-transform"><UploadCloud size={20} /><span>Scan Terminal</span></button>
                  
                  {localTracks.length > 0 && (
                    <div className="w-full mt-10 grid grid-cols-1 gap-4">
                      {localTracks.map(track => (
                        <div key={track.id} onClick={() => playTrack(track)} className="w-full flex items-center p-5 rounded-[32px] bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer group">
                          <div className="w-12 h-12 rounded-2xl bg-zinc-950 flex items-center justify-center mr-5"><FileMusic size={24} className="text-red-500" /></div>
                          <div className="text-left flex-1 min-w-0">
                            <h4 className="text-white font-syncopate text-[10px] font-black uppercase truncate tracking-widest">{track.title}</h4>
                            <p className="text-zinc-600 text-[8px] uppercase tracking-widest mt-1">Local Node Data</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
                  {allAvailableTracks.filter(t => !t.isLocal).map(track => (
                    <div key={track.id} onClick={() => playTrack(track)} className={`flex items-center p-6 rounded-[48px] bg-black/40 border border-white/5 hover:border-white/20 transition-all group cursor-pointer ${currentTrackId === track.id ? 'border-red-500/40 bg-red-600/5' : ''}`}>
                      <div className="w-16 h-16 rounded-3xl overflow-hidden mr-5 shadow-2xl group-hover:scale-105 transition-transform"><img src={track.coverUrl} className="w-full h-full object-cover" /></div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-syncopate text-[11px] font-black uppercase truncate tracking-widest">{track.title}</h4>
                        <p className="text-zinc-600 text-[9px] uppercase tracking-widest mt-1">{track.artist}</p>
                      </div>
                      {currentTrackId === track.id && <Activity size={18} className="text-red-500" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isChatOpen && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed inset-x-0 bottom-0 z-[70] h-[75dvh] bg-[#080808] rounded-t-[60px] border-t border-white/10 flex flex-col shadow-[0_-40px_100px_rgba(0,0,0,1)]">
            <div className="p-10 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center space-x-5">
                <MessageSquare size={24} className="text-red-500" />
                <h2 className="text-white font-syncopate text-[11px] font-black uppercase tracking-[0.3em]">Spectrum Relay</h2>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="p-3 text-zinc-600 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.user === 'You' ? 'items-end' : 'items-start'}`}>
                  <span className="text-[8px] font-syncopate uppercase font-black text-white/20 mb-2 px-4 tracking-widest">{msg.user}</span>
                  <div className={`max-w-[85%] px-7 py-5 rounded-[32px] text-[12px] leading-relaxed shadow-lg ${msg.user === 'You' ? 'bg-red-600 text-white rounded-tr-none' : 'bg-white/5 text-zinc-300 rounded-tl-none border border-white/10'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-10 border-t border-white/5 bg-black/20 flex items-center space-x-5">
              <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder="Transmit message node..." className="flex-1 bg-white/5 border border-white/10 rounded-full px-8 py-5 text-[12px] text-white placeholder:text-white/20 focus:outline-none focus:border-red-500 transition-all" />
              <button onClick={sendMessage} className="p-5 bg-red-600 rounded-full text-white shadow-xl active:scale-90 transition-transform"><Send size={22} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <audio 
        ref={audioRef} 
        src={currentTrack.audioUrl} 
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)} 
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
        onEnded={handleTrackEnded}
      />
    </div>
  );
};

export default App;
