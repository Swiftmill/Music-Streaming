import { motion } from 'framer-motion';
import { Play } from 'lucide-react';

export default function TrackCard({ track, index, onPlay }) {
  const handlePlay = () => {
    onPlay?.(track, index);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative overflow-hidden rounded-3xl bg-white/5 backdrop-blur border border-white/5 hover:border-accent/40 transition"
    >
      <div className="aspect-square bg-gradient-to-br from-accent/10 via-accent/5 to-transparent flex items-center justify-center">
        <span className="text-5xl font-bold text-accent/70">{track.title.slice(0, 1).toUpperCase()}</span>
      </div>
      <div className="p-4 space-y-1">
        <h3 className="font-semibold text-white truncate">{track.title}</h3>
        <p className="text-sm text-slate-400 truncate">{track.artistDisplayName}</p>
        <p className="text-xs text-slate-500 uppercase tracking-wide">{track.album}</p>
      </div>
      <button
        onClick={handlePlay}
        className="absolute bottom-4 right-4 p-3 rounded-full bg-accent text-surface shadow-neon opacity-0 group-hover:opacity-100 transition"
      >
        <Play size={18} />
      </button>
    </motion.div>
  );
}
