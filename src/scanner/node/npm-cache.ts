import { homedir } from 'os'
import path from 'path'
import { BaseScanner } from '../base'
import type { CacheItem } from '../../shared/types'

export class NpmCacheScanner extends BaseScanner {
  id = 'node.npm'
  name = 'npm 缓存'
  description = 'npm 包管理器下载缓存'
  category = 'Node.js'
  icon = '🟢'

  async scan(): Promise<CacheItem[]> {
    const items: CacheItem[] = []
    const home = homedir()

    // npm cache
    const npmCachePath = path.join(home, '.npm', '_cacache')
    const npmSize = await this.getSize(npmCachePath)
    if (npmSize > 0) {
      items.push(this.makeItem(
        'npm-cache',
        'npm 缓存 (_cacache)',
        'npm 下载的包 tarball 缓存，内容寻址存储',
        [npmCachePath],
        npmSize,
        'safe',
        '运行 npm cache clean --force 或 npm install 自动重建'
      ))
    }

    // npx cache
    const npxCachePath = path.join(home, '.npm', '_npx')
    const npxSize = await this.getSize(npxCachePath)
    if (npxSize > 0) {
      items.push(this.makeItem(
        'npx-cache',
        'npx 临时缓存',
        'npx 执行的临时下载包',
        [npxCachePath],
        npxSize,
        'safe',
        'npx 会自动重新下载'
      ))
    }

    return items
  }
}
