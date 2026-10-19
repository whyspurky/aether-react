# contributing

## что нужно

- node js 20 или новее
- rust stable
- windows 10 1809 или новее, webview2

## запуск

```bash
npm ci
npm run tauri:dev
```

первая сборка rust долгая, дальше из кеша

## проверки перед pr

```bash
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

`npm run build` это `tsc && vite build`, строгий typescript, unused переменные не проходят

## стиль

- код английский, комментарии и ui русские, строчными
- один коммит одно логическое изменение, формат `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- `title=` не используем, для доступности `aria-label`
- цвета только через css переменные, accent через `var(--accent-primary)`
- подробные конвенции в `docs/context/09_conventions.md`

## где обсуждать

- баги и предложения: github issues
- быстрые вопросы: telegram канал https://t.me/aether_player

## документация

- `README.md` входная точка
- `docs/public` для контрибьюторов
- `md/ROADMAP.md`, `md/BUGS.md`, `md/CHANGELOG.md`

## про тесты

автотестов пока нет, проверка ручная по сценариям из `docs/context/17_testing.md`
