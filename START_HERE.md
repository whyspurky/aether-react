# старт

этот файл прикладывается к задаче. он заменяет чтение проекта
прочитай его, определи тип задачи и открой только те файлы, которые нужны
не читай репозиторий целиком

## область

- работаем только в этом каталоге. aether-mobile - отдельный репозиторий и отдельный чат, сюда его не приносим
- чужой `AGENTS.md` из другого проекта не применять

## алгоритм

1. прочитай задачу пользователя
2. найди её тип в таблице ниже по формулировке
3. прочитай перечисленные файлы, окнами по 30-80 строк
4. если по ходу понадобился ещё файл, бери один и точечно
5. если нужных файлов больше 5, делегируй субагенту или workflow
6. если тип не нашёлся, прочитай `AGENTS.md` и `docs/context/18_file_map.md` и задай один уточняющий вопрос

## таблица типов

| что просит пользователь | что читать | что не читать |
| :--- | :--- | :--- |
| кнопка, отступ, hover, цвет, шрифт, вид, анимация | нужный компонент в `src/components`, `src/index.css`, `src/theme/themes.ts` | стор, rust, другие страницы |
| страница, лейаут, скролл, player bar | `src/pages/*.tsx`, его компоненты, `src/components/layout/Layout.tsx`, `src/index.css` | `src-tauri`, стор целиком |
| не играет, seek, очередь, пауза, громкость, prefetch, позиция | `docs/ai/skills/aether-audio/SKILL.md`, `src-tauri/src/audio/{engine,state,mod}.rs`, `src-tauri/src/track_cache/{state,commands}.rs`, `src/store/slices/player.ts`, `src/hooks/player/usePlayerProgress.ts`, `src/lib/api/player.ts` | ui, `src-tauri/src/api/soundcloud.rs` |
| пустой поиск, 401, 429, hls, формат, client_id, не качается звук | `docs/ai/skills/aether-soundcloud/SKILL.md`, `src-tauri/src/api/{mod,client}.rs`, `src-tauri/src/api/stream.rs`, `src-tauri/src/api/hls.rs` или `src-tauri/src/api/soundcloud.rs`, `src/lib/api/soundcloud.ts` | `src-tauri/src/audio`, компоненты |
| тема, blur, accent, пресеты, настройки внешнего вида | `src/theme/themes.ts`, `src/hooks/ui/useTheme.ts`, `src/components/settings/SettingsTabAppearance.tsx`, `src/index.css` | rust |
| persist, настройки не сохраняются, очередь после перезапуска | `src/store/store.ts`, `src/lib/store/tauriStorage.ts`, нужный slice, `src-tauri/src/lib.rs` | страницы |
| поиск: поведение, кэш, бесконечный скролл | `src/pages/SearchPage.tsx`, `src/hooks/search/useSearchPage.ts`, `src/components/search/*`, `src/store/slices/cache.ts` | audio, rust |
| прокси, zapret, обход блокировок | `src-tauri/src/zapret.rs`, `src/components/proxy/*`, `src/store/slices/proxy.ts`, `src/hooks/app/useProxySync.ts` | плеер |
| бинды, горячие клавиши | `src-tauri/src/global_binds.rs`, `src/store/slices/globalBinds.ts`, `src/hooks/app/useGlobalBinds.ts`, `src/components/settings/SettingsTabBinds.tsx` | остальное |
| медленно, лагает, память, фризы | `src/hooks/player/usePlayerProgress.ts`, `src/store/store.ts`, `src/components/layout/Layout.tsx`, `src/pages/SearchPage.tsx`, `src/components/track/TrackList.tsx`, `src-tauri/src/audio/state.rs` | всё несвязанное |
| перепиши везде, во всех файлах, массово | сначала grep-манифест, потом 2 образца, потом workflow | содержимое всех файлов |
| найди проблемы, аудит, почему так | сначала grep, потом 3 самых подозрительных места | код целиком |
| новая фича на фронт и бек | сначала контракт: `src/store/types.ts`, `src/lib/api/index.ts`, `src-tauri/src/lib.rs` | реализация до согласования контракта |
| билд, версия, релиз, ci | `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `.github/workflows/ci.yml`, `docs/public/build.md`, `md/CHANGELOG.md` | `src` |
| объясни, как устроено | `AGENTS.md`, `docs/context/18_file_map.md`, `docs/public/architecture.md` | код, пока не спросят детали |

## что не читать никогда

всё из `.aiignore`: `node_modules`, `src-tauri/target`, `dist`, `src-tauri/gen`, lock-файлы, иконки, скриншоты, `docs/context/00-22` кроме 16, 23, 24

если файла нет в списке, но он больше 300 строк, читай окном, а не целиком

## инварианты, которые нельзя ломать

- порядок локов: сначала playback, потом player
- `position-tick` каждые 100 мс с `{ position, track_id }`
- после seek `seek_skip_tick = 3` и 400 мс блокировки на фронте
- аудио играет из файла: `track_ensure_cached` кладет в temp или offline, `play_cached` открывает путь
- длительность приходит через `set_track_duration` после старта
- persist только через `save_store` / `load_store` / `clear_store`
- accent через css переменные, `title=` не используем
- `main` в Layout это `flex flex-col`, страницы скроллят сами через `flex-1 min-h-0`

## где что лежит

полный индекс всех инструкций, skills и доков: `docs/ai/INDEX.md`
там таблица файл - что внутри - когда читать, с ссылками

файлы не проси прикладывать, находи и читай сам
skills по подсистемам: `docs/ai/skills/README.md`
сценарии по типам задач: `docs/ai/SCENARIOS.md`

## формат ответа

- по коду: `file:line` и одна две строки сути
- полный файл только если правок больше половины
- после правок `git diff --stat`, файлы не перечитывать
- без пересказа кода, без похвалы, без воды
- рассуждай и веди черновики на английском, отвечай на русском

## проверки

- `npm run check` после правок фронта
- `cargo check --manifest-path src-tauri/Cargo.toml` после правок rust
- `npm run build` и `cargo check` падают внутри песочницы на `spawn EPERM` и создании временных файлов, это не ошибка кода, так и сообщать

## заметки по инструментам

- версии пакетов, изменения внешних api, апгрейд зависимостей: сначала `web_search`, в исходники не лезть
- новые знания писать в `docs/context/24_snapshot.md`, не в чат
- после закрытой пачки правок предложить синхронизировать снапшот и `md/CHANGELOG.md`

## если задача непонятна

задай один короткий вопрос и не читай код до ответа
