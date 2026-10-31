use std::net::{IpAddr, SocketAddr};
use std::sync::{Arc, OnceLock};
use std::time::Duration;

use hickory_resolver::config::{self, LookupIpStrategy, ResolverConfig};
use hickory_resolver::net::runtime::TokioRuntimeProvider;
use hickory_resolver::TokioResolver;
use wreq::dns::{Addrs, Name, Resolve, Resolving};

// провайдер в россии подменяет ответы на хосты звука, doh отвечает честно
// если doh не ответил, запрос уходит в системный резолвер, чтобы не остаться без сети
pub struct DohResolver {
    doh: TokioResolver,
}

impl DohResolver {
    fn build() -> Option<Self> {
        let mut servers = ResolverConfig::https(&config::CLOUDFLARE).into_parts().2;
        servers.extend(ResolverConfig::https(&config::GOOGLE).into_parts().2);

        let mut builder = TokioResolver::builder_with_config(
            ResolverConfig::from_name_servers(servers),
            TokioRuntimeProvider::default(),
        );
        let options = builder.options_mut();
        options.ip_strategy = LookupIpStrategy::Ipv4AndIpv6;
        options.timeout = Duration::from_secs(3);
        options.attempts = 2;

        builder.build().ok().map(|doh| Self { doh })
    }
}

pub fn shared() -> Option<Arc<DohResolver>> {
    static RESOLVER: OnceLock<Option<Arc<DohResolver>>> = OnceLock::new();
    RESOLVER
        .get_or_init(|| DohResolver::build().map(Arc::new))
        .clone()
}

fn addrs(iterator: impl Iterator<Item = IpAddr>) -> Addrs {
    Box::new(
        iterator
            .map(|ip| SocketAddr::new(ip, 0))
            .collect::<Vec<_>>()
            .into_iter(),
    )
}

impl Resolve for DohResolver {
    fn resolve(&self, name: Name) -> Resolving {
        let doh = self.doh.clone();
        let name = name.as_str().to_string();
        Box::pin(async move {
            match doh.lookup_ip(name.as_str()).await {
                Ok(lookup) if lookup.iter().next().is_some() => Ok(addrs(lookup.iter())),
                _ => {
                    let found = tokio::net::lookup_host((name.as_str(), 0)).await?;
                    Ok(addrs(found.map(|addr| addr.ip())))
                }
            }
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolver_builds() {
        assert!(DohResolver::build().is_some());
    }

    #[tokio::test]
    #[ignore]
    async fn live_soundcloud_reachable() {
        let client = wreq::Client::builder()
            .dns_resolver(shared().unwrap())
            .build()
            .unwrap();
        let resp = client.get("https://soundcloud.com/").send().await.unwrap();
        assert!(resp.status().is_success(), "status {}", resp.status());
    }
}
