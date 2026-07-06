import { homedir } from 'os'
import path from 'path'
import fs from 'fs/promises'
import { BaseScanner } from '../base'
import { getProjectRegistry } from '../scan-context'
import type { CacheItem } from '../../shared/types'

export class FlutterCacheScanner extends BaseScanner {
  id = 'misc.flutter'
  name = 'Flutter 缓存'
  description = 'Flutter 框架缓存、构建产物和 SDK 内部缓存'
  category = 'Flutter'
  icon = '💙'

  async scan(): Promise<CacheItem[]> {
    const items: CacheItem[] = []
    const home = homedir()
    const devDir = path.join(home, 'development')

    // 1. Flutter SDK 内部缓存 — 包含下载的 Dart SDK、引擎 artifacts、gradle-wrapper 等
    const sdkCachePaths = [
      path.join(devDir, 'flutter', 'bin', 'cache', 'dart-sdk'),
      path.join(devDir, 'flutter', 'bin', 'cache', 'artifacts'),
      path.join(devDir, 'flutter', 'bin', 'cache', 'engine'),
      path.join(devDir, 'flutter', 'bin', 'cache', 'gradle-wrapper'),
    ]
    let sdkTotalSize = 0
    const sdkExisting: string[] = []
    for (const p of sdkCachePaths) {
      const s = await this.getSize(p)
      if (s > 0) {
        sdkTotalSize += s
        sdkExisting.push(p)
      }
    }
    if (sdkExisting.length > 0) {
      items.push(this.makeItem(
        'sdk-cache',
        `Flutter SDK 内部缓存 (${sdkExisting.length} 项)`,
        'Flutter SDK 下载的 Dart SDK、引擎 artifacts 等，运行 flutter upgrade 可重建',
        sdkExisting,
        sdkTotalSize,
        'conditional',
        '运行 flutter upgrade 重新下载 SDK 组件'
      ))
    }

    // 2. Flutter SDK bin/cache 剩余部分（如 pkg、flutter_tools.snapshot 等）
    const flutterCacheDir = path.join(devDir, 'flutter', 'bin', 'cache')
    const flutterCacheSize = await this.getSize(flutterCacheDir)
    // 减去已经单独列出的子目录，避免重复计数
    const sdkExplicitTotal = sdkExisting.length > 0 ? sdkTotalSize : 0
    const remainingCacheSize = Math.max(0, flutterCacheSize - sdkExplicitTotal)
    const remainingCachePath = path.join(devDir, 'flutter', 'bin', 'cache', 'pkg')
    const remainingSize = await this.getSize(remainingCachePath)
    if (remainingSize > 0) {
      items.push(this.makeItem(
        'sdk-pkg-cache',
        'Flutter SDK 工具缓存',
        'Flutter 工具缓存的 .snapshot 和 pkg 文件',
        [remainingCachePath],
        remainingSize,
        'safe',
        'flutter 命令自动重建'
      ))
    }

    // 3. Pub 缓存
    const pubCachePath = path.join(home, '.pub-cache')
    pubCachePath // used
    const pubSize = await this.getSize(pubCachePath)
    if (pubSize > 0) {
      items.push(this.makeItem(
        'pub-cache',
        'Flutter/Dart Pub 包缓存',
        'Flutter 和 Dart 包管理器下载的依赖包',
        [pubCachePath],
        pubSize,
        'safe',
        'flutter pub get 重新下载'
      ))
    }

    // 4. FVM 版本缓存
    const fvmDir = path.join(home, 'fvm', 'versions')
    const fvmSize = await this.getSize(fvmDir)
    if (fvmSize > 0) {
      items.push(this.makeItem(
        'fvm-versions',
        'FVM Flutter SDK 版本',
        'FVM 管理的多个 Flutter SDK 版本，每个版本含完整引擎和 Dart SDK',
        [fvmDir],
        fvmSize,
        'caution',
        'fvm install <version> 重新下载'
      ))
    }

    // 5. Flutter 项目构建产物 — 按项目汇总
    const projectDirs = getProjectRegistry().getByStack('flutter')
    if (projectDirs.length > 0) {
      // build/ 目录
      let buildCount = 0
      let buildTotalSize = 0
      const buildPaths: string[] = []
      for (const proj of projectDirs) {
        const buildDir = path.join(proj, 'build')
        const s = await this.getSize(buildDir)
        if (s > 0) {
          buildTotalSize += s
          buildPaths.push(buildDir)
          buildCount++
        }
      }
      if (buildTotalSize > 0) {
        items.push(this.makeItem(
          'project-build',
          `Flutter 项目构建产物 (${buildCount} 个项目)`,
          'Flutter 项目的 build/ 目录，包含 Android/iOS/web 编译输出',
          buildPaths,
          buildTotalSize,
          'conditional',
          '在每个项目目录运行 flutter build 重新构建'
        ))
      }

      // .dart_tool/ 目录
      let dtCount = 0
      let dtTotalSize = 0
      const dtPaths: string[] = []
      for (const proj of projectDirs) {
        const dtDir = path.join(proj, '.dart_tool')
        const s = await this.getSize(dtDir)
        if (s > 0) {
          dtTotalSize += s
          dtPaths.push(dtDir)
          dtCount++
        }
      }
      if (dtTotalSize > 0) {
        items.push(this.makeItem(
          'project-dart-tool',
          `Flutter 项目 Dart 工具缓存 (${dtCount} 个项目)`,
          '项目的 .dart_tool/ 目录，包含包解析缓存和代码生成缓存',
          dtPaths,
          dtTotalSize,
          'safe',
          'flutter pub get 或 dart run build_runner 自动重建'
        ))
      }
    }

    // 6. iOS CocoaPods 缓存（Flutter 项目相关）
    const iosPodCacheDir = path.join(home, 'Library', 'Caches', 'CocoaPods')
    const iosPodSize = await this.getSize(iosPodCacheDir)
    if (iosPodSize > 0) {
      items.push(this.makeItem(
        'cocoapods-cache',
        'CocoaPods 缓存',
        'iOS/macOS CocoaPods 依赖缓存，Flutter iOS 构建使用',
        [iosPodCacheDir],
        iosPodSize,
        'safe',
        'pod install 重新下载 CocoaPods 依赖缓存'
      ))
    }

    // 7. Flutter 项目 android/.gradle/ 和 ios/Pods/
    if (projectDirs.length > 0) {
      // android/.gradle/
      let agCount = 0
      let agTotalSize = 0
      const agPaths: string[] = []
      for (const proj of projectDirs) {
        const agDir = path.join(proj, 'android', '.gradle')
        const s = await this.getSize(agDir)
        if (s > 0) {
          agTotalSize += s
          agPaths.push(agDir)
          agCount++
        }
      }
      if (agTotalSize > 0) {
        items.push(this.makeItem(
          'project-android-gradle',
          `Flutter 项目 Android Gradle 缓存 (${agCount} 个项目)`,
          'Flutter 项目 android/.gradle/ 目录',
          agPaths,
          agTotalSize,
          'safe',
          'cd android && ./gradlew build 自动重建'
        ))
      }

      // ios/Pods/
      let podsCount = 0
      let podsTotalSize = 0
      const podsPaths: string[] = []
      for (const proj of projectDirs) {
        const podsDir = path.join(proj, 'ios', 'Pods')
        const s = await this.getSize(podsDir)
        if (s > 0) {
          podsTotalSize += s
          podsPaths.push(podsDir)
          podsCount++
        }
      }
      if (podsTotalSize > 0) {
        items.push(this.makeItem(
          'project-ios-pods',
          `Flutter 项目 iOS Pods (${podsCount} 个项目)`,
          'Flutter 项目 ios/Pods/ 目录，CocoaPods 安装的依赖',
          podsPaths,
          podsTotalSize,
          'conditional',
          'cd ios && pod install 重新安装'
        ))
      }
    }

    return items
  }
}
