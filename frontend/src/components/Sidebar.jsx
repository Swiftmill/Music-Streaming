import { Home, ListMusic, LogOut, Search, ShieldCheck, Upload } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';

const navLinks = [
  { to: '/', label: 'Accueil', icon: Home },
  { to: '/explore', label: 'Explorer', icon: Search },
  { to: '/library', label: 'Ma bibliothèque', icon: ListMusic }
];

export default function Sidebar({ onUpload }) {
  const { user, logout } = useAuth();

  return (
    <motion.aside
      initial={{ x: -40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="hidden lg:flex flex-col w-72 px-6 py-8 gap-10 bg-black/40 backdrop-blur-xl border-r border-white/5"
    >
      <div>
        <span className="text-xs uppercase tracking-[0.6em] text-accent">Aurora</span>
        <h1 className="mt-4 text-3xl font-semibold text-gradient">Wave</h1>
      </div>
      <nav className="flex flex-col gap-2">
        {navLinks.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-2xl transition hover:bg-white/5 ${isActive ? 'bg-white/10 text-accent' : 'text-slate-300'}`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
        <button
          onClick={onUpload}
          className="mt-4 flex items-center gap-3 px-4 py-3 rounded-2xl bg-accent/10 text-accent hover:bg-accent/20 transition"
        >
          <Upload size={20} />
          <span>Publier un titre</span>
        </button>
        {user?.role === 'admin' && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-2xl transition hover:bg-white/5 ${isActive ? 'bg-white/10 text-accent' : 'text-slate-300'}`
            }
          >
            <ShieldCheck size={20} />
            <span>Modération</span>
          </NavLink>
        )}
      </nav>
      <div className="mt-auto flex items-center gap-3 p-4 rounded-2xl bg-white/5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/40 to-accent/5 flex items-center justify-center text-xl font-semibold">
          {user?.displayName?.slice(0, 2)?.toUpperCase() || '?'}
        </div>
        <div className="flex-1">
          <p className="font-medium text-white flex items-center gap-2">
            {user?.displayName}
            {user?.verified && <ShieldCheck size={16} className="text-accent" />}
          </p>
          <p className="text-sm text-slate-400">{user?.username}</p>
        </div>
        <button onClick={logout} className="text-slate-400 hover:text-white" title="Se déconnecter">
          <LogOut size={20} />
        </button>
      </div>
    </motion.aside>
  );
}
