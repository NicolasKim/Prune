import { homedir } from 'os'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { BaseScanner } from '../base'
import type { CacheItem } from '../../shared/types'

const execAsync = promisify(exec)

export class NodeExtraCachesScanner extends BaseScanner {
  id = 'node.extra'
  name = 'Node.js 扩展缓存'
  description = '其他 Node.js 工具和框架的缓存文件'
  category = 'Node.js'
  icon = '🟢'

  async scan(): Promise<CacheItem[]> {
    const items: CacheItem[] = []
    const home = homedir()

    // Yarn cache
    const yarnCachePath = path.join(home, '.yarn', 'berry', 'cache')
    const yarnSize = await this.getSize(yarnCachePath)
    if (yarnSize > 0) {
      items.push(this.makeItem('yarn-cache', 'Yarn 缓存 (berry/cache)', 'Yarn Berry 包管理器下载缓存',
        [yarnCachePath], yarnSize, 'safe', '运行 yarn install 自动重建'))
    }

    // pnpm store
    const pnpmStorePath = path.join(home, 'Library', 'pnpm', 'store', 'v3')
    const pnpmSize = await this.getSize(pnpmStorePath)
    if (pnpmSize > 0) {
      items.push(this.makeItem('pnpm-store', 'pnpm 存储 (store/v3)', 'pnpm 包管理器全局存储',
        [pnpmStorePath], pnpmSize, 'safe', '运行 pnpm install 自动重建'))
    }

    // Next.js build directories
    const nextPaths = await this.findDirs('.next')
    if (nextPaths.length > 0) {
      let nextTotalSize = 0
      for (const p of nextPaths) {
        nextTotalSize += await this.getSize(p)
      }
      if (nextTotalSize > 0) {
        items.push(this.makeItem('next-build', `Next.js 构建缓存 (${nextPaths.length} 个项目)`,
          'Next.js 构建输出的 .next 目录，包含编译产物和缓存',
          nextPaths, nextTotalSize, 'conditional', '在每个项目目录运行 next build 重新构建'))
      }
    }

    // Nuxt build directories
    const nuxtPaths = await this.findDirs('.nuxt')
    if (nuxtPaths.length > 0) {
      let nuxtTotalSize = 0
      for (const p of nuxtPaths) {
        nuxtTotalSize += await this.getSize(p)
      }
      if (nuxtTotalSize > 0) {
        items.push(this.makeItem('nuxt-build', `Nuxt.js 构建缓存 (${nuxtPaths.length} 个项目)`,
          'Nuxt.js 构建输出的 .nuxt 目录，包含编译产物和缓存',
          nuxtPaths, nuxtTotalSize, 'conditional', '在每个项目目录运行 nuxt build 重新构建'))
      }
    }

    // Electron headers
    const electronGypPath = path.join(home, '.electron-gyp')
    const electronSize = await this.getSize(electronGypPath)
    if (electronSize > 0) {
      items.push(this.makeItem('electron-gyp', 'Electron 编译头文件', 'electron-rebuild 下载的 Node.js 头文件',
        [electronGypPath], electronSize, 'safe', '运行 npx electron-rebuild 自动重新下载'))
    }

    // node-gyp cache
    const nodeGypPath = path.join(home, '.cache', 'node-gyp')
    const nodeGypSize = await this.getSize(nodeGypPath)
    if (nodeGypSize > 0) {
      items.push(this.makeItem('node-gyp', 'node-gyp 编译缓存', 'node-gyp 编译原生模块时的缓存文件',
        [nodeGypPath], nodeGypSize, 'safe', '运行 node-gyp rebuild 自动重新下载'))
    }

    // Puppeteer cache
    const puppeteerPath = path.join(home, '.cache', 'puppeteer')
    const puppeteerSize = await this.getSize(puppeteerPath)
    if (puppeteerSize > 0) {
      items.push(this.makeItem('puppeteer', 'Puppeteer 浏览器缓存', 'Puppeteer 下载的 Chromium 浏览器',
        [puppeteerPath], puppeteerSize, 'safe', '运行 npx puppeteer browsers install 或运行 Puppeteer 脚本时自动重新下载'))
    }

    return items
  }

  private async findDirs(dirName: string): Promise<string[]> {
    const home = homedir()
    const searchPaths = [
      home,
      path.join(home, 'Documents'),
      path.join(home, 'Projects'),
      path.join(home, 'Desktop'),
      path.join(home, 'Sites'),
    ]
    try {
      const { stdout } = await execAsync(
        `find ${searchPaths.join(' ')} -maxdepth 5 -name '${dirName}' -type d 2>/dev/null`
      )
      return stdout.trim().split('\n').filter(Boolean)
    } catch {
      return []
    }
  }
}
