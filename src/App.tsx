import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AddToPlaylistProvider } from './components/playlist/AddToPlaylistProvider';
import { TitleBar } from './components/layout/TitleBar';
import { Layout } from './components/layout/Layout';
import { useTheme } from './hooks/ui/useTheme';
import { useKeyboard } from './hooks/ui/useKeyboard';
import { useProxySync } from './hooks/app/useProxySync';
import { useAuthSync } from './hooks/app/useAuthSync';
import { useContextMenuPrevent } from './hooks/app/useContextMenuPrevent';
import { useWindowShow } from './hooks/app/useWindowShow';
import { useVolumeRestore } from './hooks/app/useVolumeRestore';
import { useColdStartPrefetch } from './hooks/app/useColdStartPrefetch';
import { useTrackCacheEvents } from './hooks/app/useTrackCacheEvents';
import { useAudioOutput } from './hooks/app/useAudioOutput';
import { useAudioSettings } from './hooks/app/useAudioSettings';
import { useAudioTransition } from './hooks/app/useAudioTransition';
import { ContextMenuProvider } from './components/ui/ContextMenuProvider';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import LibraryPage from './pages/LibraryPage';
import PlayerPage from './pages/PlayerPage';
import SettingsPage from './pages/SettingsPage';
import ArtistPage from './pages/ArtistPage';
import PlaylistPage from './pages/PlaylistPage';
import { useGlobalBinds } from './hooks/app/useGlobalBinds';
import { usePerfFlags } from './hooks/app/usePerfFlags';


function AppContent() {
  useTheme();
  usePerfFlags();
  useKeyboard();
  useWindowShow();
  useContextMenuPrevent();
  useVolumeRestore();
  useAudioOutput();
  useAudioSettings();
  useAudioTransition();
  useColdStartPrefetch();
  useTrackCacheEvents();
  useProxySync();
  useAuthSync();
  useGlobalBinds();

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
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ContextMenuProvider>
        <AddToPlaylistProvider>
          <TitleBar />
          <AppContent />
        </AddToPlaylistProvider>
      </ContextMenuProvider>
    </BrowserRouter>
  );
}
export default App;