import type { TechStackScanner, CacheItem } from '../shared/types'
import { NpmCacheScanner } from './node/npm-cache'
import { BrewCacheScanner } from './brew/brew-cache'
import { DerivedDataScanner } from './xcode/derived-data'
import { UvCacheScanner } from './python/uv-cache'
import { GradleCacheScanner } from './java/gradle-cache'
import { RustCacheScanner } from './misc/rust-cache'
import { GoCacheScanner } from './misc/go-cache'
// future scanners imported here

const scanners: TechStackScanner[] = [
  new NpmCacheScanner(),
  new BrewCacheScanner(),
  new DerivedDataScanner(),
  new UvCacheScanner(),
  new GradleCacheScanner(),
  new RustCacheScanner(),
  new GoCacheScanner()
]

export function getAllScanners(): TechStackScanner[] {
  return scanners
}

export function getScanner(id: string): TechStackScanner | undefined {
  return scanners.find(s => s.id === id)
}

export async function runAllScanners(onProgress?: (scannerId: string, scannerName: string) => void): Promise<CacheItem[]> {
  const results: CacheItem[] = []
  for (const scanner of scanners) {
    onProgress?.(scanner.id, scanner.name)
    try {
      const items = await scanner.scan()
      results.push(...items)
    } catch (err) {
      console.error(`Scanner ${scanner.id} failed:`, err)
    }
  }
  return results
}
