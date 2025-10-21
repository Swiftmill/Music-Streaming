import { motion } from 'framer-motion';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: 'alex', password: 'password123' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      setLoading(true);
      await login(form);
    } catch (err) {
      console.error(err);
      setError('Identifiants invalides.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface via-surface to-black">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-panel max-w-md w-full p-10"
      >
        <div className="text-center mb-10">
          <span className="text-sm uppercase tracking-[0.6em] text-accent">Aurora Wave</span>
          <h1 className="mt-4 text-4xl font-semibold text-gradient">Plongez dans vos ondes</h1>
          <p className="mt-2 text-slate-400">Plateforme de streaming locale et sécurisée.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm text-slate-300">Nom d'utilisateur</label>
            <input
              className="mt-2 w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent/70"
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm text-slate-300">Mot de passe</label>
            <input
              type="password"
              className="mt-2 w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent/70"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            />
          </div>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-accent text-surface font-semibold shadow-neon hover:bg-accentMuted transition"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
