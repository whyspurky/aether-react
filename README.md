<div align="center">

# aether

десктопный музыкальный плеер для soundcloud

tauri 2 · react 18 · rust

[![telegram](https://img.shields.io/badge/telegram-aether-white?style=flat-square&logo=telegram&logoColor=white&labelColor=0F0F0F)](https://t.me/aether_player)

</div>

## возможности

- стриминг треков (hls + progressive)
- популярное, моя волна, поиск треков / артистов / плейлистов
- страницы артиста и плейлиста
- библиотека: избранное, история, свои плейлисты
- очередь с автодогрузкой, shuffle, repeat (none / all / one)
- сохранение позиции, трека и очереди между запусками
- медиа-клавиши
- прокси: свой (socks5 / http) и обход через zapret

## стек

**frontend** - react 18, typescript, tailwind, zustand, vite
**backend** - tauri 2, rust, rodio, reqwest

## сборка

```bash
npm install
npm run tauri dev      # разработка
npm run tauri build    # релиз
```

## сообщество

телеграм-канал с обновлениями - [**t.me/aether_player**](https://t.me/aether_player)

## документация

подробнее - в [docs/public/](./docs/public/)

<div align="center">

### дисклеймер

неофициальный клиент
не связан с soundcloud
все права на музыку принадлежат исполнителям и правообладателям

</div>
