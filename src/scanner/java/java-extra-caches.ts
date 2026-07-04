import { homedir } from 'os'
import path from 'path'
import fs from 'fs/promises'
import { BaseScanner } from '../base'
import type { CacheItem } from '../../shared/types'

export class JavaExtraCachesScanner extends BaseScanner {
  id = 'java.extra'
  name = 'Java/Android 额外缓存'
  description = 'Maven 仓库、Android Studio 缓存、SDK 系统镜像'
  category = 'Java/Android'
  icon = '☕'

  async scan(): Promise<CacheItem[]> {
    const items: CacheItem[] = []
    const home = homedir()

    // 1. Maven local repository
    const m2Dir = path.join(home, '.m2', 'repository')
    const m2Size = await this.getSize(m2Dir)
    if (m2Size > 0) {
      items.push(this.makeItem(
        'maven',
        'Maven 本地仓库',
        '下载的 Maven 依赖 JAR（重新构建时会自动下载）',
        [m2Dir],
        m2Size,
        'conditional',
        'mvn clean install 重新下载依赖'
      ))
    }

    // 2. Android Studio caches (~/Library/Caches/Google/AndroidStudio*)
    const studioCacheBase = path.join(home, 'Library', 'Caches', 'Google')
    try {
      const entries = await fs.readdir(studioCacheBase)
      const studioDirs = entries.filter(e => e.startsWith('AndroidStudio'))
      for (const dir of studioDirs) {
        const fullPath = path.join(studioCacheBase, dir)
        const size = await this.getSize(fullPath)
        if (size > 0) {
          items.push(this.makeItem(
            `studio-cache-${dir}`,
            `Android Studio 缓存 (${dir})`,
            'IDE 缓存，重启后自动重建',
            [fullPath],
            size,
            'safe',
            '重新启动 Android Studio 即可'
          ))
        }
      }
    } catch {
      // ~/Library/Caches/Google/ doesn't exist — skip
    }

    // 3. Android SDK system images
    const sysImgDir = path.join(home, 'Library', 'Android', 'sdk', 'system-images')
    const sysImgSize = await this.getSize(sysImgDir)
    if (sysImgSize > 0) {
      items.push(this.makeItem(
        'android-system-images',
        'Android SDK 系统镜像',
        '模拟器使用的系统镜像，重下较慢',
        [sysImgDir],
        sysImgSize,
        'caution',
        '通过 sdkmanager --list 查看可用镜像，然后运行 sdkmanager "system-images;<api>;<variant>;<arch>" 重新下载'
      ))
    }

    // 4. Android build cache
    const buildCacheDir = path.join(home, '.android', 'build-cache')
    const buildCacheSize = await this.getSize(buildCacheDir)
    if (buildCacheSize > 0) {
      items.push(this.makeItem(
        'android-build-cache',
        'Android 构建缓存',
        'Android 构建中间产物，下次构建重建',
        [buildCacheDir],
        buildCacheSize,
        'safe',
        '下次构建自动填充'
      ))
    }

    return items
  }
}
