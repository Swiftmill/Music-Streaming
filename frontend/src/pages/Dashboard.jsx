import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import api from '../utils/api';
import TrackCard from '../components/TrackCard';
import { usePlayer } from '../hooks/usePlayer';

export default function DashboardPage({ refreshKey = 0 }) {
  const [tracks, setTracks] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { setQueueAndPlay } = usePlayer();

  useEffect(() => {
    async function fetchTracks() {
      try {
        const { data } = await api.get('/tracks');
        const withStreams = data.map((track) => ({
          ...track,
          streamUrl: `/api/tracks/${track.id}/stream`
        }));
        setTracks(withStreams);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchTracks();
  }, [refreshKey]);

  const filtered = useMemo(() => {
    if (!search) return tracks;
    return tracks.filter((track) =>
      `${track.title} ${track.album} ${track.artistDisplayName}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [tracks, search]);

  const handlePlay = (track, index) => {
    setQueueAndPlay(filtered, index);
  };

  return (
    <div className="pb-32 space-y-12">
      <section className="glass-panel p-10 relative overflow-hidden">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="flex items-center gap-2 text-accent uppercase text-xs tracking-[0.6em]">
            <Sparkles size={16} /> Tendances
          </span>
          <h2 className="mt-6 text-4xl md:text-5xl font-semibold text-white max-w-2xl leading-tight">
            Laissez-vous emporter par des artistes locaux vérifiés
          </h2>
          <p className="mt-4 text-slate-300 max-w-xl">
            Aurora Wave offre un espace raffiné pour diffuser votre musique, gérer vos sorties et
            construire une communauté, sans dépendance au cloud.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="px-6 py-3 rounded-2xl bg-accent text-surface font-semibold shadow-neon hover:bg-accentMuted transition">
              Écouter maintenant
            </button>
            <button className="px-6 py-3 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition">
              Voir les artistes vérifiés
            </button>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="absolute right-10 -bottom-16 w-72 h-72 rounded-full bg-accent/20 blur-3xl"
        />
      </section>

      <div className="flex items-center justify-between gap-4">
        <h3 className="text-2xl font-semibold text-white">Catalogue</h3>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un titre, artiste ou album"
          className="w-72 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent/70"
        />
      </div>

      {loading ? (
        <div className="text-slate-400">Chargement du catalogue...</div>
      ) : (
        <motion.div layout className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((track, index) => (
            <TrackCard key={track.id} track={track} index={index} onPlay={handlePlay} />
          ))}
          {filtered.length === 0 && <p className="text-slate-400">Aucun résultat.</p>}
        </motion.div>
      )}
    </div>
  );
}
