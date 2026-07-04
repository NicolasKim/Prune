import { homedir } from 'os'
import path from 'path'
import { BaseScanner } from '../base'
import type { CacheItem } from '../../shared/types'

export class BrewCacheScanner extends BaseScanner {
  id = 'brew.cache'
  name = 'Homebrew 缓存'
  description = 'Homebrew 包管理器下载的 bottle 缓存和 API 缓存'
  category = 'Homebrew'
  icon = '🍺'

  async scan(): Promise<CacheItem[]> {
    const items: CacheItem[] = []
    const home = homedir()
    const brewCacheDir = path.join(home, 'Library', 'Caches', 'Homebrew')

    const downloadsDir = path.join(brewCacheDir, 'downloads')
    const downloadsSize = await this.getSize(downloadsDir)
    if (downloadsSize > 0) {
      items.push(this.makeItem(
        'brew-downloads',
        'Homebrew 下载缓存 (downloads)',
        '已下载的 bottle 压缩包，每个 formula 一个 tar.gz',
        [downloadsDir],
        downloadsSize,
        'safe',
        'brew cleanup 可清理，或自动重新下载'
      ))
    }

    // brew API cache
    const apiDir = path.join(brewCacheDir, 'api')
    const apiSize = await this.getSize(apiDir)
    if (apiSize > 0) {
      items.push(this.makeItem(
        'brew-api',
        'Homebrew API 缓存',
        'Formula 元数据 API 响应缓存',
        [apiDir],
        apiSize,
        'safe',
        'brew update 自动重建'
      ))
    }

    // brew bootsnap cache
    const bootsnapDir = path.join(brewCacheDir, 'bootsnap')
    const bootsnapSize = await this.getSize(bootsnapDir)
    if (bootsnapSize > 0) {
      items.push(this.makeItem(
        'brew-bootsnap',
        'Homebrew Bootsnap 缓存',
        'Ruby 预编译缓存，加速 brew 命令启动',
        [bootsnapDir],
        bootsnapSize,
        'safe',
        '下次 brew 命令自动重建'
      ))
    }

    // brew logs
    const logsDir = path.join(home, 'Library', 'Logs', 'Homebrew')
    const logsSize = await this.getSize(logsDir)
    if (logsSize > 0) {
      items.push(this.makeItem(
        'brew-logs',
        'Homebrew 日志',
        'brew install 构建日志',
        [logsDir],
        logsSize,
        'safe',
        '下次 brew 操作自动生成'
      ))
    }

    return items
  }
}
