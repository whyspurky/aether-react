# архитектура

как устроен проект в общих деталях без подробностей

## что такое tauri

tauri — фреймворк для десктопных приложений. в отличие от electron, **системный webview**

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
- **ui** — рендерится в webview
- **бэкенд** — rust общается с ui через **ipc**
- **фронт зовёт rust** через `invoke`
- **rust зовёт soundcloud** через `reqwest`
- **audio-декодирование** — целиком в rust (`rodio`)

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

## ключевые концепции

**1. tauri-команды**

фронт не может **напрямую** звать rust. только через **команды**:

```ts
await invoke('get_popular', { limit: 20, offset: 0 });
```

```rust
#[tauri::command]
pub async fn get_popular(limit: u32, offset: u32) -> Result<Value, String> { ... }
```

**2. hls-стриминг**

soundcloud отдаёт некоторые треки **не одним файлом**, а **плейлистом фрагментов** (hls/m3u8). rust **скачивает все сегменты параллельно**, **склеивает в память**, потом **декодирует** через `rodio`.

**почему так:** soundcloud **не даёт** прямой mp3 для всех треков. где даёт — играем mp3 напрямую. где **только hls** — качаем целиком.

**3. zustand persist**

состояние **сохраняется** в `localStorage` под ключом `aether-storage`. при **старте** — восстанавливается. сохраняется:
- громкость, shuffle, repeat
- избранное, история, плейлисты
- текущий трек + позиция
- очередь
- и тд

**5. async в rust**

все http-операции — **async** через `tokio`

## где что искать

- **общая схема** — этот файл
- **rust детали** — [backend.md](./backend.md)
- **react детали** — [frontend.md](./frontend.md)
- **soundcloud** — [soundcloud.md](./soundcloud.md)