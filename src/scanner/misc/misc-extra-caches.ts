import { homedir } from 'os'
import path from 'path'
import { BaseScanner } from '../base'
import type { CacheItem } from '../../shared/types'

export class MiscExtraCachesScanner extends BaseScanner {
  id = 'misc.extra'
  name = 'Misc 缓存'
  description = 'Ruby, Deno, Elixir 等语言/工具缓存'
  category = 'Misc'
  icon = '📦'

  async scan(): Promise<CacheItem[]> {
    const items: CacheItem[] = []
    const home = homedir()

    // Ruby gems
    const gemDir = path.join(home, '.gem')
    const gemSize = await this.getSize(gemDir)
    if (gemSize > 0) {
      items.push(this.makeItem(
        'ruby-gems',
        'Ruby Gems 缓存',
        '已安装的 Ruby gem 包',
        [gemDir],
        gemSize,
        'caution',
        'gem install <name> 重新安装各 gem，或 bundle install 恢复项目依赖'
      ))
    }

    // Dart cache
    const dartDir = path.join(home, '.dart')
    const dartSize = await this.getSize(dartDir)
    if (dartSize > 0) {
      items.push(this.makeItem(
        'dart',
        'Dart 缓存',
        'Dart 工具缓存文件',
        [dartDir],
        dartSize,
        'safe',
        'dart pub cache repair 或自动重建'
      ))
    }

    // Deno cache
    const denoDir = path.join(home, '.cache', 'deno')
    const denoSize = await this.getSize(denoDir)
    if (denoSize > 0) {
      items.push(this.makeItem(
        'deno',
        'Deno 缓存',
        'Deno 运行时缓存的远程模块和编译产物',
        [denoDir],
        denoSize,
        'safe',
        'deno cache --reload 重新下载'
      ))
    }

    // Elixir / OTP — mix
    const mixDir = path.join(home, '.mix')
    const mixSize = await this.getSize(mixDir)
    if (mixSize > 0) {
      items.push(this.makeItem(
        'elixir-mix',
        'Elixir Mix 缓存',
        'Mix 包管理器下载的依赖',
        [mixDir],
        mixSize,
        'safe',
        'mix deps.get 重新下载依赖'
      ))
    }

    // Elixir / OTP — hex cache
    const hexDir = path.join(home, 'Library', 'Caches', 'hex')
    const hexSize = await this.getSize(hexDir)
    if (hexSize > 0) {
      items.push(this.makeItem(
        'elixir-hex',
        'Elixir Hex 包缓存',
        'Hex 包管理器本地缓存',
        [hexDir],
        hexSize,
        'safe',
        'mix deps.get 重新获取'
      ))
    }

    // Bun cache
    const bunDir = path.join(home, '.bun', 'install', 'cache')
    const bunSize = await this.getSize(bunDir)
    if (bunSize > 0) {
      items.push(this.makeItem(
        'bun',
        'Bun 缓存',
        'Bun 包管理器的安装缓存',
        [bunDir],
        bunSize,
        'safe',
        'bun install 重新下载'
      ))
    }

    // Swift package manager cache
    const swiftPmDir = path.join(home, 'Library', 'Caches', 'org.swift.swiftpm')
    const swiftPmSize = await this.getSize(swiftPmDir)
    if (swiftPmSize > 0) {
      items.push(this.makeItem(
        'swift-pm',
        'Swift Package Manager 缓存',
        'SPM 下载的依赖和编译缓存（可能与 Xcode 共享）',
        [swiftPmDir],
        swiftPmSize,
        'safe',
        'Xcode 或 swift build 自动重建'
      ))
    }

    // Ollama models
    const ollamaDir = path.join(home, '.ollama', 'models')
    const ollamaSize = await this.getSize(ollamaDir)
    if (ollamaSize > 0) {
      items.push(this.makeItem(
        'ollama-models',
        'Ollama 模型',
        '本地下载的 LLM 模型文件，单个模型几 GB 到几十 GB',
        [ollamaDir],
        ollamaSize,
        'caution',
        'ollama pull <model> 重新下载所需模型'
      ))
    }

    // Terraform plugin cache
    const terraformDir = path.join(home, '.terraform.d', 'plugins')
    const terraformSize = await this.getSize(terraformDir)
    if (terraformSize > 0) {
      items.push(this.makeItem(
        'terraform-plugins',
        'Terraform 插件缓存',
        'Terraform provider 插件二进制，terraform init 自动重下',
        [terraformDir],
        terraformSize,
        'safe',
        'terraform init 重新下载 provider 插件'
      ))
    }

    return items
  }
}
