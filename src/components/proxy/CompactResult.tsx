interface TestResult {
  ok: boolean;
  status: number;
  time_ms: number;
  error: string | null;
}

interface Props {
  label: string;
  result: TestResult | null;
}

export function CompactResult({ label, result }: Props) {
  if (!result) {
    return (
      <div className="flex items-center gap-1.5 justify-end">
        <span className="text-text-tertiary">·</span>
        <span className="text-text-tertiary font-mono">{label}</span>
        <span className="text-text-tertiary font-mono text-[10px]">...</span>
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="flex items-center gap-1.5 justify-end">
        <span className="text-red-400">✕</span>
        <span className="text-red-400 font-mono">{label}</span>
        <span className="text-red-400 font-mono text-[10px]">error</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 justify-end">
      <span className={result.ok ? 'text-green-500' : 'text-red-400'}>
        {result.ok ? '✓' : '✕'}
      </span>
      <span className="text-text-secondary font-mono">{label}</span>
      <span className="text-text-tertiary font-mono text-[10px]">
        {result.status} · {result.time_ms}ms
      </span>
    </div>
  );
}