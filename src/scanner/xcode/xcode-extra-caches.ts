import { homedir } from 'os'
import path from 'path'
import { BaseScanner } from '../base'
import type { CacheItem } from '../../shared/types'

export class XcodeExtraCachesScanner extends BaseScanner {
  id = 'xcode.extra'
  name = 'Xcode Extra Caches'
  description = 'Xcode 模拟器、设备支持、归档及其他缓存'
  category = 'Xcode'
  icon = '📦'

  async scan(): Promise<CacheItem[]> {
    const items: CacheItem[] = []
    const home = homedir()

    const candidates: {
      id: string
      name: string
      description: string
      relativePath: string
      riskLevel: 'safe' | 'conditional' | 'caution'
      restoreGuide: string
    }[] = [
      {
        id: 'deviceSupport',
        name: 'iOS DeviceSupport',
        description: '旧 iOS 版本设备支持文件，连接当前设备调试时需要',
        relativePath: path.join('Library', 'Developer', 'Xcode', 'iOS DeviceSupport'),
        riskLevel: 'caution',
        restoreGuide: '连接对应 iOS 版本的设备后 Xcode 会自动重新下载'
      },
      {
        id: 'watchOSDeviceSupport',
        name: 'watchOS DeviceSupport',
        description: '旧 watchOS 版本设备支持文件',
        relativePath: path.join('Library', 'Developer', 'Xcode', 'watchOS DeviceSupport'),
        riskLevel: 'caution',
        restoreGuide: '连接对应 watchOS 版本的 Apple Watch 后 Xcode 会自动重新下载'
      },
      {
        id: 'tvOSDeviceSupport',
        name: 'tvOS DeviceSupport',
        description: '旧 tvOS 版本设备支持文件',
        relativePath: path.join('Library', 'Developer', 'Xcode', 'tvOS DeviceSupport'),
        riskLevel: 'caution',
        restoreGuide: '连接对应 tvOS 版本的 Apple TV 后 Xcode 会自动重新下载'
      },
      {
        id: 'visionOSDeviceSupport',
        name: 'visionOS DeviceSupport',
        description: '旧 visionOS 版本设备支持文件',
        relativePath: path.join('Library', 'Developer', 'Xcode', 'visionOS DeviceSupport'),
        riskLevel: 'caution',
        restoreGuide: '连接对应 visionOS 版本的 Apple Vision Pro 后 Xcode 会自动重新下载'
      },
      {
        id: 'simulators',
        name: 'CoreSimulator Devices',
        description: '模拟器运行时数据，删除后需重新下载对应版本',
        relativePath: path.join('Library', 'Developer', 'CoreSimulator', 'Devices'),
        riskLevel: 'caution',
        restoreGuide: '通过 Xcode > Settings > Platforms 重新下载模拟器运行时'
      },
      {
        id: 'archives',
        name: 'Archives',
        description: 'App Store 或 Export 归档包，已上传后可清理',
        relativePath: path.join('Library', 'Developer', 'Xcode', 'Archives'),
        riskLevel: 'caution',
        restoreGuide: '通过 Xcode > Window > Organizer 重新导出（需有源码）'
      },
      {
        id: 'spmCache',
        name: 'SPM Cache',
        description: 'Swift Package Manager 缓存，下次构建自动重下',
        relativePath: path.join('Library', 'Caches', 'org.swift.swiftpm'),
        riskLevel: 'safe',
        restoreGuide: '下次 Xcode 加载 SPM 依赖时自动重新下载'
      },
      {
        id: 'cocoapodsRepos',
        name: 'CocoaPods Repos',
        description: 'CocoaPods 仓库索引，pod repo update 可恢复',
        relativePath: path.join('.cocoapods', 'repos'),
        riskLevel: 'conditional',
        restoreGuide: '在包含 Podfile 的项目目录运行 pod install，自动重新克隆仓库'
      },
      {
        id: 'ibSupport',
        name: 'IB Support',
        description: 'Interface Builder 缓存，下次打开 Storyboard/XIB 自动生成',
        relativePath: path.join('Library', 'Developer', 'Xcode', 'UserData', 'IB Support'),
        riskLevel: 'safe',
        restoreGuide: '下次打开 Interface Builder 文件时自动重建'
      }
    ]

    for (const c of candidates) {
      const fullPath = path.join(home, c.relativePath)
      const size = await this.getSize(fullPath)
      if (size > 0) {
        items.push(
          this.makeItem(c.id, c.name, c.description, [fullPath], size, c.riskLevel, c.restoreGuide)
        )
      }
    }

    return items
  }
}
