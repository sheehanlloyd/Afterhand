export function formatMoney(amount: number, options: { sign?: boolean } = {}): string {
  const rounded = Math.round(amount * 100) / 100;
  const abs = Math.abs(rounded);
  const body = abs.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(abs) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  const prefix = rounded < 0 ? "-$" : options.sign ? "+$" : "$";
  if (rounded === 0 && options.sign) return "$0";
  return `${prefix}${body}`;
}

export function formatPercent(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return "0%";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

