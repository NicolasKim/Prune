import { homedir } from 'os'
import path from 'path'
import fs from 'fs/promises'
import { BaseScanner } from '../base'
import type { CacheItem } from '../../shared/types'

export class SystemCacheScanner extends BaseScanner {
  id = 'system.caches'
  name = '系统缓存'
  description = '系统级缓存、日志和历史文件'
  category = 'System'
  icon = '⚙️'

  async scan(): Promise<CacheItem[]> {
    const items: CacheItem[] = []
    const home = homedir()

    // Homebrew old versions
    const brewCellarDir = '/opt/homebrew/Cellar'
    const brewCellarSize = await this.getSize(brewCellarDir)
    if (brewCellarSize > 0) {
      items.push(this.makeItem(
        'brew-old-versions',
        'Homebrew 旧版本',
        'Homebrew 安装的旧版本软件（仅通过 brew cleanup 清理，勿手动删除）',
        [brewCellarDir],
        brewCellarSize,
        'conditional',
        '通过 brew install <包名>@<版本号> 重新安装特定版本（部分旧版本可能已从仓库移除）'
      ))
    }

    // Shell history
    const shellHistoryPaths = [
      path.join(home, '.zsh_history'),
      path.join(home, '.bash_history')
    ]
    let totalHistorySize = 0
    const existingHistoryPaths: string[] = []
    for (const p of shellHistoryPaths) {
      const s = await this.getSize(p)
      if (s > 0) {
        totalHistorySize += s
        existingHistoryPaths.push(p)
      }
    }
    if (totalHistorySize > 0) {
      items.push(this.makeItem(
        'shell-history',
        'Shell 历史',
        'zsh/bash 命令行历史记录（删除后不可恢复）',
        existingHistoryPaths,
        totalHistorySize,
        'caution',
        '删除后无法恢复，建议手动备份'
      ))
    }

    // zcompdump
    const homeEntries = await fs.readdir(home)
    const zcompdumpPaths = homeEntries
      .filter(e => e.startsWith('.zcompdump'))
      .map(e => path.join(home, e))
    let zcompdumpSize = 0
    for (const p of zcompdumpPaths) {
      zcompdumpSize += await this.getSize(p)
    }
    if (zcompdumpSize > 0) {
      items.push(this.makeItem(
        'zcompdump',
        'zcompdump 补全缓存',
        'Zsh 自动补全转储缓存文件',
        zcompdumpPaths,
        zcompdumpSize,
        'safe',
        '下次启动 zsh 自动重建'
      ))
    }

    // Xcode caches
    const xcodeCacheDir = path.join(home, 'Library', 'Caches', 'com.apple.dt.Xcode')
    const xcodeCacheSize = await this.getSize(xcodeCacheDir)
    if (xcodeCacheSize > 0) {
      items.push(this.makeItem(
        'xcode-caches',
        'Xcode 缓存',
        'Xcode IDE 缓存文件',
        [xcodeCacheDir],
        xcodeCacheSize,
        'safe',
        '重启 Xcode 自动重建'
      ))
    }

    // Top-level Library/Caches
    const libCachesDir = path.join(home, 'Library', 'Caches')
    const libCachesSize = await this.getSize(libCachesDir)
    if (libCachesSize > 0) {
      items.push(this.makeItem(
        'library-caches',
        'Library/Caches 系统缓存',
        '系统级应用缓存目录（包含各种第三方应用缓存，范围较广）',
        [libCachesDir],
        libCachesSize,
        'caution',
        '部分应用缓存在运行时自动重建'
      ))
    }

    return items
  }
}
