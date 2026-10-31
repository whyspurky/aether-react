use super::client::ProxyConfig;

// порядок как у браузеров: сначала https, потом общий http, потом все схемы
const ENV_VARS: &[&str] = &[
    "https_proxy",
    "HTTPS_PROXY",
    "http_proxy",
    "HTTP_PROXY",
    "all_proxy",
    "ALL_PROXY",
];

pub fn detect() -> Option<ProxyConfig> {
    env_proxy().or_else(platform_proxy)
}

fn env_proxy() -> Option<ProxyConfig> {
    for key in ENV_VARS {
        let Ok(value) = std::env::var(key) else {
            continue;
        };
        if let Some(config) = parse(&value) {
            return Some(config);
        }
    }
    None
}

// принимает host:port, схему http://, socks5:// и userinfo
fn parse(raw: &str) -> Option<ProxyConfig> {
    let value = raw.trim();
    if value.is_empty() {
        return None;
    }

    let (kind, rest) = match value.split_once("://") {
        Some((scheme, rest)) => (kind_of(scheme)?, rest),
        None => ("http", value),
    };

    let rest = rest.trim_end_matches('/');
    let (credentials, host_port) = match rest.rsplit_once('@') {
        Some((credentials, host_port)) => (Some(credentials), host_port),
        None => (None, rest),
    };

    let (host, port) = host_port.rsplit_once(':')?;
    let port = port.parse::<u16>().ok()?;
    let host = host.trim_start_matches('[').trim_end_matches(']');
    if host.is_empty() || port == 0 {
        return None;
    }

    let (username, password) = match credentials {
        Some(value) => match value.split_once(':') {
            Some((user, password)) => (user.to_string(), password.to_string()),
            None => (value.to_string(), String::new()),
        },
        None => (String::new(), String::new()),
    };

    Some(ProxyConfig {
        kind: kind.to_string(),
        host: host.to_string(),
        port,
        username,
        password,
    })
}

fn kind_of(scheme: &str) -> Option<&'static str> {
    match scheme.trim().to_ascii_lowercase().as_str() {
        "http" => Some("http"),
        "https" => Some("https"),
        // socks5h в нашем конфиге это socks5 с dns на прокси
        "socks5" | "socks5h" => Some("socks5"),
        _ => None,
    }
}

// в реестре ProxyServer бывает 'host:port' и 'http=h:p;https=h:p'
fn from_registry(enabled: u32, server: &str) -> Option<ProxyConfig> {
    if enabled == 0 {
        return None;
    }

    let value = if server.contains('=') {
        let mut https = None;
        let mut http = None;
        for part in server.split(';') {
            let Some((scheme, address)) = part.split_once('=') else {
                continue;
            };
            let address = address.trim();
            if address.is_empty() {
                continue;
            }
            match scheme.trim().to_ascii_lowercase().as_str() {
                "https" => https = Some(address.to_string()),
                "http" => http = Some(address.to_string()),
                _ => {}
            }
        }
        https.or(http)?
    } else {
        server.trim().to_string()
    };

    parse(&value)
}

#[cfg(windows)]
fn platform_proxy() -> Option<ProxyConfig> {
    use winreg::enums::{HKEY_CURRENT_USER, KEY_READ};
    use winreg::RegKey;

    const PATH: &str = "Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings";

    let key = RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey_with_flags(PATH, KEY_READ)
        .ok()?;
    let enabled = key.get_value::<u32, _>("ProxyEnable").unwrap_or(0);
    let server = key.get_value::<String, _>("ProxyServer").unwrap_or_default();
    // shortcut: список исключений ProxyOverride не читаем, все запросы приложения внешние
    from_registry(enabled, &server)
}

#[cfg(not(windows))]
fn platform_proxy() -> Option<ProxyConfig> {
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config(kind: &str, host: &str, port: u16) -> ProxyConfig {
        ProxyConfig {
            kind: kind.into(),
            host: host.into(),
            port,
            username: String::new(),
            password: String::new(),
        }
    }

    #[test]
    fn parses_plain_host_port_as_http() {
        assert_eq!(parse("127.0.0.1:7890"), Some(config("http", "127.0.0.1", 7890)));
    }

    #[test]
    fn parses_scheme_and_userinfo() {
        let proxy = parse("socks5h://user:pass@10.0.0.2:1080").unwrap();
        assert_eq!(proxy.kind, "socks5");
        assert_eq!(proxy.host, "10.0.0.2");
        assert_eq!(proxy.port, 1080);
        assert_eq!(proxy.username, "user");
        assert_eq!(proxy.password, "pass");
    }

    #[test]
    fn parses_https_scheme_and_trailing_slash() {
        assert_eq!(parse("https://proxy.local:8443/"), Some(config("https", "proxy.local", 8443)));
    }

    #[test]
    fn rejects_garbage() {
        assert_eq!(parse(""), None);
        assert_eq!(parse("proxy.local"), None);
        assert_eq!(parse("http://:8080"), None);
        assert_eq!(parse("http://host:0"), None);
        assert_eq!(parse("socks4://host:1080"), None);
    }

    #[test]
    fn registry_disabled_is_none() {
        assert_eq!(from_registry(0, "127.0.0.1:7890"), None);
    }

    #[test]
    fn registry_prefers_https_entry() {
        let proxy = from_registry(1, "http=127.0.0.1:8080;https=127.0.0.1:8443").unwrap();
        assert_eq!(proxy.port, 8443);
    }

    #[test]
    fn registry_falls_back_to_http_entry() {
        let proxy = from_registry(1, "http=127.0.0.1:8080").unwrap();
        assert_eq!(proxy.port, 8080);
    }

    #[test]
    fn registry_plain_value() {
        assert_eq!(from_registry(1, "127.0.0.1:7890"), Some(config("http", "127.0.0.1", 7890)));
    }
}
