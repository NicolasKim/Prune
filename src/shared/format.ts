const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
const MAX_I = UNITS.length - 1

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), MAX_I)
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${UNITS[i]}`
}
