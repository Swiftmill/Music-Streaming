import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './components/Sidebar';
import PlayerBar from './components/PlayerBar';
import UploadDialog from './components/UploadDialog';
import DashboardPage from './pages/Dashboard';
import ExplorePage from './pages/Explore';
import LibraryPage from './pages/Library';
import AdminPage from './pages/Admin';
import LoginPage from './pages/Login';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { PlayerProvider } from './hooks/usePlayer';
import { useState } from 'react';

function Layout({ children, onUpload, isAdmin }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-surface via-surface to-black text-white">
      <div className="lg:hidden sticky top-0 z-40 border-b border-white/5 bg-black/60 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-accent">Aurora</p>
          <p className="text-lg font-semibold">Wave</p>
        </div>
        <button
          onClick={onUpload}
          className="px-4 py-2 rounded-2xl bg-accent text-surface font-semibold shadow-neon"
        >
          Publier
        </button>
      </div>
      <nav className="lg:hidden px-6 py-4 flex gap-2 overflow-x-auto border-b border-white/5 bg-black/40 backdrop-blur">
        {['/', '/explore', '/library', ...(isAdmin ? ['/admin'] : [])].map((link) => (
          <NavLink
            key={link}
            to={link}
            className={({ isActive }) =>
              `px-4 py-2 rounded-2xl text-sm whitespace-nowrap transition ${isActive ? 'bg-accent text-surface' : 'bg-white/5 text-slate-300'}`
            }
          >
            {link === '/' ? 'Accueil' : link === '/explore' ? 'Explorer' : link === '/library' ? 'Bibliothèque' : 'Admin'}
          </NavLink>
        ))}
      </nav>
      <div className="mx-auto max-w-6xl flex gap-6 pb-32">
        <Sidebar onUpload={onUpload} />
        <main className="flex-1 px-4 sm:px-6 py-10">
          <AnimatePresence mode="wait">{children}</AnimatePresence>
        </main>
      </div>
      <PlayerBar />
    </div>
  );
}

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  if (loading) {
    return <div className="p-20 text-center text-slate-400">Chargement de l'expérience...</div>;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Layout onUpload={() => setUploadOpen(true)} isAdmin={user.role === 'admin'}>
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <DashboardPage refreshKey={refreshKey} />
            </motion.div>
          }
        />
        <Route
          path="/explore"
          element={
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <ExplorePage refreshKey={refreshKey} />
            </motion.div>
          }
        />
        <Route
          path="/library"
          element={
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <LibraryPage refreshKey={refreshKey} />
            </motion.div>
          }
        />
        <Route
          path="/admin"
          element={
            user.role === 'admin' ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <AdminPage />
              </motion.div>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => setRefreshKey((key) => key + 1)}
      />
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <ProtectedRoutes />
      </PlayerProvider>
    </AuthProvider>
  );
}
