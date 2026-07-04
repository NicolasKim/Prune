import { homedir } from 'os'
import path from 'path'
import { BaseScanner } from '../base'
import type { CacheItem } from '../../shared/types'

export class RustCacheScanner extends BaseScanner {
  id = 'misc.rust'
  name = 'Rust 工具链缓存'
  description = 'Rust 工具链缓存（rustup 安装包、Cargo 注册表）'
  category = 'Misc'
  icon = '📦'

  async scan(): Promise<CacheItem[]> {
    const items: CacheItem[] = []
    const home = homedir()

    const rustupDir = path.join(home, '.rustup')
    const rustupSize = await this.getSize(rustupDir)
    if (rustupSize > 0) {
      items.push(this.makeItem(
        'rustup',
        'rustup 工具链',
        '已安装的 Rust 编译器工具链（stable/nightly）',
        [rustupDir],
        rustupSize,
        'conditional',
        'rustup toolchain install <toolchain> (或 rustup-init) 重新安装所需工具链'
      ))
    }

    const cargoRegistryDir = path.join(home, '.cargo', 'registry')
    const cargoSize = await this.getSize(cargoRegistryDir)
    if (cargoSize > 0) {
      items.push(this.makeItem(
        'cargo-registry',
        'Cargo 注册表缓存',
        '下载的 crate 源码和缓存',
        [cargoRegistryDir],
        cargoSize,
        'safe',
        'cargo build 自动重新下载'
      ))
    }

    return items
  }
}
