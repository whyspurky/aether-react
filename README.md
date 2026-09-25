<div align="center">

# aether

десктопный музыкальный плеер для soundcloud

tauri 2 · react 18 · rust

[![telegram](https://img.shields.io/badge/telegram-aether-white?style=flat-square&logo=telegram&logoColor=white&labelColor=0F0F0F)](https://t.me/aether_player)

</div>

---

<div align="center">

### главная страница

<img src="./docs/screenshots/home.png" width="900" alt="главная" />

</div>

главная объединяет *мою волну* и *популярное* на одном экране

моя волна строится из артистов которых ты уже слушал

популярное подгружается с soundcloud и обновляется по мере скролла

---

## возможности

### музыка

- поиск треков, артистов, плейлистов
- популярное и моя волна
- страницы артистов с табами
- страницы плейлистов и альбомов
- библиотека: избранное, история, свои плейлисты
- импорт плейлистов из soundcloud

<div align="center">

<img src="./docs/screenshots/search.png" width="720" alt="поиск" />

</div>

### плеер

- очередь с автодогрузкой
- shuffle и repeat
- сохранение позиции и очереди между запусками
- медиа клавиши
- предзагрузка следующего трека
- стриминг в aac 160 hls

<div align="center">

<img src="./docs/screenshots/player.png" width="640" alt="плеер" />

</div>

### обход блокировок

- встроенный zapret с автоскачиванием
- личный прокси socks5, http, https

---

<div align="center">

### страница артиста

<img src="./docs/screenshots/artist.png" width="820" alt="артист" />

</div>

у каждого артиста профиль с подписчиками, треками, плейлистами и репостами

популярные треки подгружаются горизонтальной лентой

вкладки переключаются без перезагрузки

---

## стек

*фронт* react 18, typescript, tailwind, zustand, vite

*бэк* tauri 2, rust, rodio, reqwest

---

<div align="center">

### библиотека

<img src="./docs/screenshots/library.png" width="580" alt="библиотека" />

</div>

избранное, история и свои плейлисты в одном месте

плейлисты можно создавать, переименовывать и удалять
