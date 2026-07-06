import { homedir } from 'os'
import path from 'path'
import { BaseScanner } from '../base'
import { getNamedDirectories } from '../scan-context'
import type { CacheItem } from '../../shared/types'

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
    const nextPaths = getNamedDirectories('.next')
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
    const nuxtPaths = getNamedDirectories('.nuxt')
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

    // Playwright browser cache
    const playwrightPath = path.join(home, '.cache', 'ms-playwright')
    const playwrightSize = await this.getSize(playwrightPath)
    if (playwrightSize > 0) {
      items.push(this.makeItem('playwright', 'Playwright 浏览器缓存', 'Playwright 下载的 Chromium/Firefox/WebKit 浏览器',
        [playwrightPath], playwrightSize, 'safe', 'npx playwright install 重新下载'))
    }

    // Cypress binary cache
    const cypressPath = path.join(home, '.cache', 'Cypress')
    const cypressSize = await this.getSize(cypressPath)
    if (cypressSize > 0) {
      items.push(this.makeItem('cypress', 'Cypress 浏览器缓存', 'Cypress 下载的测试浏览器二进制包',
        [cypressPath], cypressSize, 'safe', 'npx cypress install 重新下载'))
    }

    // Yarn Classic cache (~/.cache/yarn, Yarn 1.x)
    const yarnClassicPath = path.join(home, '.cache', 'yarn')
    const yarnClassicSize = await this.getSize(yarnClassicPath)
    if (yarnClassicSize > 0) {
      items.push(this.makeItem('yarn-classic-cache', 'Yarn Classic 缓存', 'Yarn 1.x 包管理器下载缓存',
        [yarnClassicPath], yarnClassicSize, 'safe', '运行 yarn install 自动重建'))
    }

    // Vite project caches
    const vitePaths = getNamedDirectories('.vite')
    if (vitePaths.length > 0) {
      let viteTotalSize = 0
      for (const p of vitePaths) {
        viteTotalSize += await this.getSize(p)
      }
      if (viteTotalSize > 0) {
        items.push(this.makeItem('vite-cache', `Vite 缓存 (${vitePaths.length} 个项目)`,
          'Vite 开发服务器缓存的依赖预构建产物',
          vitePaths, viteTotalSize, 'safe', '下次 vite dev / vite build 自动重建'))
      }
    }

    // Angular build cache
    const angularPaths = getNamedDirectories('.angular')
    if (angularPaths.length > 0) {
      let angularTotalSize = 0
      for (const p of angularPaths) {
        angularTotalSize += await this.getSize(p)
      }
      if (angularTotalSize > 0) {
        items.push(this.makeItem('angular-cache', `Angular 构建缓存 (${angularPaths.length} 个项目)`,
          'Angular CLI 构建缓存',
          angularPaths, angularTotalSize, 'safe', '下次 ng build / ng serve 自动重建'))
      }
    }

    return items
  }
}
