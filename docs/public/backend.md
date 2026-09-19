# backend

rust-сторона приложения: http-запросы, воспроизведение звука, управление zapret.

## структура

```
src-tauri/src/
- main.rs        # точка входа
- lib.rs         # регистрация команд и плагинов
- api.rs         # soundcloud api + hls
- zapret.rs      # управление zapret
- shortcuts.rs   # медиа-клавиши
- audio/
    - mod.rs     # tauri-команды для плеера
    - engine.rs  # воспроизведение
    - state.rs   # состояние плеера
```

## main.rs

стандартный tauri-бойлерплейт. вызывает `run()` из `lib.rs`.

## lib.rs

регистрирует **плагины**, **состояние** и **команды**. логики **не содержит**.

**плагины:**
- `global-shortcut` - медиа-клавиши
- `window-state` - сохранение позиции окна
- `dialog` - нативный диалог выбора папки (для zapret)

**что делает при старте:**
- создаёт `AppState` (аудио-состояние)
- настраивает медиа-клавиши
- регистрирует **все команды** которые фронт может звать

## api.rs

**всё что связано с soundcloud**: поиск, популярное, моя волна, плейлисты, hls.

### http-клиент

**один** клиент на всё приложение через `RwLock<reqwest::Client>` (не `OnceLock`, потому что нужно менять прокси на лету). браузерный **user-agent** - чтобы soundcloud не резал запросы.

таймауты:
- `connect_timeout(5s)` - если TCP не установился за 5 сек, ошибка
- `timeout(10s)` - весь запрос, включая чтение body

### поиск и метаданные

**команды:**
- `search_tracks` - поиск треков
- `search_playlists` - поиск плейлистов
- `get_user_tracks` - треки артиста
- `get_playlist_tracks` - треки плейлиста (собирает все страницы через `next_href`)
- `get_popular` - популярное
- `get_my_wave` - рекомендации
- `fetch_url` - произвольный GET
- `get_stream_url` - метаданные трека + финальный url стрима

### get_popular - как работает

**не** настоящий «топ soundcloud» (такого api нет). список **захардкоженных артистов**, `round-robin` по ним. для каждого - `search/tracks?q=artist`, берётся **первый подходящий**.

**фильтры:**
- длительность от **30 сек** до **10 мин**
- **не дубликаты** (по id)

**не идеально**, но даёт приемлемую подборку.

### get_my_wave - как работает

1. для каждого артиста из **истории** (до 10) - `search/tracks?q=artist&limit=10`
2. все треки раскладывает **по корзинам** (одна корзина на артиста)
3. **чередует** - по одному треку из каждой корзины, пропуская дубликаты
4. цель - **50 треков**
5. если пусто - фолбэк на `search/tracks?q=new`

получается **микс** - по треку от каждого артиста которого ты слушал.

### hls-стриминг

**главное:**

soundcloud отдаёт треки **двумя** способами:
- **progressive** - прямой mp3/aac файл
- **hls** - m3u8-плейлист из **фрагментов**

**порядок выбора:**
1. пробует **progressive**
2. если нет - **hls**

**для hls:**
1. **master-плейлист** содержит ссылки на **медиа-плейлисты** с **разным bitrate**
2. выбирается **лучший** bitrate
3. **медиа-плейлист** содержит ссылки на **сегменты** (обычно `.ts` или `.aac`)
4. все сегменты **скачиваются параллельно** (6 в полёте)
5. **склеиваются** в один буфер
6. **лимит 200 мб** на трек - если больше, ошибка

**что дальше:** буфер отдаётся в `rodio::Decoder`, который декодирует **из памяти**. поэтому `rodio` думает что это **обычный локальный файл** - и играет нормально.

### proxy_test_api / proxy_test_cdn

**разделены** на две команды - можно проверять параллельно.

- `proxy_test_api` - `GET https://api-v2.soundcloud.com`, timeout 5 сек
- `proxy_test_cdn` - `HEAD https://cf-media.sndcdn.com`, timeout 5 сек, `403` = ok (соединение есть, просто нет токена)

**логика ok:**
- api - `true` если запрос прошёл (любой статус, даже 404 - сервер ответил)
- cdn - `true` если `403`, `404` или `200` - соединение установлено

**`X` только если** - `timeout` или `connect error`.

### прокси

- `proxy_set_custom(kind, host, port, username, password)` - применяет прокси (`socks5h://`, `http://`, `https://`)
- `proxy_clear()` - сбрасывает на прямое соединение
- `proxy_get_status()` - возвращает текущий прокси

`reqwest::Client` пересоздаётся при смене прокси. старые запросы завершатся на старом клиенте (у каждого свой Arc).

## zapret.rs

**обход блокировок через утилиту zapret.**

### команды

- `zapret_status` - проверяет есть ли служба zapret или процесс `winws.exe`
- `zapret_start` - `net start` для службы (требует UAC)
- `zapret_stop` - `net stop` или `taskkill /IM winws.exe`
- `zapret_run_bat` - запуск выбранной стратегии (`general*.bat`) через `Start-Process -Verb RunAs`
- `zapret_process_running` - отдельная проверка процесса
- `zapret_open_folder` - открыть папку в проводнике
- `zapret_open_file` - открыть файл в блокноте
- `zapret_scan_strategies` - сканирует папку и возвращает список `general*.bat` (натуральная сортировка: `general.bat` первый, потом `alt2` < `alt10`)
- `zapret_check_lists` - проверяет `list-general-user.txt` на наличие доменов soundcloud
- `zapret_add_soundcloud_domains` - добавляет ~20 доменов soundcloud в `list-general-user.txt`
- `zapret_download` - скачивает последний релиз zapret с github, распаковывает в `%LOCALAPPDATA%\aether\zapret\`, находит вложенную папку с `general.bat`

### как работает запуск

1. проверка `zapret_run_bat` - если служба `zapret` уже запущена, пропускаем
2. если `winws.exe` уже работает - `taskkill` перед запуском
3. `Start-Process -Verb RunAs -FilePath 'cmd.exe' -ArgumentList '/c', 'путь\general.bat'`

### что НЕ трогаем

`WinDivert` - это драйвер перехвата пакетов, **не** служба zapret. `WinDivert` сам выгружается когда `winws.exe` умирает. в `SERVICE_NAMES` только `zapret`, `zapret_service`, `winws`, `winws1`, `winws2`.

### скачивание zapret

`zapret_download`:
1. `GET github.com/repos/Flowseal/zapret-discord-youtube/releases/latest`
2. ищет `.zip` в `assets`
3. скачивает стримом с эмитом события `zapret:download-progress` (`{ downloaded, total }`)
4. распаковывает через `zip` crate
5. находит вложенную папку с `general.bat` (обычно `zapret-discord-youtube-X.X.X`)
6. возвращает путь до неё

## audio/

**всё воспроизведение.** разделено на три файла: `state` (данные), `engine` (логика), `mod` (tauri-команды).

### state.rs

**`Playback`** - структура с **всем** состоянием плеера:
- играет ли сейчас (`is_playing`)
- замучен ли (`is_muted`)
- громкость (`volume`)
- позиция (`base_offset` + `play_start`)
- длительность трека (`duration_ms`)
- байты текущего трека (`bytes` - для seek)

**модель позиции:** `base_offset + elapsed` от `play_start`. если на паузе - `play_start = None`, позиция = `base_offset`.

**`AppState`** - контейнер с **лок-обёртками**: `player` (rodio) + `playback`. создаётся **один раз** при старте приложения.

**правило локов:** всегда **`playback` - `player`**, не наоборот. нарушение - **дедлок**.

### engine.rs

**`play_async`** - загрузка + старт:
- если url hls - качает **целиком** через `download_hls_track`
- если progressive - **прямой GET**
- `rodio::Decoder` - `player.append` - `player.play`
- обновляет `Playback` (`start`)

**`pause` / `resume` / `stop`** - прокси к `player` + `playback`.

**`set_volume` / `mute` / `unmute`** - два лока: сначала `playback`, потом `player`.

**`seek`** - самое сложное:
1. берёт `bytes` и `duration_ms` из `playback`
2. **клампит** позицию в `[0, duration]`
3. создаёт **новый декодер** из тех же bytes
4. **`try_seek`** - если сработал, играем с позиции
5. **если не сработал** - играем **с начала** (некоторые mp3 не поддерживают seek)
6. пересоздаёт player, `append`, `play` (если играл до сика)
7. **записывает реально применённую позицию** в `playback`

### mod.rs

**просто tauri-команды** - прокси к `engine`. никакой логики.

```
play_audio, pause_audio, resume_audio, stop_audio,
mute_audio, unmute_audio, set_volume,
get_position, seek_audio, set_track_duration
```

## Cargo.toml - зависимости

**основные:**
- `tauri` - runtime
- `reqwest` - http (`rustls-tls`, `json`, `gzip`, `http2`, `socks`, `stream`)
- `rodio` - воспроизведение (`symphonia-all` - все кодеки)
- `tokio` - async-runtime
- `futures` - стримы для параллельной загрузки + `bytes_stream()`
- `bytes` - байтовые буферы
- `serde` / `serde_json` - json
- `url` / `urlencoding` - работа с url
- `regex` - регулярки
- `tauri-plugin-global-shortcut` - медиа-клавиши
- `tauri-plugin-window-state` - сохранение окна
- `tauri-plugin-dialog` - нативный диалог выбора папки
- `zip` - распаковка архива zapret
- `dirs` - путь `%LOCALAPPDATA%`

**профили сборки:**
- `release` - финальный, `lto = true`
- `release-fast` - для тестов, `lto = "thin"`

## tauri.conf.json

- `identifier` - `com.aether.desktop`
- `productName` - `aether`
- окно 1200*800, `decorations: false` (свой titlebar), `dragDropEnabled: false`
- CSP разрешает `tauri:`, `asset:`, `https:`, `unsafe-inline`, `unsafe-eval`
- `bundle.icon` - `32x32.png`, `128x128.png`, `icon.ico`