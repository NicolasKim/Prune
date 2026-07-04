import { homedir } from 'os'
import path from 'path'
import fs from 'fs/promises'
import { exec } from 'child_process'
import { promisify } from 'util'
import { BaseScanner } from '../base'
import type { CacheItem } from '../../shared/types'

const execAsync = promisify(exec)

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
    const projectDirs = await this.findFlutterProjects()
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

    return items
  }

  private async findFlutterProjects(): Promise<string[]> {
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
        `find ${searchPaths.join(' ')} -maxdepth 5 -name 'pubspec.yaml' -type f 2>/dev/null`
      )
      const files = stdout.trim().split('\n').filter(Boolean)
      const dirs = new Set<string>()
      for (const f of files) {
        const parent = path.dirname(f)
        // 跳过 .pub-cache 和 fvm 内部的 pubspec.yaml
        if (parent.includes('.pub-cache') || parent.includes('fvm')) continue
        dirs.add(parent)
      }
      return Array.from(dirs)
    } catch {
      return []
    }
  }
}
