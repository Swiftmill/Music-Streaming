import { motion } from 'framer-motion';
import { ListMusic, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { usePlayer } from '../hooks/usePlayer';

export default function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    next,
    previous,
    repeatMode,
    setRepeatMode,
    shuffle,
    setShuffle,
    setVolume
  } = usePlayer();

  const cycleRepeat = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  return (
    <motion.footer
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-gradient-to-t from-black/80 via-black/70 to-transparent backdrop-blur-xl"
    >
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center gap-6">
        <div className="flex-1 flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-glass-gradient backdrop-blur-lg flex items-center justify-center text-accent font-semibold">
            {currentTrack ? currentTrack.title.slice(0, 1) : <ListMusic size={22} />}
          </div>
          <div className="truncate">
            <p className="text-sm text-slate-300">{currentTrack?.artistDisplayName || 'Aucun titre en lecture'}</p>
            <p className="text-lg font-semibold text-white truncate">{currentTrack?.title || 'Sélectionnez un morceau'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className={`player-button ${shuffle ? 'text-accent' : 'text-slate-300'}`} onClick={() => setShuffle(!shuffle)}>
            <Shuffle size={18} />
          </button>
          <button className="player-button" onClick={previous}>
            <SkipBack size={18} />
          </button>
          <button className="player-button bg-accent text-surface hover:bg-accentMuted" onClick={togglePlay}>
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button className="player-button" onClick={next}>
            <SkipForward size={18} />
          </button>
          <button
            className={`player-button ${repeatMode !== 'off' ? 'text-accent' : 'text-slate-300'}`}
            onClick={cycleRepeat}
          >
            {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
          </button>
        </div>
        <div className="hidden md:flex items-center gap-3 text-slate-300">
          <Volume2 size={18} />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-28 accent-accent"
          />
        </div>
      </div>
    </motion.footer>
  );
}
