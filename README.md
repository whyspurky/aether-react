# Aether

Десктопный музыкальный плеер для SoundCloud. Монохромный минимализм, AMOLED-тема, бесконечная очередь рекомендаций.

![screenshot](screenshots/main.png)

## Стек

- **Frontend** — React 18 + TypeScript + Tailwind CSS + Zustand
- **Backend** — Tauri 2 (Rust) + rodio + symphonia + reqwest
- **Сборка** — Vite 5

## Возможности

- Стриминг треков SoundCloud (HLS)
- Моя волна — рекомендации на основе истории
- Очередь с автодогрузкой
- Плейлисты, избранное, история прослушиваний
- Горячие клавиши для медиа
- Восстановление позиции после перезапуска

## Запуск

Нужны [Node.js](https://nodejs.org/) 18+ и [Rust](https://rustup.rs/).

```bash
npm install
npm run tauri dev
