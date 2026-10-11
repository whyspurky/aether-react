import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AddToPlaylistProvider } from './components/playlist/AddToPlaylistProvider';
import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { TitleBar } from './components/layout/TitleBar';
import { Layout } from './components/layout/Layout';
import { useTheme } from './hooks/ui/useTheme';
import { useKeyboard } from './hooks/ui/useKeyboard';
import { useProxySync } from './hooks/app/useProxySync';
import { useContextMenuPrevent } from './hooks/app/useContextMenuPrevent';
import { useWindowShow } from './hooks/app/useWindowShow';
import { useVolumeRestore } from './hooks/app/useVolumeRestore';
import { useColdStartPrefetch } from './hooks/app/useColdStartPrefetch';
import { ContextMenuProvider } from './components/ui/ContextMenuProvider';
import { saveNow } from './lib/store/tauriStorage';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import LibraryPage from './pages/LibraryPage';
import PlayerPage from './pages/PlayerPage';
import SettingsPage from './pages/SettingsPage';
import ArtistPage from './pages/ArtistPage';
import PlaylistPage from './pages/PlaylistPage';

const appWindow = getCurrentWindow();

function AppContent() {
  useTheme();
  useKeyboard();
  useWindowShow();
  useContextMenuPrevent();
  useVolumeRestore();
  useColdStartPrefetch();
  useProxySync();

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
    try { await saveNow(); } catch {}
    try { await appWindow.close(); } catch {}
  };

  return (
    <BrowserRouter>
      <ContextMenuProvider>
        <AddToPlaylistProvider>
          <TitleBar onMinimize={handleMinimize} onMaximize={handleMaximize} onClose={handleClose} />
          <AppContent />
        </AddToPlaylistProvider>
      </ContextMenuProvider>
    </BrowserRouter>
  );
}

export default App;