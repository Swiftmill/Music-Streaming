import { useEffect, useState } from 'react';
import api from '../utils/api';
import TrackCard from '../components/TrackCard';
import { usePlayer } from '../hooks/usePlayer';

export default function ExplorePage({ refreshKey = 0 }) {
  const [tracks, setTracks] = useState([]);
  const { setQueueAndPlay } = usePlayer();

  useEffect(() => {
    async function fetch() {
      const { data } = await api.get('/tracks');
      setTracks(
        data
          .map((track) => ({ ...track, streamUrl: `/api/tracks/${track.id}/stream` }))
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      );
    }
    fetch();
  }, [refreshKey]);

  return (
    <div className="space-y-8 pb-32">
      <div>
        <h2 className="text-3xl font-semibold text-white">Nouveautés</h2>
        <p className="text-slate-400">Dernières sorties approuvées par l'équipe.</p>
      </div>
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {tracks.map((track, index) => (
          <TrackCard
            key={track.id}
            track={track}
            index={index}
            onPlay={() => setQueueAndPlay(tracks, index)}
          />
        ))}
        {tracks.length === 0 && <p className="text-slate-400">Aucun titre pour le moment.</p>}
      </div>
    </div>
  );
}
