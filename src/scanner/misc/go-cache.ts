import { homedir } from 'os'
import path from 'path'
import { BaseScanner } from '../base'
import type { CacheItem } from '../../shared/types'

export class GoCacheScanner extends BaseScanner {
  id = 'misc.go'
  name = 'Go 缓存'
  description = 'Go 编译缓存和模块缓存'
  category = 'Misc'
  icon = '📦'

  async scan(): Promise<CacheItem[]> {
    const items: CacheItem[] = []
    const home = homedir()

    const goBuildDir = path.join(home, 'Library', 'Caches', 'go-build')
    const buildSize = await this.getSize(goBuildDir)
    if (buildSize > 0) {
      items.push(this.makeItem(
        'go-build',
        'Go 编译缓存 (go-build)',
        'Go 编译器缓存的编译对象文件',
        [goBuildDir],
        buildSize,
        'safe',
        'go clean -cache 或 go build 自动重建'
      ))
    }

    const goModDir = path.join(home, 'go', 'pkg', 'mod')
    const modSize = await this.getSize(goModDir)
    if (modSize > 0) {
      items.push(this.makeItem(
        'go-mod',
        'Go 模块缓存 (pkg/mod)',
        '下载的 Go 模块依赖源码',
        [goModDir],
        modSize,
        'safe',
        'go mod download 重新下载'
      ))
    }

    return items
  }
}
