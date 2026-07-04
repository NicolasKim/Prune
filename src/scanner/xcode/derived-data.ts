import { homedir } from 'os'
import path from 'path'
import { BaseScanner } from '../base'
import type { CacheItem } from '../../shared/types'

export class DerivedDataScanner extends BaseScanner {
  id = 'xcode.derived-data'
  name = 'Xcode DerivedData'
  description = 'Xcode 构建产物、索引、预编译头文件'
  category = 'Xcode'
  icon = '🔶'

  async scan(): Promise<CacheItem[]> {
    const items: CacheItem[] = []
    const ddDir = path.join(homedir(), 'Library', 'Developer', 'Xcode', 'DerivedData')

    const size = await this.getSize(ddDir)
    if (size > 0) {
      items.push(this.makeItem(
        'derived-data',
        'Xcode DerivedData',
        '每个 Xcode 项目的构建产物、索引、预编译头。可安全删除，Xcode 下次构建时重建',
        [ddDir],
        size,
        'safe',
        '下次 Build 项目时 Xcode 会自动重建构建产物和索引'
      ))
    }

    return items
  }
}
