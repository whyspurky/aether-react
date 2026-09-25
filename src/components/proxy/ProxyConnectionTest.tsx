import { useEffect, useState } from 'react';
import { api } from '@lib/api';
import { CompactResult } from './CompactResult';
import type { ProxyMode } from '@store/types';

interface TestResult {
  ok: boolean;
  status: number;
  time_ms: number;
  error: string | null;
}

interface Props {
  mode: ProxyMode;
}

export function ProxyConnectionTest({ mode }: Props) {
  const [testLoading, setTestLoading] = useState(false);
  const [apiResult, setApiResult] = useState<TestResult | null>(null);
  const [cdnResult, setCdnResult] = useState<TestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const handleTest = async () => {
    setTestLoading(true);
    setApiResult(null);
    setCdnResult(null);
    setTestError(null);

    const apiPromise = api
      .proxyTestApi()
      .then((r) => setApiResult(r as TestResult))
      .catch((e) => setTestError(String(e)));

    const cdnPromise = api
      .proxyTestCdn()
      .then((r) => setCdnResult(r as TestResult))
      .catch(() => {});

    await Promise.all([apiPromise, cdnPromise]);
    setTestLoading(false);
  };

  useEffect(() => {
    setApiResult(null);
    setCdnResult(null);
    setTestError(null);
  }, [mode]);

  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-primary p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary">проверка подключения</p>
          <p className="text-xs text-text-tertiary mt-0.5">
            тест связи с доменами soundcloud
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(apiResult || cdnResult || testError) && (
            <div className="flex flex-col gap-1 text-xs text-right">
              {testError ? (
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="text-red-400">✕</span>
                  <span className="text-red-400 font-mono">error</span>
                </div>
              ) : (
                <>
                  <CompactResult label="api" result={apiResult} />
                  <CompactResult label="cdn" result={cdnResult} />
                </>
              )}
            </div>
          )}

          <button
            onClick={handleTest}
            disabled={testLoading}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-bg-secondary text-text-secondary hover:bg-text-secondary hover:text-bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {testLoading ? 'проверка...' : 'проверить'}
          </button>
        </div>
      </div>
    </div>
  );
}