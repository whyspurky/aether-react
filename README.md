# Aether

Десктопный музыкальный плеер для SoundCloud. Монохромный минимализм, AMOLED-тема, бесконечная очередь рекомендаций.

![screenshot](screenshots/main.png)

## Стек

- **Frontend** — React 18 + TypeScript + Tailwind CSS + Zustand
- **Backend** — Tauri 2 (Rust) + rodio + symphonia + reqwest
- **Сборка** — Vite 5

## Запуск

Нужны [Node.js](https://nodejs.org/) и [Rust](https://rustup.rs/).

```bash
npm install
npm run tauri dev
