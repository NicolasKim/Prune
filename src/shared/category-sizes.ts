import type { CacheItem } from './types'
import { categoryLabelForScanner } from './scanner-labels'

export function categorySizesFromItems(items: CacheItem[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const item of items) {
    const label = categoryLabelForScanner(item.scannerId)
    if (!label) continue
    map[label] = (map[label] || 0) + item.sizeBytes
  }
  return map
}
