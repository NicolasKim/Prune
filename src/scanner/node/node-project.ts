import path from 'path'
import { BaseScanner } from '../base'
import { getProjectRegistry } from '../scan-context'
import type { CacheItem } from '../../shared/types'

export class NodeProjectScanner extends BaseScanner {
  id = 'node.project'
  name = 'Node.js 项目缓存'
  description = '各 Node.js 项目下的 node_modules 目录'
  category = 'Node.js'
  icon = '📦'

  async scan(): Promise<CacheItem[]> {
    const items: CacheItem[] = []

    const projects = getProjectRegistry().getByStack('node')
    if (projects.length === 0) return items

    const nmPaths: string[] = []
    let nmTotalSize = 0
    for (const proj of projects) {
      const nmDir = path.join(proj, 'node_modules')
      const s = await this.getSize(nmDir)
      if (s > 0) {
        nmTotalSize += s
        nmPaths.push(nmDir)
      }
    }

    if (nmTotalSize > 0) {
      items.push(this.makeItem(
        'node-modules',
        `node_modules/ (${nmPaths.length} 个项目)`,
        'Node.js 项目依赖目录，包含 npm/yarn/pnpm 安装的所有依赖包',
        nmPaths,
        nmTotalSize,
        'conditional',
        '在项目目录运行 npm install / yarn / pnpm install 重新安装依赖'
      ))
    }

    return items
  }
}
