use std::fs;
use std::io::Write;
use std::path::Path;
use std::process::Command;

use futures::StreamExt;
use tauri::Emitter;

use crate::api::http;

const SERVICE_NAMES: &[&str] = &[
    "zapret",
    "zapret_service",
    "winws",
    "winws1",
    "winws2",
];



fn service_exists(name: &str) -> bool {
    Command::new("sc")
        .args(["query", name])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

fn find_service() -> Option<String> {
    for name in SERVICE_NAMES {
        if service_exists(name) {
            return Some((*name).to_string());
        }
    }
    None
}


fn service_status(name: &str) -> String {
    let output = match Command::new("sc").args(["query", name]).output() {
        Ok(o) => o,
        Err(_) => return "not_installed".to_string(),
    };

    let stdout = String::from_utf8_lossy(&output.stdout);
    if stdout.contains("RUNNING") {
        "running".to_string()
    } else if stdout.contains("STOPPED") {
        "stopped".to_string()
    } else {
        "not_installed".to_string()
    }
}

fn process_running() -> bool {
    let output = match Command::new("tasklist")
        .args(["/FI", "IMAGENAME eq winws.exe", "/NH"])
        .output()
    {
        Ok(o) => o,
        Err(_) => return false,
    };

    let stdout = String::from_utf8_lossy(&output.stdout).to_lowercase();
    stdout.contains("winws.exe")
}

fn run_as_admin(program: &str, args: &[&str]) -> Result<(), String> {
    let args_str = args
        .iter()
        .map(|a| format!("'{}'", a.replace('\'', "''")))
        .collect::<Vec<_>>()
        .join(", ");

    let cmd = format!(
        "Start-Process -Verb RunAs -FilePath '{}' -ArgumentList {}",
        program, args_str
    );

    println!("[zapret] powershell: {}", cmd);

    let output = Command::new("powershell")
        .args(["-Command", &cmd])
        .output()
        .map_err(|e| format!("powershell: {}", e))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        let out = String::from_utf8_lossy(&output.stdout);
        let msg = format!("{}{}", err.trim(), out.trim());
        if !msg.is_empty() {
            return Err(format!("powershell: {}", msg));
        }
        return Err(format!("powershell exit {}", output.status));
    }

    Ok(())
}

fn run_bat_as_admin(bat_path: &str) -> Result<(), String> {
    let cmd = format!(
        "Start-Process -Verb RunAs -FilePath 'cmd.exe' -ArgumentList '/c', '{}'",
        bat_path.replace('\'', "''")
    );

    println!("[zapret] powershell: {}", cmd);

    let output = Command::new("powershell")
        .args(["-Command", &cmd])
        .output()
        .map_err(|e| format!("powershell: {}", e))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        let out = String::from_utf8_lossy(&output.stdout);
        let msg = format!("{}{}", err.trim(), out.trim());
        if !msg.is_empty() {
            return Err(format!("powershell: {}", msg));
        }
        return Err(format!("powershell exit {}", output.status));
    }

    Ok(())
}


#[tauri::command]
pub async fn zapret_status() -> Result<String, String> {
    if let Some(name) = find_service() {
        return Ok(service_status(&name));
    }

    if process_running() {
        return Ok("running".to_string());
    }

    Ok("not_installed".to_string())
}

#[tauri::command]
pub async fn zapret_start() -> Result<(), String> {
    if let Some(name) = find_service() {
        let status = service_status(&name);
        if status == "running" {
            return Ok(());
        }

        return run_as_admin("net", &["start", &name]);
    }

    Err("служба zapret не найдена — запусти bat-файл или установи через service.bat".into())
}

#[tauri::command]
pub async fn zapret_stop() -> Result<(), String> {
    let mut stopped = false;

    if let Some(name) = find_service() {
        let status = service_status(&name);
        if status != "stopped" {
            run_as_admin("net", &["stop", &name])?;
            stopped = true;
        }
    }

    if process_running() {
        run_as_admin("taskkill", &["/F", "/IM", "winws.exe"])?;
        stopped = true;
    }

    if !stopped {
        return Err("zapret не запущен".into());
    }

    Ok(())
}

#[tauri::command]
pub async fn zapret_run_bat(bat_path: String) -> Result<(), String> {
    if !Path::new(&bat_path).exists() {
        return Err(format!("файл не найден: {}", bat_path));
    }

    if let Some(name) = find_service() {
        let status = service_status(&name);
        if status == "running" {
            println!("[zapret] служба {} уже запущена, пропускаем", name);
            return Ok(());
        }
    }

    if process_running() {
        println!("[zapret] процесс winws.exe уже работает, убиваем перед запуском");
        run_as_admin("taskkill", &["/F", "/IM", "winws.exe"])?;
        std::thread::sleep(std::time::Duration::from_millis(500));
    }

    run_bat_as_admin(&bat_path)
}

#[tauri::command]
pub async fn zapret_process_running() -> Result<bool, String> {
    Ok(process_running())
}

#[tauri::command]
pub async fn zapret_open_folder(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("папка не найдена: {}", path));
    }

    Command::new("explorer")
        .arg(&path)
        .spawn()
        .map_err(|e| format!("explorer: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn zapret_open_file(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("файл не найден: {}", path));
    }

    Command::new("cmd")
        .args(["/c", "start", "", &path])
        .spawn()
        .map_err(|e| format!("start: {}", e))?;

    Ok(())
}

#[derive(serde::Serialize)]
pub struct Strategy {
    pub filename: String,
    pub path: String,
}

fn natural_cmp(a: &str, b: &str) -> std::cmp::Ordering {
    let a_lower = a.to_lowercase();
    let b_lower = b.to_lowercase();

    let a_is_base = a_lower == "general.bat";
    let b_is_base = b_lower == "general.bat";
    if a_is_base && !b_is_base {
        return std::cmp::Ordering::Less;
    }
    if !a_is_base && b_is_base {
        return std::cmp::Ordering::Greater;
    }

    let a_parts = split_alphanumeric(&a_lower);
    let b_parts = split_alphanumeric(&b_lower);

    for (pa, pb) in a_parts.iter().zip(b_parts.iter()) {
        let ord = match (pa, pb) {
            (Part::Text(ta), Part::Text(tb)) => ta.cmp(tb),
            (Part::Num(na), Part::Num(nb)) => na.cmp(nb),
            (Part::Text(_), Part::Num(_)) => std::cmp::Ordering::Less,
            (Part::Num(_), Part::Text(_)) => std::cmp::Ordering::Greater,
        };
        if ord != std::cmp::Ordering::Equal {
            return ord;
        }
    }

    a_parts.len().cmp(&b_parts.len())
}

enum Part {
    Text(String),
    Num(u64),
}

fn split_alphanumeric(s: &str) -> Vec<Part> {
    let mut parts = Vec::new();
    let mut current = String::new();
    let mut is_num = false;

    for c in s.chars() {
        let c_is_num = c.is_ascii_digit();
        if c_is_num != is_num && !current.is_empty() {
            parts.push(if is_num {
                Part::Num(current.parse().unwrap_or(0))
            } else {
                Part::Text(current.clone())
            });
            current.clear();
        }
        is_num = c_is_num;
        current.push(c);
    }

    if !current.is_empty() {
        parts.push(if is_num {
            Part::Num(current.parse().unwrap_or(0))
        } else {
            Part::Text(current)
        });
    }

    parts
}

#[tauri::command]
pub async fn zapret_scan_strategies(folder: String) -> Result<Vec<Strategy>, String> {
    let p = Path::new(&folder);
    if !p.exists() || !p.is_dir() {
        return Err("папка не найдена".into());
    }

    let entries = fs::read_dir(p).map_err(|e| format!("read_dir: {}", e))?;

    let mut strategies = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }

        let name = match path.file_name().and_then(|s| s.to_str()) {
            Some(s) => s.to_string(),
            None => continue,
        };

        if !name.to_lowercase().starts_with("general") || !name.to_lowercase().ends_with(".bat") {
            continue;
        }

        strategies.push(Strategy {
            filename: name,
            path: path.to_string_lossy().to_string(),
        });
    }

    strategies.sort_by(|a, b| natural_cmp(&a.filename, &b.filename));
    Ok(strategies)
}

#[derive(serde::Serialize)]
pub struct ListCheck {
    pub file: String,
    pub exists: bool,
    pub has_sndcdn: bool,
    pub has_soundcloud: bool,
    pub sndcdn_lines: Vec<String>,
}

#[tauri::command]
pub async fn zapret_check_lists(folder: String) -> Result<Vec<ListCheck>, String> {
    let root = Path::new(&folder);
    let lists_dir = root.join("lists");
    let actual_dir = if lists_dir.exists() { lists_dir } else { root.to_path_buf() };

    let files = ["list-general-user.txt"];

    let mut result = Vec::new();

    for f in files {
        let path = actual_dir.join(f);
        let exists = path.exists();

        let mut has_sndcdn = false;
        let mut has_soundcloud = false;
        let mut sndcdn_lines = Vec::new();

        if exists {
            if let Ok(content) = fs::read_to_string(&path) {
                for line in content.lines() {
                    let trimmed = line.trim().to_lowercase();
                    if trimmed.is_empty() || trimmed.starts_with('#') {
                        continue;
                    }
                    if trimmed.contains("sndcdn") {
                        has_sndcdn = true;
                        sndcdn_lines.push(line.trim().to_string());
                    }
                    if trimmed.contains("soundcloud") {
                        has_soundcloud = true;
                    }
                }
            }
        }

        result.push(ListCheck {
            file: f.to_string(),
            exists,
            has_sndcdn,
            has_soundcloud,
            sndcdn_lines,
        });
    }

    Ok(result)
}

#[tauri::command]
pub async fn zapret_add_soundcloud_domains(folder: String) -> Result<(), String> {
    let root = Path::new(&folder);
    let lists_dir = root.join("lists");
    let actual_dir = if lists_dir.exists() { lists_dir } else { root.to_path_buf() };

    let path = actual_dir.join("list-general-user.txt");

let domains = [
    "soundcloud.com",
    "www.soundcloud.com",
    "sndcdn.com",
    "soundcloud.app.goo.gl",
    "api-v2.soundcloud.com",
    "api-auth.soundcloud.com",
    "graph.soundcloud.com",
    "dwt.soundcloud.com",
    "a-v2.sndcdn.com",
    "cf-media.sndcdn.com",
    "cf-hls-media.sndcdn.com",
    "cf-hls-opus-media.sndcdn.com",
    "assets.web.soundcloud.cloud",
    "soundcloud.cloud",
    "d15wdfb2rw9n2y.cloudfront.net",
    "d1hcxlifzhxzha.cloudfront.net",
    "d1ws1c3tu8ejje.cloudfront.net",
    "d2gff659so2qub.cloudfront.net",
    "d36lkcxq7qra7v.cloudfront.net",
    "dezyktpp25vy8.cloudfront.net",
];

    let mut content = fs::read_to_string(&path).unwrap_or_default();

    if content.is_empty() {
        content.push_str("# пользовательские домены для обхода\n\n");
    }

    let existing: Vec<String> = content
        .lines()
        .map(|l| l.trim().to_lowercase())
        .collect();

    let mut added = 0;
    for d in domains {
        if !existing.contains(&d.to_lowercase()) {
            content.push_str(d);
            content.push('\n');
            added += 1;
        }
    }

    if added == 0 {
        return Ok(());
    }

    fs::write(&path, content).map_err(|e| format!("write: {}", e))?;
    println!("[zapret] добавил {} доменов в {:?}", added, path);

    Ok(())
}

#[derive(serde::Serialize, Clone)]
pub struct DownloadProgress {
    pub downloaded: u64,
    pub total: u64,
}

#[tauri::command]
pub async fn zapret_download(
    app: tauri::AppHandle,
) -> Result<String, String> {
    let release: serde_json::Value = http()
        .get("https://api.github.com/repos/Flowseal/zapret-discord-youtube/releases/latest")
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|e| format!("github api: {}", e))?
        .json()
        .await
        .map_err(|e| format!("github json: {}", e))?;

    let assets = release["assets"]
        .as_array()
        .ok_or("нет assets в релизе")?;

    let zip_asset = assets
        .iter()
        .find(|a| {
            a["name"]
                .as_str()
                .map(|n| n.ends_with(".zip"))
                .unwrap_or(false)
        })
        .ok_or("нет zip в релизе")?;

    let download_url = zip_asset["browser_download_url"]
        .as_str()
        .ok_or("нет download_url")?;
    let filename = zip_asset["name"].as_str().ok_or("нет name")?;

    println!("[zapret] скачиваю {} из {}", filename, download_url);

    let app_data = dirs::data_local_dir()
        .ok_or("нет LOCALAPPDATA")?;
    let zapret_dir = app_data.join("aether").join("zapret");
    fs::create_dir_all(&zapret_dir).map_err(|e| format!("create_dir: {}", e))?;

    let zip_path = zapret_dir.join(filename);

    let resp = http()
        .get(download_url)
        .send()
        .await
        .map_err(|e| format!("download: {}", e))?;

    let total = resp.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;

    let mut file = fs::File::create(&zip_path)
        .map_err(|e| format!("create file: {}", e))?;

    let mut stream = resp.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("chunk: {}", e))?;
        file.write_all(&chunk).map_err(|e| format!("write: {}", e))?;
        downloaded += chunk.len() as u64;

        let _ = app.emit(
            "zapret:download-progress",
            DownloadProgress { downloaded, total },
        );
    }

    drop(file);

    println!("[zapret] скачано {} байт, распаковываю", downloaded);

    extract_zip(&zip_path, &zapret_dir)?;

    let _ = fs::remove_file(&zip_path);

    let actual_dir = find_zapret_root(&zapret_dir).unwrap_or(zapret_dir.clone());

    println!("[zapret] распакован в {:?}", actual_dir);

    Ok(actual_dir.to_string_lossy().to_string())
}

fn find_zapret_root(dir: &Path) -> Option<std::path::PathBuf> {
    if dir.join("general.bat").exists() {
        return Some(dir.to_path_buf());
    }

    let entries = fs::read_dir(dir).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() && path.join("general.bat").exists() {
            return Some(path);
        }
    }

    None
}

fn extract_zip(zip_path: &Path, dest: &Path) -> Result<(), String> {
    let file = fs::File::open(zip_path).map_err(|e| format!("open zip: {}", e))?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| format!("zip read: {}", e))?;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| format!("zip entry: {}", e))?;
        let outpath = match entry.enclosed_name() {
            Some(p) => dest.join(p),
            None => continue,
        };

        if entry.is_dir() {
            fs::create_dir_all(&outpath).map_err(|e| format!("mkdir: {}", e))?;
        } else {
            if let Some(parent) = outpath.parent() {
                fs::create_dir_all(parent).map_err(|e| format!("mkdir: {}", e))?;
            }
            let mut outfile = fs::File::create(&outpath).map_err(|e| format!("create: {}", e))?;
            std::io::copy(&mut entry, &mut outfile).map_err(|e| format!("copy: {}", e))?;
        }
    }

    Ok(())
}