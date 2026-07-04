import { homedir } from 'os'
import path from 'path'
import fs from 'fs/promises'
import { BaseScanner } from '../base'
import type { CacheItem } from '../../shared/types'

export class IdeCachesScanner extends BaseScanner {
  id = 'ide.caches'
  name = 'IDE 缓存'
  description = '编辑器与 IDE 的用户缓存、工作区存储与日志'
  category = 'IDE'
  icon = '💻'

  async scan(): Promise<CacheItem[]> {
    const items: CacheItem[] = []
    const home = homedir()

    // 1. Cursor Cache
    const cursorCache = path.join(home, 'Library', 'Application Support', 'Cursor', 'Cache')
    const cursorCacheSize = await this.getSize(cursorCache)
    if (cursorCacheSize > 0) {
      items.push(this.makeItem(
        'cursor-cache',
        'Cursor 缓存',
        'Cursor 编辑器本地缓存文件',
        [cursorCache],
        cursorCacheSize,
        'safe',
        'Cursor 会自动重新生成缓存'
      ))
    }

    // 2. Coder/Cursor workspace storage — conditional: workspace state
    const cursorWs = path.join(home, 'Library', 'Application Support', 'Cursor', 'User', 'workspaceStorage')
    const cursorWsSize = await this.getSize(cursorWs)
    if (cursorWsSize > 0) {
      items.push(this.makeItem(
        'cursor-workspace-storage',
        'Cursor 工作区存储',
        'Cursor 工作区状态数据，清理后需重新登录或恢复工作区布局',
        [cursorWs],
        cursorWsSize,
        'conditional',
        'Cursor 会重新创建空目录，但登录会话、工作区布局需要手动恢复'
      ))
    }

    // 3. JetBrains caches — list each subdirectory individually
    const jbCacheDir = path.join(home, 'Library', 'Caches', 'JetBrains')
    const jbCacheEntries = await this.listSubdirs(jbCacheDir)
    for (const dir of jbCacheEntries) {
      const fullPath = path.join(jbCacheDir, dir)
      const size = await this.getSize(fullPath)
      if (size > 0) {
        items.push(this.makeItem(
          `jb-cache-${dir}`,
          `${dir} 缓存`,
          `JetBrains ${dir} IDE 的本地缓存数据`,
          [fullPath],
          size,
          'safe',
          '相应 IDE 会自动重建缓存'
        ))
      }
    }

    // 4. JetBrains logs — list each subdirectory individually
    const jbLogDir = path.join(home, 'Library', 'Logs', 'JetBrains')
    const jbLogEntries = await this.listSubdirs(jbLogDir)
    for (const dir of jbLogEntries) {
      const fullPath = path.join(jbLogDir, dir)
      const size = await this.getSize(fullPath)
      if (size > 0) {
        items.push(this.makeItem(
          `jb-log-${dir}`,
          `${dir} 日志`,
          `JetBrains ${dir} IDE 的运行日志`,
          [fullPath],
          size,
          'safe',
          '相应 IDE 运行时会自动生成新日志'
        ))
      }
    }

    // 5. VS Code workspace storage — conditional: workspace state
    const vscodeWs = path.join(home, 'Library', 'Application Support', 'Code', 'User', 'workspaceStorage')
    const vscodeWsSize = await this.getSize(vscodeWs)
    if (vscodeWsSize > 0) {
      items.push(this.makeItem(
        'vscode-workspace-storage',
        'VS Code 工作区存储',
        'VS Code 工作区状态数据，清理后需重新登录或恢复工作区布局',
        [vscodeWs],
        vscodeWsSize,
        'conditional',
        'VS Code 会重新创建空目录，但登录会话、工作区布局需要手动恢复'
      ))
    }

    // 6. VS Code cached extensions (VSIX)
    const vscodeVsix = path.join(home, 'Library', 'Application Support', 'Code', 'CachedExtensionVSIXs')
    const vscodeVsixSize = await this.getSize(vscodeVsix)
    if (vscodeVsixSize > 0) {
      items.push(this.makeItem(
        'vscode-cached-extensions',
        'VS Code 扩展安装包缓存',
        '已下载的 .vsix 扩展安装包缓存',
        [vscodeVsix],
        vscodeVsixSize,
        'safe',
        'VS Code 会在安装或更新扩展时重新下载'
      ))
    }

    // 7. VS Code Cache
    const vscodeCache = path.join(home, 'Library', 'Application Support', 'Code', 'Cache')
    const vscodeCacheSize = await this.getSize(vscodeCache)
    if (vscodeCacheSize > 0) {
      items.push(this.makeItem(
        'vscode-cache',
        'VS Code 缓存',
        'VS Code 编辑器本地缓存文件',
        [vscodeCache],
        vscodeCacheSize,
        'safe',
        'VS Code 会自动重新生成缓存'
      ))
    }

    return items
  }

  private async listSubdirs(dirPath: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      return entries.filter(e => e.isDirectory()).map(e => e.name)
    } catch {
      return []
    }
  }
}
