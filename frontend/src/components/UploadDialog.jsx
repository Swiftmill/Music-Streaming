import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { X } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';

export default function UploadDialog({ open, onClose, onUploaded }) {
  const { refreshProfile } = useAuth();
  const [title, setTitle] = useState('');
  const [album, setAlbum] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!file) {
      setError('Sélectionnez un fichier audio.');
      return;
    }
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('track', file);
      formData.append('title', title);
      formData.append('album', album);
      await api.post('/tracks/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setTitle('');
      setAlbum('');
      setFile(null);
      setError('');
      onUploaded?.();
      refreshProfile();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Échec du téléversement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.form
            onSubmit={handleUpload}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass-panel w-full max-w-lg p-8 space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">Publier un titre</h2>
                <p className="text-sm text-slate-400">Formats acceptés : MP3, WAV, FLAC, AAC, OGG (max 200 Mo)</p>
              </div>
              <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-300">Titre</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-2 w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent/70"
                  placeholder="Nom du morceau"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300">Album</label>
                <input
                  value={album}
                  onChange={(e) => setAlbum(e.target.value)}
                  className="mt-2 w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent/70"
                  placeholder="Nom de l'album ou Singles"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm text-slate-300">Fichier audio</label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="rounded-2xl bg-white/5 border border-dashed border-white/20 px-4 py-4"
                />
              </div>
              {error && <p className="text-sm text-rose-400">{error}</p>}
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-2xl bg-white/5 text-slate-300 hover:bg-white/10"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-2xl bg-accent text-surface font-semibold shadow-neon hover:bg-accentMuted transition"
              >
                {loading ? 'Envoi...' : 'Soumettre'}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
