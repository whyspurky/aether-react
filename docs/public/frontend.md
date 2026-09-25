# frontend

реакт сторона приложения

## структура

*App.tsx* корневой компонент, роутинг, titlebar, инициализация

*main.tsx* точка входа

*assets/icons/lucide* svg иконки

*components* ui блоки, разбиты по фичам
layout, ui, track, playlist, player, artist, home, library, search, settings, proxy

*hooks* кастомные хуки, разбиты на ui и player

*lib* утилиты и api

*pages* страницы роутера

*store* zustand, разбит на slices

*theme* палитра amoled

## инициализация

App tsx при старте применяет тему, прокси, громкость
и прогревает популярное и мою волну

роуты: слэш, search, library, player, artist, playlist, settings

contextmenu отключён везде

Layout обёртка ui для всех страниц

## страницы

*HomePage* зовёт api за популярным и моей волной
рендерит MyWaveSection и PopularSection

*SearchPage* зовёт api поиска с задержкой
три фильтра: треки, артисты, плейлисты
бесконечный скролл
клик по треку зовёт playTrack
клик по артисту или плейлисту переходит на страницу

*PlayerPage* зовёт store для play, pause, next, prev, shuffle, repeat
рендерит обложку, трек, прогресс, громкость, очередь
использует usePositionTick, useProgressDrag, useTrackAnimation

*LibraryPage* зовёт store для избранного, истории, плейлистов
рендерит LibrarySidebar и LibraryHeader
создание плейлиста через CreatePlaylistModal

*SettingsPage* рендерит четыре вкладки
данные, внешний вид, прокси, о приложении
прокси вкладка это ProxySettings

*ArtistPage* зовёт api за профилем, треками, плейлистами, репостами
кэширует в сторе вкладку и скролл
рендерит ArtistHeader, ArtistTabs и нужный таб

*PlaylistPage* зовёт api за метаданными и треками
кэширует в сторе
рендерит PlaylistHeader и TrackList

## компоненты

*Layout* оборачивает страницы и рендерит Sidebar и PlayerBar

*TitleBar* управляет окном: свернуть, развернуть, закрыть

*Sidebar* навигация по роутам через navigate

*PlayerBar* читает из стора, играет, пауза, next, prev, громкость
используется в Layout

*VolumeSlider* меняет громкость через стор

*AnimatedTrackInfo* показывает текущий трек из стора

*TrackCard* клик зовёт playTrack
кнопка плюс открывает AddToPlaylistMenu

*TrackList* клик зовёт playTrack со списком
кнопка плюс открывает AddToPlaylistMenu
кнопка минус зовёт onRemove

*Icon* рендерит svg по имени из ассетов

*HorizontalScroll* горизонтальный скролл драгом

*ProxySettings* собирает ProxyModeSelector, ProxyConnectionTest, CustomProxyForm, ZapretForm
все читают и пишут в стор через proxy slice

*Toast* читает toast из ui slice

*ConfirmModal* универсальное подтверждение

## store

разбит на slices

1. *cache* search, searchPage, artistPage, playlistPage, homePage

2. *library* избранное, история, плейлисты

3. *player* очередь, плеер, экшены

4. *proxy* режим, custom, zapret

5. *ui* toast, preload

главный store собирает slices и настраивает persist в localStorage

при старте восстанавливается: громкость, очередь, история, плейлисты, трек и позиция, прокси

## hooks

*useTheme* применяет палитру в css переменные

*useSmoothScroll* плавный скролл через drag

*usePositionTick* опрашивает позицию из rust и обновляет стор

*useProgressDrag* drag прогресс бара, пишет напрямую в DOM и потом в стор

*useTrackAnimation* анимация смены трека

## lib

*format* formatMs и formatSec

*api* мост к rust

## стили

все цвета через css переменные из theme ts
tailwind мапит их на классы