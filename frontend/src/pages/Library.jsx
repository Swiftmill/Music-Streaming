import { useEffect, useState } from 'react';
import api from '../utils/api';
import TrackCard from '../components/TrackCard';
import { useAuth } from '../hooks/useAuth';
import { usePlayer } from '../hooks/usePlayer';

export default function LibraryPage({ refreshKey = 0 }) {
  const { user } = useAuth();
  const { setQueueAndPlay } = usePlayer();
  const [tracks, setTracks] = useState([]);

  useEffect(() => {
    async function fetch() {
      const { data } = await api.get('/tracks');
      const mine = data
        .filter((track) => track.artistUsername === user?.username)
        .map((track) => ({ ...track, streamUrl: `/api/tracks/${track.id}/stream` }));
      setTracks(mine);
    }
    fetch();
  }, [user, refreshKey]);

  if (!tracks.length) {
    return <p className="text-slate-400">Aucun titre publié pour l'instant.</p>;
  }

  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {tracks.map((track, index) => (
        <TrackCard key={track.id} track={track} index={index} onPlay={() => setQueueAndPlay(tracks, index)} />
      ))}
    </div>
  );
}
