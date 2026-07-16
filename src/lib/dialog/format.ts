export function formatPercent(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : `${value.toFixed(1)}%`;
}

export function formatNumber(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : value.toFixed(1);
}

export function normalizeUpsaClassName(className: string) {
  return className.match(/[1-6]\s+[A-Z]+/i)?.[0] ?? className;
}

export function classYear(className: string) {
  return Number(className.match(/[1-6]/)?.[0] ?? 0);
}
