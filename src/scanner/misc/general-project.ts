import { BaseScanner } from '../base'
import { getNamedDirectories } from '../scan-context'
import type { CacheItem } from '../../shared/types'

export class GeneralProjectScanner extends BaseScanner {
  id = 'misc.general-project'
  name = '通用项目缓存'
  description = '跨技术栈的项目构建产物和工具缓存（dist/coverage/.parcel-cache/.turbo）'
  category = 'Misc'
  icon = '🗂️'

  async scan(): Promise<CacheItem[]> {
    const items: CacheItem[] = []

    const distDirs = getNamedDirectories('dist')
    if (distDirs.length > 0) {
      let totalSize = 0
      for (const dir of distDirs) {
        totalSize += await this.getSize(dir)
      }
      if (totalSize > 0) {
        items.push(this.makeItem(
          'dist',
          `dist/ (${distDirs.length} 个项目)`,
          '项目构建输出目录，包含打包后的静态文件或 bundle',
          distDirs,
          totalSize,
          'conditional',
          '用对应构建工具重新 build'
        ))
      }
    }

    const coverageDirs = getNamedDirectories('coverage')
    if (coverageDirs.length > 0) {
      let totalSize = 0
      for (const dir of coverageDirs) {
        totalSize += await this.getSize(dir)
      }
      if (totalSize > 0) {
        items.push(this.makeItem(
          'coverage',
          `coverage/ (${coverageDirs.length} 个项目)`,
          '测试覆盖率报告目录',
          coverageDirs,
          totalSize,
          'safe',
          '重跑测试覆盖率工具'
        ))
      }
    }

    const parcelDirs = getNamedDirectories('.parcel-cache')
    if (parcelDirs.length > 0) {
      let totalSize = 0
      for (const dir of parcelDirs) {
        totalSize += await this.getSize(dir)
      }
      if (totalSize > 0) {
        items.push(this.makeItem(
          'parcel-cache',
          `.parcel-cache/ (${parcelDirs.length} 个项目)`,
          'Parcel 打包器缓存',
          parcelDirs,
          totalSize,
          'safe',
          '下次 Parcel build 自动重建'
        ))
      }
    }

    const turboDirs = getNamedDirectories('.turbo')
    if (turboDirs.length > 0) {
      let totalSize = 0
      for (const dir of turboDirs) {
        totalSize += await this.getSize(dir)
      }
      if (totalSize > 0) {
        items.push(this.makeItem(
          'turbo',
          `.turbo/ (${turboDirs.length} 个项目)`,
          'Turborepo 缓存目录',
          turboDirs,
          totalSize,
          'safe',
          '下次 Turbo 命令自动重建'
        ))
      }
    }

    return items
  }
}
