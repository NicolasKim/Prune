import { homedir } from 'os'
import path from 'path'
import { BaseScanner } from '../base'
import type { CacheItem } from '../../shared/types'

export class UvCacheScanner extends BaseScanner {
  id = 'python.uv'
  name = 'uv 缓存'
  description = 'uv Python 包管理器缓存（可能是最大的 Python 缓存）'
  category = 'Python'
  icon = '🔵'

  async scan(): Promise<CacheItem[]> {
    const items: CacheItem[] = []
    const uvCacheDir = path.join(homedir(), '.cache', 'uv')

    const size = await this.getSize(uvCacheDir)
    if (size > 0) {
      items.push(this.makeItem(
        'uv-cache',
        'uv 缓存',
        'uv 包管理器的内容寻址包缓存，包含 archive、wheels、sdists、索引缓存',
        [uvCacheDir],
        size,
        'safe',
        '运行 uv sync 自动重建'
      ))
    }

    return items
  }
}
