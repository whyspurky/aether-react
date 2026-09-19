# архитектура

как устроен проект в общих деталях без подробностей

## что такое tauri

tauri - фреймворк для десктопных приложений. в отличие от electron, **системный webview**

**структура tauri-приложения:**

```
┌─────────────────────────────────────────┐
│             aether.exe                  │
│                                         │
│  ┌──────────────┐    ┌───────────────┐  │
│  │   webview    │◄──►│    rust       │  │
│  │  (react/ui)  │    │  (backend)    │  │
│  └──────────────┘    └───────────────┘  │
│         ▲                    ▲          │
│         │                    │          │
│         │  invoke()          │ http()   │
│         │                    │          │
└─────────┼────────────────────┼──────────┘
          │                    │
          │                    ▼
       юзер              soundcloud api
```

**что это значит:**
- **ui** - рендерится в webview
- **бэкенд** - rust общается с ui через **ipc**
- **фронт зовёт rust** через `invoke`
- **rust зовёт soundcloud** через `reqwest`
- **audio-декодирование** - целиком в rust (`rodio`)

**почему аудио в rust:**
- web audio api **не умеет hls** из коробки
- soundcloud отдаёт треки **фрагментами** (hls-плейлисты)
- rust **скачивает все сегменты**, склеивает, декодирует через `rodio`

## поток данных - клик по треку

самый частый сценарий - юзер кликает по треку в поиске:

```
1. юзер кликает трек в SearchPage
       │
       ▼
2. SearchPage → playTrack(track, tracks, index)
       │
       ▼
3. store.ts → playTrack
       │
       ├──► api.getStreamUrl(track.id)
       │         │
       │         ▼
       │    rust → soundcloud
       │    получает metadata + media.transcodings
       │    выбирает формат (progressive или hls)
       │    возвращает финальный url
       │         │
       │         ▼
       │    url приходит в store
       │
       ├──► api.playAudio(url)
       │         │
       │         ▼
       │    rust → download (mp3 напрямую или hls целиком)
       │    rodio::Decoder::new(bytes)
       │    player.play()
       │         │
       │         ▼
       │    звук идёт
       │
       ├──► api.setTrackDuration(track.duration)
       │    rust знает длительность для позиции и seek
       │
       └──► startPositionLoop()
            каждые 250ms - getPosition() из rust
            обновление position в сторе
```

## старт приложения

что происходит при запуске:

```
1. persist восстанавливает состояние из localStorage
       │
       ▼
2. App.tsx → AppContent
       │
       ├──► useTheme() - применяет цвета в CSS-переменные
       │
       ├──► applyProxy() - если выбран прокси, применяет через rust
       │
       ├──► preloadHomePageData() - прогревает популярное и мою волну
       │
       └──► api.setVolume(volume) - синхронизирует громкость с rust
```

## обход блокировок

aether работает в регионах где soundcloud заблокирован. **два механизма:**

**1. личный прокси**

rust-команда `proxy_set_custom` создаёт `reqwest::Client` с `socks5h://` или `http://`, весь http-трафик идёт через прокси
юзер **сам** поднимает xray/sing-box, аэтер просто направляет трафик

**2. zapret**

внешняя утилита, перехватывает пакеты через `WinDivert` и модифицирует их так что DPI пропускает
aether **управляет** ею:

- скачивает последний релиз с github
- распаковывает в `%LOCALAPPDATA%\aether\zapret\`
- находит вложенную папку с `general.bat`
- запускает выбранную стратегию через `Start-Process -Verb RunAs`
- следит за статусом через `tasklist` / `sc query`
- добавляет домены soundcloud в `list-general-user.txt`

## слои

**фронт:**

```
pages/          - роутер, страницы
  └── HomePage, SearchPage, PlayerPage, ...

components/     - ui-блоки
  └── PlayerBar, TrackList, Icon, ProxySettings, ...

store/          - zustand, состояние + логика
  └── store.ts

lib/            - утилиты
  └── api.ts (мост к rust), format.ts

hooks/          - кастомные хуки
  └── useTheme.ts, useSmoothScroll.ts, useDragScroll.ts
```

**бэк:**

```
api.rs          - http к soundcloud
audio/          - rodio: play/pause/seek
zapret.rs       - управление zapret
shortcuts.rs    - медиа-клавиши
lib.rs          - регистрация команд и плагинов
```

## ключевые концепции

**1. tauri-команды**

фронт не может **напрямую** звать rust
только через **команды**:

```ts
await invoke('get_popular', { limit: 20, offset: 0 });
```

```rust
#[tauri::command]
pub async fn get_popular(limit: u32, offset: u32) -> Result<Value, String> { ... }
```

**2. hls-стриминг**

soundcloud отдаёт некоторые треки **не одним файлом**, а **плейлистом фрагментов** (hls/m3u8)
rust **скачивает все сегменты параллельно**, **склеивает в память**, потом **декодирует** через `rodio`.

**почему так:** soundcloud **не даёт** прямой mp3 для всех треков
где даёт - играем mp3 напрямую
где **только hls** - качаем целиком

**3. zustand persist**

состояние **сохраняется** в `localStorage` под ключом `aether-storage`. при **старте** восстанавливается:
- громкость, shuffle, repeat
- избранное, история, плейлисты
- текущий трек + позиция
- очередь
- настройки прокси

**4. pendingSeek**

механизм **сика до старта**
если юзер двигает ползунок до того как трек заиграл - позиция сохраняется в `pendingSeek`, применяется после старта

**5. async в rust**

все http-операции - **async** через `tokio`
параллельная загрузка hls - через `futures::stream::buffered(6)`

## где что искать

- **общая схема** - этот файл
- **rust детали** - [backend.md](./backend.md)
- **react детали** - [frontend.md](./frontend.md)
- **soundcloud** - [soundcloud.md](./soundcloud.md)
- **сборка** - [build.md](./build.md)