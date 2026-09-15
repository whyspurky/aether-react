# архитектура

как устроен проект в целом.

## что такое tauri

tauri — фреймворк для десктопных приложений. в отличие от electron, **не пакует** chromium в бандл — использует **системный webview** (webview2 на windows).

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
- **ui** — обычный html/css/js, рендерится в webview
- **бэкенд** — rust, отдельный процесс, общается с ui через **ipc**
- **фронт зовёт rust** через `invoke('command_name', { args })`
- **rust зовёт soundcloud** через `reqwest` (http)
- **audio-декодирование** — целиком в rust (`rodio` + `symphonia`), не в web audio

## почему так

**почему не electron:**
- electron тащит **chromium** — **~120 мб** на бинарник
- tauri использует **системный webview** — **~5-15 мб**
- на windows 10+ webview2 **уже установлен**

**почему аудио в rust:**
- web audio api **не умеет hls** из коробки
- soundcloud отдаёт треки **фрагментами** (hls-плейлисты)
- rust **скачивает все сегменты**, склеивает, декодирует через `rodio`

## поток данных — клик по треку

самый частый сценарий. юзер кликает по треку в поиске:

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
            каждые 250ms — getPosition() из rust
            обновление position в сторе
```

**что видит юзер:**
- сразу — обложка + название (из локального стора)
- через ~500ms-2s — звук
- каждые 250ms — обновление позиции в прогрессбаре

## слои

**фронт:**

```
pages/          — роутер, страницы
  └── HomePage, SearchPage, PlayerPage, ...

components/     — ui-блоки
  └── PlayerBar, TrackList, Icon, ...

store/          — zustand, состояние + логика
  └── store.ts

lib/            — утилиты
  └── api.ts (мост к rust), format.ts
```

**бэк:**

```
api.rs          — http к soundcloud
audio/          — rodio: play/pause/seek
shortcuts.rs    — медиа-клавиши
lib.rs          — регистрация команд
```

## ключевые концепции

**1. tauri-команды**

фронт не может **напрямую** звать rust. только через **команды**:

```ts
// фронт
await invoke('get_popular', { limit: 20, offset: 0 });
```

```rust
// бэк
#[tauri::command]
pub async fn get_popular(limit: u32, offset: u32) -> Result<Value, String> { ... }
```

tauri **сам** мапит `limit`/`offset` из js в rust (camelcase → snake_case).

**2. hls-стриминг**

soundcloud отдаёт треки **не одним файлом**, а **плейлистом фрагментов** (hls/m3u8). rust **скачивает все сегменты параллельно**, **склеивает в память**, потом **декодирует** через `rodio`. это **отличается** от обычных плееров, которые играют поток **постепенно**.

**почему так:** soundcloud **не даёт** прямой mp3 для всех треков. где даёт — играем mp3 напрямую. где **только hls** — качаем целиком.

**3. zustand persist**

состояние **сохраняется** в `localStorage` под ключом `aether-storage`. при **старте** — восстанавливается. сохраняется:
- громкость, shuffle, repeat
- избранное, история, плейлисты
- текущий трек + позиция
- очередь

**следствие:** после перезапуска **видишь** трек, **слышишь** его **с того же места** (при нажатии play).

**4. pendingSeek**

механизм **сика до старта**. если юзер двигает ползунок **до** того как трек **заиграл** — позиция сохраняется в `pendingSeek`, применяется **после** старта. иначе `rodio` **не может** сикнуть **незагруженный** трек.

**5. async в rust**

все http-операции — **async** через `tokio`. параллельная загрузка hls — через `futures::stream::buffered(6)`. 6 сегментов **в полёте** одновременно.

## где что искать

- **общая схема** — этот файл
- **rust детали** — [backend.md](./backend.md)
- **react детали** — [frontend.md](./frontend.md)
- **сборка** — [build.md](./build.md)
- **soundcloud** — [soundcloud.md](./soundcloud.md)