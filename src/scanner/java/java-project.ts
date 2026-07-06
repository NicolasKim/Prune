import path from 'path'
import { BaseScanner } from '../base'
import { getProjectRegistry } from '../scan-context'
import type { CacheItem } from '../../shared/types'

export class JavaProjectScanner extends BaseScanner {
  id = 'java.project'
  name = 'Java 项目缓存'
  description = 'Java/Gradle 项目下的 .gradle/ 和 build/ 目录'
  category = 'Java/Android'
  icon = '🟤'

  async scan(): Promise<CacheItem[]> {
    const items: CacheItem[] = []

    const allProjects = getProjectRegistry().getByStack('java')

    if (allProjects.length === 0) return items

    // .gradle/ directory (project-level, different from ~/.gradle/)
    const gradlePaths: string[] = []
    let gradleTotalSize = 0
    for (const proj of allProjects) {
      const gradleDir = path.join(proj, '.gradle')
      const s = await this.getSize(gradleDir)
      if (s > 0) {
        gradleTotalSize += s
        gradlePaths.push(gradleDir)
      }
    }
    if (gradleTotalSize > 0) {
      items.push(this.makeItem(
        'project-gradle',
        `.gradle/ (${gradlePaths.length} 个项目)`,
        'Gradle 项目级缓存，包含 task 输出和 wrapper 缓存',
        gradlePaths,
        gradleTotalSize,
        'safe',
        '在项目目录运行 ./gradlew build 自动重建'
      ))
    }

    // build/ directory
    const buildPaths: string[] = []
    let buildTotalSize = 0
    for (const proj of allProjects) {
      const buildDir = path.join(proj, 'build')
      const s = await this.getSize(buildDir)
      if (s > 0) {
        buildTotalSize += s
        buildPaths.push(buildDir)
      }
    }
    if (buildTotalSize > 0) {
      items.push(this.makeItem(
        'project-build',
        `build/ (${buildPaths.length} 个项目)`,
        'Gradle/Maven 项目构建输出，包含 .class 文件和打包产物',
        buildPaths,
        buildTotalSize,
        'safe',
        '在项目目录运行 ./gradlew build / mvn package 重新构建'
      ))
    }

    return items
  }
}
