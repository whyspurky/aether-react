# баги

| # | severity | симптом | где | статус |
| :--- | :--- | :--- | :--- | :--- |
| 1 | p1 | протух client_id: поиск отдаёт пустой список без причины | `src-tauri/src/api/client.rs`, `soundcloud.rs` | открыт |
| 2 | p1 | общий timeout 10 с рубит progressive, hls и zip zapret | `src-tauri/src/api/client.rs` | открыт |
| 4 | p1 | паника при старте без аудиоустройства | `src-tauri/src/audio/state.rs` | открыт |
| 5 | p2 | seek всегда с hint aac, progressive mp3 начинает с нуля | `src-tauri/src/audio/engine.rs` | открыт |
| 6 | p2 | два окна пишут один store и играют одновременно | нет single-instance | открыт |
| 7 | p2 | persist сериализует весь стор раз в секунду из-за position | `src/store/store.ts` | открыт |
| 8 | p2 | двойной invoke set_volume на каждый тик драга | `src/components/player/VolumeControl.tsx` | открыт |
| 9 | p2 | скролл страниц после переделки лейаута | `src/components/layout/Layout.tsx` | в работе |
| 10 | p3 | console.log в проде | `src/pages/PlaylistPage.tsx`, `src/hooks/ui/useKeyboard.ts` | открыт |
| 11 | p3 | шрифт грузится с google fonts, в рф может не открыться | `index.html` | открыт |
| 12 | p3 | нет ErrorBoundary, ошибка рендера даёт белый экран | `src/App.tsx` | открыт |

## как добавить

дописать строку в таблицу: номер, severity, symptom, где, статус
подробности и шаги воспроизведения держать в issue на github
