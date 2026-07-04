import { homedir } from 'os'
import path from 'path'
import { BaseScanner } from '../base'
import type { CacheItem } from '../../shared/types'

export class GradleCacheScanner extends BaseScanner {
  id = 'java.gradle'
  name = 'Gradle 缓存'
  description = 'Gradle 构建工具缓存（依赖、Wrapper、Daemon 日志、JDK）'
  category = 'Java/Android'
  icon = '🟤'

  async scan(): Promise<CacheItem[]> {
    const items: CacheItem[] = []
    const gradleDir = path.join(homedir(), '.gradle')

    const cacheDir = path.join(gradleDir, 'caches')
    const cacheSize = await this.getSize(cacheDir)
    if (cacheSize > 0) {
      items.push(this.makeItem(
        'gradle-caches',
        'Gradle 依赖缓存 (caches)',
        '下载的依赖 JAR、编译产物、构建缓存',
        [cacheDir],
        cacheSize,
        'safe',
        './gradlew build 自动重建依赖'
      ))
    }

    const wrapperDir = path.join(gradleDir, 'wrapper', 'dists')
    const wrapperSize = await this.getSize(wrapperDir)
    if (wrapperSize > 0) {
      items.push(this.makeItem(
        'gradle-wrapper',
        'Gradle Wrapper 发行版',
        '各版本的 Gradle 二进制发行版缓存',
        [wrapperDir],
        wrapperSize,
        'safe',
        './gradlew 自动下载所需版本'
      ))
    }

    const daemonDir = path.join(gradleDir, 'daemon')
    const daemonSize = await this.getSize(daemonDir)
    if (daemonSize > 0) {
      items.push(this.makeItem(
        'gradle-daemon',
        'Gradle Daemon 日志',
        'Gradle 守护进程的输出日志，纯诊断信息',
        [daemonDir],
        daemonSize,
        'safe',
        '下次 ./gradlew 自动重建'
      ))
    }

    return items
  }
}
