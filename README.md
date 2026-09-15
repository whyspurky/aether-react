<div align="center">

# aether

десктопный музыкальный плеер, стримящий треки с внутреннего апи ск

[![releases](https://img.shields.io/github/v/release/whyspurky/aether-react?style=flat-square&color=white&labelColor=0F0F0F)](https://github.com/whyspurky/aether-react/releases)
[![telegram](https://img.shields.io/badge/telegram-iqaether-white?style=flat-square&logo=telegram&logoColor=white&labelColor=0F0F0F)](https://t.me/iqaether)

</div>

---

### стек

**frontend** — react 18 + typescript + tailwind css + zustand
**backend** — tauri 2 (rust) + rodio + symphonia + reqwest
**сборка** — vite 5 

---

### возможности

все базовые функции современных музыкальных плееров и дополнения в будущих обновах

---

### запуск

в корне проекта два скрипта:

| скрипт | назначение |
| :--- | :--- |
| `dev.bat` | запуск в режиме разработки |
| `build.bat` | сборка релиза |

готовые сборки смотри в разделе [**releases**](https://github.com/whyspurky/aether-react/releases).

---

### client id

приложение использует публичный `client_id` soundcloud. он вшит в бандл и периодически меняется на стороне ск. если стриминг перестал работать — обнови `client_id` из браузера (`devtools` → `network` → любой запрос к `api-v2.soundcloud.com` → параметр `client_id`) либо возьми с открытых источников.

---

### сообщество

телеграм-канал с обновлениями и поддержкой — [**t.me/iqaether**](https://t.me/iqaether)

---

<div align="center">

### дисклеймер

неофициальный клиент. не связан с ск. используется исключительно в личных целях без коммерции.
все права на музыку принадлежат исполнителям и правообладателям.

</div>
