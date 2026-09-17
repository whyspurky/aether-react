// src/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { TitleBar } from './components/TitleBar';
import { Layout } from './components/Layout';
import { useTheme } from './hooks/useTheme';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import LibraryPage from './pages/LibraryPage';
import PlayerPage from './pages/PlayerPage';
import SettingsPage from './pages/SettingsPage';
import ArtistPage from './pages/ArtistPage';
import PlaylistPage from './pages/PlaylistPage';
import { useStore } from './store/store';
import { api } from './lib/api';


const appWindow = getCurrentWindow();

function AppContent() {
  const preloadHomePageData = useStore((s) => s.preloadHomePageData);

  useTheme();

  useEffect(() => {
    getCurrentWindow().show();
  }, []);

  useEffect(() => {
    const prevent = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', prevent);
    return () => document.removeEventListener('contextmenu', prevent);
  }, []);

  useEffect(() => {
    api.setVolume(useStore.getState().player.volume);
    preloadHomePageData();
  }, [preloadHomePageData]);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/player" element={<PlayerPage />} />
        <Route path="/artist/:id" element={<ArtistPage />} />
        <Route path="/playlist/:id" element={<PlaylistPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  );
}

function App() {
  const handleMinimize = async () => {
    try { await appWindow.minimize(); } catch {}
  };

  const handleMaximize = async () => {
    try { await appWindow.toggleMaximize(); } catch {}
  };

  const handleClose = async () => {
    try { await appWindow.close(); } catch {}
  };

  return (
    <BrowserRouter>
      <TitleBar onMinimize={handleMinimize} onMaximize={handleMaximize} onClose={handleClose} />
      <AppContent />
    </BrowserRouter>
  );
}

export default App;