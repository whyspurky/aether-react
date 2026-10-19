# сборка из исходников

## требования

- node js 20 или новее
- rust stable
- windows 10 1809 или новее, webview2

## запуск

```bash
git clone https://github.com/whyspurky/aether-react.git
cd aether-react
npm ci
npm run tauri:dev
```

первая сборка rust занимает 5-10 минут, дальше из кеша

## релизная сборка

```bash
npm run tauri:build
```

быстрый вариант для тестов:

```bash
npm run tauri:build -- --profile release-fast
```

артефакты появятся в `src-tauri/target/release/bundle/`, обычно это msi и exe

## проверки

```bash
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

## ускорение локальной сборки

sccache и lld подключаются локально, в `~/.cargo/config.toml`, а не в репозитории:

```toml
[target.x86_64-pc-windows-msvc]
rustflags = ["-C", "link-arg=-fuse-ld=lld"]

[build]
rustc-wrapper = "C:\\Users\\<user>\\.cargo\\bin\\sccache.exe"
```

так конфиг не ломает сборку на чужих машинах и в ci

## версия

версия меняется в трёх местах: `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`
