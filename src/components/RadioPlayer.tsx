import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipForward, Volume2, ChevronUp, ChevronDown, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

interface RadioStation {
  id: string;
  name: string;
  genre: string;
  stream_url: string;
}

const FALLBACK_RADIOS: RadioStation[] = [
  {
    id: '1',
    name: 'Gym Hardstyle',
    genre: 'hardstyle',
    stream_url: 'https://streams.ilovemusic.de/iloveradio17.mp3'
  },
  {
    id: '2',
    name: 'Electronic Workout',
    genre: 'edm',
    stream_url: 'https://stream.technobase.fm/tunein-dsl.pls'
  },
  {
    id: '3',
    name: 'Techno Gym Radio',
    genre: 'techno',
    stream_url: 'https://radio.stereoscenic.com/techno'
  }
];

export default function RadioPlayer() {
  const [radios, setRadios] = useState<RadioStation[]>(FALLBACK_RADIOS);
  const [currentRadio, setCurrentRadio] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchRadios = async () => {
      try {
        const { data, error } = await supabase
          .from('training_radios')
          .select('*')
          .eq('active', true)
          .order('created_at', { ascending: true });
          
        if (!error && data && data.length > 0) {
          setRadios(data);
        }
      } catch (err) {
        console.error('Failed to fetch radios from database:', err);
      }
    };

    fetchRadios();
  }, []);

  useEffect(() => {
    if (audioRef.current && radios.length > 0) {
      audioRef.current.src = radios[currentRadio].stream_url;
      audioRef.current.volume = volume;
    }
  }, [currentRadio, radios]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const playRadio = () => {
    if (!isPlaying && audioRef.current) {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((error) => {
          console.log("Erro ao tocar:", error);
        });
    }
  };

  const pauseRadio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const nextRadio = () => {
    pauseRadio();

    let nextIndex = currentRadio + 1;
    if (nextIndex >= radios.length) {
      nextIndex = 0;
    }
    setCurrentRadio(nextIndex);

    setTimeout(() => {
      playRadio();
    }, 300);
  };

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isPlaying) {
      pauseRadio();
    } else {
      playRadio();
    }
  };

  const changeRadio = (index: number) => {
    if (currentRadio === index) return;
    
    pauseRadio();
    setCurrentRadio(index);
    
    setTimeout(() => {
      playRadio();
    }, 300);
  };

  if (radios.length === 0) return null;

  return (
    <>
      <audio id="radioAudio" ref={audioRef} preload="none"></audio>

      {/* Expanded Player Overlay */}
      <AnimatePresence>
        {isExpanded && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExpanded(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60]"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-[70] bg-[#151515] border-t border-[#ff3b3b]/30 rounded-t-[2rem] p-6 pb-24 flex flex-col gap-8 shadow-[0_-10px_40px_rgba(255,59,59,0.1)]"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-2 text-white"><Radio className="w-6 h-6 text-[#ff3b3b]" /> Rádio Treino</h3>
                <button onClick={() => setIsExpanded(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-white">
                  <ChevronDown className="w-6 h-6" />
                </button>
              </div>

              {/* Animated Equalizer */}
              <div className="flex justify-center items-end h-32 gap-2 bg-black/30 rounded-3xl p-6 border border-white/5">
                {Array.from({ length: 12 }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      height: isPlaying ? [
                        Math.random() * 80 + 20, 
                        Math.random() * 80 + 20, 
                        Math.random() * 80 + 20
                      ] : 10 
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: Math.random() * 0.5 + 0.3,
                      ease: "easeInOut"
                    }}
                    className="w-3 bg-gradient-to-t from-[#ff3b3b]/50 to-[#ff3b3b] rounded-full"
                    style={{ opacity: isPlaying ? 1 : 0.3 }}
                  />
                ))}
              </div>

              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-white">{radios[currentRadio].name}</h2>
                <p className="text-[#ff3b3b] font-medium uppercase tracking-widest text-sm">{radios[currentRadio].genre}</p>
              </div>

              {/* Main Controls */}
              <div className="flex items-center justify-center gap-6">
                <button 
                  onClick={togglePlay}
                  className="w-20 h-20 rounded-full bg-[#ff3b3b]/20 border border-[#ff3b3b]/30 flex items-center justify-center text-[#ff3b3b] shadow-[0_0_30px_rgba(255,59,59,0.1)] hover:bg-[#ff3b3b]/30 active:scale-95 transition-all"
                >
                  {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-2" />}
                </button>
                <button 
                  onClick={nextRadio}
                  className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <SkipForward className="w-6 h-6 fill-current" />
                </button>
              </div>

              {/* Volume Control */}
              <div className="flex items-center gap-4 bg-black/30 p-4 rounded-2xl border border-white/5">
                <Volume2 className="w-5 h-5 text-[#ff3b3b]" />
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#ff3b3b]"
                  style={{
                    background: `linear-gradient(to right, #ff3b3b ${volume * 100}%, rgba(255,255,255,0.1) ${volume * 100}%)`
                  }}
                />
              </div>

              {/* Station List */}
              <div className="space-y-2 overflow-y-auto max-h-[30vh] no-scrollbar">
                <h4 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4">Estações Disponíveis</h4>
                {radios.map((radio, idx) => (
                  <div 
                    key={radio.id || idx}
                    onClick={() => changeRadio(idx)}
                    className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all ${currentRadio === idx ? 'bg-[#ff3b3b]/10 border border-[#ff3b3b]/30' : 'bg-white/5 hover:bg-white/10 border border-transparent'}`}
                  >
                    <div>
                      <h4 className={`font-bold ${currentRadio === idx ? 'text-[#ff3b3b]' : 'text-white'}`}>{radio.name}</h4>
                      <p className="text-xs text-white/50 mt-1 uppercase">{radio.genre}</p>
                    </div>
                    {currentRadio === idx && isPlaying && (
                      <div className="flex gap-1 items-end h-4">
                        <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-1 bg-[#ff3b3b] rounded-full" />
                        <motion.div animate={{ height: [8, 4, 8] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1 bg-[#ff3b3b] rounded-full" />
                        <motion.div animate={{ height: [4, 10, 4] }} transition={{ repeat: Infinity, duration: 0.4 }} className="w-1 bg-[#ff3b3b] rounded-full" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mini Player (Fixed Bottom, above navbar) */}
      <div 
        className={`fixed bottom-[80px] left-0 right-0 h-16 bg-[#151515]/95 backdrop-blur-xl border-t border-white/5 flex items-center px-4 gap-3 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] transition-transform duration-300 cursor-pointer ${isExpanded ? 'translate-y-full' : 'translate-y-0'}`}
        onClick={() => setIsExpanded(true)}
      >
        <div className="w-10 h-10 rounded-xl bg-black/50 flex items-center justify-center border border-[#ff3b3b]/30 relative overflow-hidden">
          <Radio className="w-5 h-5 text-[#ff3b3b]" />
          {isPlaying && (
            <div className="absolute inset-0 bg-[#ff3b3b]/10 flex items-center justify-center gap-[2px]">
              <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-[2px] bg-[#ff3b3b] rounded-full" />
              <motion.div animate={{ height: [8, 4, 8] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-[2px] bg-[#ff3b3b] rounded-full" />
              <motion.div animate={{ height: [4, 10, 4] }} transition={{ repeat: Infinity, duration: 0.4 }} className="w-[2px] bg-[#ff3b3b] rounded-full" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-white truncate">{radios[currentRadio].name}</h4>
          <p className="text-[10px] text-white/50 truncate font-medium uppercase tracking-wider flex items-center gap-1">
            {isPlaying ? <span className="text-[#ff3b3b]">{radios[currentRadio].genre}</span> : 'Toque para expandir'}
            <ChevronUp className="w-3 h-3 text-white/30" />
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={togglePlay} 
            className="w-10 h-10 flex items-center justify-center text-white bg-white/5 rounded-full hover:bg-[#ff3b3b]/20 hover:text-[#ff3b3b] transition-colors"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); nextRadio(); }}
            className="w-10 h-10 flex items-center justify-center text-white bg-white/5 rounded-full hover:bg-white/10 transition-colors"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>
        </div>
      </div>
    </>
  );
}
