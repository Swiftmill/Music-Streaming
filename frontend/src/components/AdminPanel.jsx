import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Check, Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import api from '../utils/api';

export default function AdminPanel() {
  const [pendingTracks, setPendingTracks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState('');
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pendingRes, usersRes, logRes] = await Promise.all([
        api.get('/tracks/pending'),
        api.get('/admin/users'),
        api.get('/admin/logs', { responseType: 'text' })
      ]);
      setPendingTracks(pendingRes.data);
      setUsers(usersRes.data);
      setLog(logRes.data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Impossible de charger les données administrateur.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const approveTrack = async (trackId) => {
    try {
      await api.post(`/admin/tracks/${trackId}/approve`);
      fetchData();
    } catch (err) {
      console.error(err);
      setError("Impossible d'approuver ce titre.");
    }
  };

  const rejectTrack = async (trackId) => {
    try {
      await api.post(`/admin/tracks/${trackId}/reject`);
      fetchData();
    } catch (err) {
      console.error(err);
      setError('Impossible de rejeter ce titre.');
    }
  };

  const toggleVerify = async (username, verified) => {
    try {
      await api.patch(`/admin/users/${username}`, { verified: !verified });
      fetchData();
    } catch (err) {
      console.error(err);
      setError('Impossible de mettre à jour cet utilisateur.');
    }
  };

  const createBackup = async () => {
    try {
      await api.post('/admin/backup');
      fetchData();
    } catch (err) {
      console.error(err);
      setError('Échec de la sauvegarde.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col lg:flex-row gap-6">
        <motion.section
          layout
          className="flex-1 glass-panel p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Morceaux en attente</h2>
              <p className="text-sm text-slate-400">Validez ou refusez les soumissions avant publication.</p>
            </div>
            <button
              onClick={createBackup}
              className="px-4 py-2 rounded-2xl bg-white/5 text-slate-300 hover:bg-white/10"
            >
              Sauvegarder (.zip)
            </button>
          </div>
          <div className="space-y-4">
            {pendingTracks.length === 0 && <p className="text-slate-400">Aucun morceau en attente.</p>}
            {pendingTracks.map((track) => (
              <div key={track.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                <div>
                  <p className="font-medium text-white">{track.title}</p>
                  <p className="text-sm text-slate-400">{track.artistDisplayName}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => approveTrack(track.id)}
                    className="px-3 py-2 rounded-2xl bg-accent/10 text-accent hover:bg-accent/20 flex items-center gap-2"
                  >
                    <Check size={16} /> Approuver
                  </button>
                  <button
                    onClick={() => rejectTrack(track.id)}
                    className="px-3 py-2 rounded-2xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 flex items-center gap-2"
                  >
                    <Trash2 size={16} /> Rejeter
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
        <motion.section layout className="w-full lg:w-80 glass-panel p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white">Utilisateurs</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {users.map((user) => (
              <div key={user.username} className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div>
                  <p className="font-medium text-white flex items-center gap-2">
                    {user.displayName}
                    {user.verified && <ShieldCheck size={16} className="text-accent" />}
                  </p>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">{user.username}</p>
                </div>
                <button
                  onClick={() => toggleVerify(user.username, user.verified)}
                  className="px-3 py-1 rounded-2xl bg-accent/10 text-accent hover:bg-accent/20 text-sm"
                >
                  {user.verified ? 'Retirer badge' : 'Vérifier'}
                </button>
              </div>
            ))}
          </div>
        </motion.section>
      </div>
      <motion.section layout className="glass-panel p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Journal d'activité</h2>
        <pre className="max-h-60 overflow-y-auto text-sm text-slate-400 whitespace-pre-wrap">{log || 'Aucun log disponible.'}</pre>
      </motion.section>
      {error && <p className="text-rose-400">{error}</p>}
    </div>
  );
}
