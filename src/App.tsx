// src/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AddToPlaylistProvider } from './components/playlist/AddToPlaylistProvider';
import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { TitleBar } from './components/layout/TitleBar';
import { Layout } from './components/layout/Layout';
import { useTheme } from './hooks/ui/useTheme';
import { useStore } from './store/store';
import { api } from './lib/api';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import LibraryPage from './pages/LibraryPage';
import PlayerPage from './pages/PlayerPage';
import SettingsPage from './pages/SettingsPage';
import ArtistPage from './pages/ArtistPage';
import PlaylistPage from './pages/PlaylistPage';

const appWindow = getCurrentWindow();

function AppContent() {
  const preloadHomePageData = useStore((s) => s.preloadHomePageData);
  const proxyMode = useStore((s) => s.proxy.mode);
  const customProxy = useStore((s) => s.proxy.custom);

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
  const t = setTimeout(async () => {
    try {
      if (proxyMode === 'custom') {
        if (!customProxy.host.trim() || customProxy.port <= 0) {
          return;
        }
        await api.proxySetCustom({
          kind: customProxy.type,
          host: customProxy.host.trim(),
          port: customProxy.port,
          username: customProxy.username,
          password: customProxy.password,
        });
      } else {
        await api.proxyClear();
      }
    } catch (e) {
      useStore.getState().showToast(`прокси: ${e}`, 'error');
    }
  }, 500);

  return () => clearTimeout(t);
}, [
  proxyMode,
  customProxy.type,
  customProxy.host,
  customProxy.port,
  customProxy.username,
  customProxy.password,
]);

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
      <AddToPlaylistProvider>
        <TitleBar onMinimize={handleMinimize} onMaximize={handleMaximize} onClose={handleClose} />
        <AppContent />
      </AddToPlaylistProvider>
    </BrowserRouter>
  );
}

export default App;