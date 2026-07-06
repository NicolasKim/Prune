import type { TechStackScanner, CacheItem } from '../shared/types'
import { initScanContext, clearScanContext } from './scan-context'
import { NpmCacheScanner } from './node/npm-cache'
import { NodeExtraCachesScanner } from './node/node-extra-caches'
import { NodeProjectScanner } from './node/node-project'
import { BrewCacheScanner } from './brew/brew-cache'
import { DerivedDataScanner } from './xcode/derived-data'
import { XcodeExtraCachesScanner } from './xcode/xcode-extra-caches'
import { UvCacheScanner } from './python/uv-cache'
import { PythonExtraCachesScanner } from './python/python-extra-caches'
import { PythonProjectScanner } from './python/python-project'
import { GradleCacheScanner } from './java/gradle-cache'
import { JavaExtraCachesScanner } from './java/java-extra-caches'
import { JavaProjectScanner } from './java/java-project'
import { RustCacheScanner } from './misc/rust-cache'
import { RustProjectScanner } from './misc/rust-project'
import { GoCacheScanner } from './misc/go-cache'
import { MiscExtraCachesScanner } from './misc/misc-extra-caches'
import { FlutterCacheScanner } from './misc/flutter-caches'
import { GeneralProjectScanner } from './misc/general-project'
import { DockerCacheScanner } from './docker/docker-caches'
import { IdeCachesScanner } from './ide/ide-caches'
import { SystemCacheScanner } from './system/system-caches'

const scanners: TechStackScanner[] = [
  new NpmCacheScanner(),
  new NodeExtraCachesScanner(),
  new NodeProjectScanner(),
  new BrewCacheScanner(),
  new DerivedDataScanner(),
  new XcodeExtraCachesScanner(),
  new UvCacheScanner(),
  new PythonExtraCachesScanner(),
  new PythonProjectScanner(),
  new GradleCacheScanner(),
  new JavaExtraCachesScanner(),
  new JavaProjectScanner(),
  new RustCacheScanner(),
  new RustProjectScanner(),
  new GoCacheScanner(),
  new MiscExtraCachesScanner(),
  new FlutterCacheScanner(),
  new GeneralProjectScanner(),
  new DockerCacheScanner(),
  new IdeCachesScanner(),
  new SystemCacheScanner()
]

export function getAllScanners(): TechStackScanner[] {
  return scanners
}

export function getScanner(id: string): TechStackScanner | undefined {
  return scanners.find(s => s.id === id)
}

export async function runAllScanners(onProgress?: (scannerId: string, scannerName: string) => void): Promise<CacheItem[]> {
  await initScanContext()

  try {
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
  } finally {
    clearScanContext()
  }
}
