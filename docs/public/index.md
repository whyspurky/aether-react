## документация

- [архитектура](./architecture.md) - общая схема
- [backend](./backend.md) - rust-сторона
- [frontend](./frontend.md) - react-сторона
- [soundcloud](./soundcloud.md) - как работает с soundcloud
- [build](./build.md) - как собрать

# aether

aether - десктопный музыкальный плеер для прослушивания треков из soundcloud
написан на tauri 2 (rust) + react 18 + typescript

## обход блокировок

встроенный zapret + поддержка юзерских прокси для работы в регионах с ограничениями

## стек

**фронт** - react 18, typescript, tailwind css, zustand, react-router, vite

**бэк** - tauri 2, rust, rodio, reqwest


## лицензия

неофициальный клиент
не связан с soundcloud
использование - на свой риск