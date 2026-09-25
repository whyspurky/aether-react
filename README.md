<h1 align="center">aether</h1>

<p align="center">
<b>десктопный музыкальный плеер для SoundCloud</b><br>
без рекламы · без капчи · без цензуры · доступно в россии
</p>

<p align="center">
<a href="https://github.com/whyspurky/aether-react/releases/latest">
<img src="https://img.shields.io/github/v/release/whyspurky/aether-react?style=for-the-badge&logo=github&color=FFFFFF&labelColor=0F0F0F&label=VERSION" alt="version"/>
</a>
<a href="https://github.com/whyspurky/aether-react/releases">
<img src="https://img.shields.io/github/downloads/whyspurky/aether-react/total?style=for-the-badge&logo=download&color=FFFFFF&labelColor=0F0F0F&label=DOWNLOADS" alt="downloads"/>
</a>
<a href="https://github.com/whyspurky/aether-react/stargazers">
<img src="https://img.shields.io/github/stars/whyspurky/aether-react?style=for-the-badge&logo=github&color=FFFFFF&labelColor=0F0F0F&label=STARS" alt="stars"/>
</a>
<a href="https://github.com/whyspurky/aether-react/blob/main/LICENSE">
<img src="https://img.shields.io/badge/LICENSE-MIT-FFFFFF?style=for-the-badge&labelColor=0F0F0F" alt="license"/>
</a>
</p>

<p align="center">
<a href="https://t.me/aether_player">
<img src="https://img.shields.io/badge/TELEGRAM-AETHER-FFFFFF?style=for-the-badge&logo=telegram&logoColor=white&labelColor=0F0F0F" alt="telegram"/>
</a>
<a href="https://github.com/whyspurky/aether-react/releases/latest">
<img src="https://img.shields.io/badge/СКАЧАТЬ-ПОСЛЕДНЮЮ_ВЕРСИЮ-FFFFFF?style=for-the-badge&labelColor=0F0F0F" alt="download"/>
</a>
</p>

---

<div align="center">

<img src="./docs/screenshots/home.png" width="900" alt="главная" />

</div>

---

## что это

**aether** это полноценное десктопное приложение для прослушивания музыки на SoundCloud

написано на **Tauri 2** + **React 18** — работает нативно, потребляет минимум ресурсов и не тормозит

---

## почему aether

### доступно в россии

soundcloud заблокирован провайдерами — веб версия не открывается
aether работает напрямую благодаря встроенному **zapret** или **своему прокси**

### никакой рекламы

ноль рекламных баннеров, ноль промо вставок между треками, ноль всплывающих окон

чистый интерфейс, только музыка

### без капчи

никаких проверок я не робот
открыл — слушаешь

### нативное и лёгкое

построено на **tauri 2** на rust вместо electron

что это даёт

- размер установщика **4-6 мегабайт** а не 200+ как у electron приложений
- потребление памяти **200-300 мегабайт** при воспроизведении
- мгновенный запуск
- плавный интерфейс на 60 fps

### стриминг в лучшем качестве

aether выжимает максимум из публичного api soundcloud

1. **aac 160 килобит** когда доступно
2. **aac 96** если 160 нет
3. **mp3 hls**
4. **mp3 progressive** как fallback

это лучший доступный битрейт без подписки go plus

### системная интеграция

- **медиа клавиши** на клавиатуре работают

### полностью на русском

интерфейс переведён на русский язык

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
- предзагрузка следующего трека
- стриминг в aac 160 hls

<div align="center">

<img src="./docs/screenshots/player.png" width="640" alt="плеер" />

</div>

### обход блокировок

- встроенный **zapret** с автоскачиванием
- личный прокси socks5, http, https

<div align="center">

<img src="./docs/screenshots/settings.png" width="760" alt="настройки" />

</div>

---

<div align="center">

<img src="./docs/screenshots/artist.png" width="820" alt="артист" />

</div>

---

## скачать

### windows

перейди на [страницу релизов](https://github.com/whyspurky/aether-react/releases/latest) и скачай

- **exe** (nsis установщик) — рекомендуется
- **msi** — альтернативный установщик

требования: windows 10 версии 1809 или выше, windows 11

### linux и macos

пока не поддерживаются

в планах в будущем

---

<div align="center">

<img src="./docs/screenshots/library.png" width="580" alt="библиотека" />

</div>

---

## обход блокировок

работает в регионах где soundcloud заблокирован

встроенный **zapret** скачивается одной кнопкой в настройках

альтернатива свой **socks5** или **http** прокси

подробнее в [документации](./docs)

---

## обратная связь

| | |
|---|---|
| сообщество | [telegram канал](https://t.me/aether_player) |
| баги | [github issues](https://github.com/whyspurky/aether-react/issues) |
| звезда | [github stars](https://github.com/whyspurky/aether-react/stargazers) — помогает продвижению |

pull requests приветствуются

для крупных изменений сначала открой issue

---

## сборка из исходников

<details>
<summary><b>инструкция для разработчиков</b></summary>

### требования

- node js 18+
- rust 1.75+

### запуск

```bash
git clone https://github.com/whyspurky/aether-react.git
cd aether-react
npm install
npm run tauri dev
```

### production сборка

```bash
npm run tauri build
```

артефакты появятся в `src-tauri/target/release/bundle/`

### проверки

```bash
npx tsc --noEmit        # типы typescript
cargo check             # компиляция rust
```

</details>

---

## стек

| компонент | технология |
| :--- | :--- |
| оболочка | tauri 2 на rust |
| фронт | react 18, vite 5, tailwind css 3 |
| стейт | zustand |
| роутинг | react router 6 |
| аудио | rodio на rust |
| иконки | lucide |
| анимации | css keyframes |

---

## лицензия

MIT

подробности в файле [LICENSE](./LICENSE)

soundcloud это торговая марка soundcloud ltd

это приложение не аффилировано с soundcloud

---

<div align="center">

### дисклеймер

неофициальный клиент

не связан с soundcloud

все права на музыку принадлежат исполнителям и правообладателям

</div>

---

<p align="center">
<code>soundcloud клиент</code> · <code>soundcloud для пк</code> · <code>soundcloud windows</code> · <code>soundcloud без рекламы</code> · <code>soundcloud россия</code> · <code>soundcloud в россии</code> · <code>soundcloud не открывается</code> · <code>soundcloud заблокирован</code> · <code>soundcloud blocked russia</code> · <code>soundcloud desktop app</code> · <code>soundcloud desktop client</code> · <code>soundcloud player</code> · <code>soundcloud без капчи</code> · <code>скачать soundcloud на компьютер</code> · <code>soundcloud desktop download</code> · <code>soundcloud alternative client</code> · <code>soundcloud no ads</code> · <code>музыкальный плеер soundcloud</code> · <code>aether music player</code>
</p>

<p align="center">
<a href="https://github.com/whyspurky/aether-react/releases/latest">
<img src="https://img.shields.io/badge/СКАЧАТЬ_AETHER-FFFFFF?style=for-the-badge&labelColor=0F0F0F" alt="download" height="50"/>
</a>
</p>