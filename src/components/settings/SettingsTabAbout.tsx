import { useEffect, useState } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { openUrl } from '@tauri-apps/plugin-opener';
import { Icon } from '@components/ui/Icon';

interface LinkItem {
  icon: string;
  label: string;
  desc: string;
  url: string;
}

const LINKS: LinkItem[] = [
  {
    icon: 'github',
    label: 'github',
    desc: 'исходный код и релизы',
    url: 'https://github.com/whyspurky/aether-react',
  },
  {
    icon: 'telegram',
    label: 'telegram',
    desc: 'новости и обновления',
    url: 'https://t.me/aether_player',
  },
  {
    icon: 'soundcloud',
    label: 'soundcloud',
    desc: 'источник треков',
    url: 'https://soundcloud.com/discover',
  },
];

export function SettingsTabAbout() {
  const [version, setVersion] = useState('');
  const [tauriVersion, setTauriVersion] = useState('');
  const [platform, setPlatform] = useState('');

  useEffect(() => {
    getVersion().then(setVersion).catch(() => {});
    setTauriVersion('2.12.0');
    const p = navigator.userAgent.includes('Windows') ? 'windows'
      : navigator.userAgent.includes('Mac') ? 'macos'
      : 'linux';
    setPlatform(p);
  }, []);

  const handleOpenLink = async (url: string) => {
    try {
      await openUrl(url);
    } catch {}
  };

 
  return (
    <div className="space-y-4">
      {/* шапка */}
      <div className="relative overflow-hidden rounded-2xl border border-border-subtle bg-bg-primary/40">
        {/* accent градиент сверху */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--accent-primary)] to-transparent" />
        {/* большой accent glow */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[var(--accent-muted)] blur-3xl pointer-events-none" />

        <div className="relative p-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="relative">
              <div className="absolute -inset-1 rounded-2xl bg-[var(--accent-primary)] opacity-20 blur-md" />
              <div className="relative w-14 h-14 rounded-2xl bg-white/[0.06] flex items-center justify-center border border-border-subtle">
                <span className="text-text-primary text-2xl font-bold">a</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-text-primary">aether</h1>
              <p className="text-xs text-text-tertiary">
                десктопный плеер для soundcloud
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="px-3 py-2 rounded-lg bg-white/[0.03] border border-border-subtle">
              <p className="text-[10px] text-text-tertiary uppercase tracking-wider">версия</p>
              <p className="text-sm text-text-primary font-mono mt-0.5">
                {version || '—'}
              </p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-white/[0.03] border border-border-subtle">
              <p className="text-[10px] text-text-tertiary uppercase tracking-wider">tauri</p>
              <p className="text-sm text-text-primary font-mono mt-0.5">
                {tauriVersion}
              </p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-white/[0.03] border border-border-subtle">
              <p className="text-[10px] text-text-tertiary uppercase tracking-wider">ос</p>
              <p className="text-sm text-text-primary font-mono mt-0.5 truncate">
                {platform}
              </p>
            </div>
          </div>
        </div>
      </div>

 

      {/* ссылки */}
      <div className="bg-bg-primary/40 rounded-2xl border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <p className="text-sm text-text-primary">полезные ссылки</p>
          <p className="text-xs text-text-tertiary mt-0.5">открываются в браузере</p>
        </div>
        <div className="divide-y divide-border-subtle">
          {LINKS.map((link, index) => (
            <button
              key={link.label}
              onClick={() => handleOpenLink(link.url)}
              className="w-full flex items-center gap-3 px-5 py-3.5 transition-all duration-200 group hover:bg-white/[0.03] animate-content-fade-in"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:bg-[var(--accent-muted)]">
                <Icon
                  name={link.icon}
                  size={16}
                  className=" transition-colors duration-200 group-hover:text-[var(--accent-primary)]"
                />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm text-text-primary truncate">{link.label}</p>
                <p className="text-xs text-text-tertiary truncate">{link.desc}</p>
              </div>
              <Icon
                name="arrow-up-right"
                size={14}
                className=" transition-all duration-200 group-hover:text-[var(--accent-primary)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </button>
          ))}
        </div>
      </div>

 

      {/* дисклеймер */}
      <div className="relative overflow-hidden rounded-2xl border border-border-subtle bg-white/[0.02] p-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
            <Icon name="info" size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-text-secondary leading-relaxed">
              aether — неофициальный клиент soundcloud. не связан с soundcloud.
              использует публично доступные данные. использование на свой риск.
            </p>
            <p className="text-[11px] text-text-tertiary mt-2">
              лицензия: MIT
            </p>
          </div>
        </div>
      </div>

      {/* footer */}
      <div className="text-center pt-2 pb-4">
        <p className="text-[11px] text-text-tertiary">
          сделано с ♥ для тех кто любит музыку
        </p>
      </div>
    </div>
  );
}