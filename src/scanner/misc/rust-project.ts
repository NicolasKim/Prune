import path from 'path'
import { BaseScanner } from '../base'
import { getProjectRegistry } from '../scan-context'
import type { CacheItem } from '../../shared/types'

export class RustProjectScanner extends BaseScanner {
  id = 'misc.rust-project'
  name = 'Rust 项目缓存'
  description = 'Rust 项目下的 target/ 编译产物目录'
  category = 'Rust'
  icon = '🦀'

  async scan(): Promise<CacheItem[]> {
    const items: CacheItem[] = []

    const projects = getProjectRegistry().getByStack('rust')
    if (projects.length === 0) return items

    const targetPaths: string[] = []
    let targetTotalSize = 0
    for (const proj of projects) {
      const targetDir = path.join(proj, 'target')
      const s = await this.getSize(targetDir)
      if (s > 0) {
        targetTotalSize += s
        targetPaths.push(targetDir)
      }
    }

    if (targetTotalSize > 0) {
      items.push(this.makeItem(
        'target',
        `target/ (${targetPaths.length} 个项目)`,
        'Rust 项目编译产物，包含 debug/release 构建输出和依赖缓存',
        targetPaths,
        targetTotalSize,
        'conditional',
        '在项目目录运行 cargo build 重新编译'
      ))
    }

    return items
  }
}
