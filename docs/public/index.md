# aether

десктопный музыкальный плеер для прослушивания треков из soundcloud. написан на tauri 2 (rust) + react 18 + typescript. монохромный минималистичный интерфейс.

## что умеет

- стриминг треков из soundcloud
- моя волна — рекомендации на основе истории прослушивания
- бесконечная очередь с автодогрузкой
- плейлисты, избранное, история
- поиск по трекам и артистам
- сохранение позиции трека между запусками
- горячие клавиши (медиа-клавиши, стрелки, пробел)
- мини и полноэкранный плеер

## стек

**фронт** — react 18, typescript, tailwind css, zustand, react-router, vite.

**бэк** — tauri 2, rust, rodio (аудио), symphonia (декодирование), reqwest (http).

**сборка** — vite для фронта, cargo для бэка, tauri для бандла.

## как запустить

нужны:
- **node.js**
- **rust** (см. [rustup.rs](https://rustup.rs/))

в корне проекта:

```
dev.bat
```

открывается окно приложения в режиме разработки. изменения в tsx — **сразу** в приложении. изменения в rust — **перезапуск**.

## как собрать

```
build.bat
```

результат:
- `src-tauri/target/release/bundle/msi/aether_*.msi`
- `src-tauri/target/release/bundle/nsis/aether_*-setup.exe`

установить `.msi` или запустить `.exe`.

## где что искать

- **архитектура** — [architecture.md](./architecture.md)
- **backend (rust)** — [backend.md](./backend.md)
- **frontend (react)** — [frontend.md](./frontend.md)
- **сборка** — [build.md](./build.md)
- **о soundcloud** — [soundcloud.md](./soundcloud.md)

## лицензия

неофициальный клиент. не связан с soundcloud. использование — на свой риск.