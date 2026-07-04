import { homedir } from 'os'
import path from 'path'
import { BaseScanner } from '../base'
import type { CacheItem } from '../../shared/types'

export class DockerCacheScanner extends BaseScanner {
  id = 'docker.cache'
  name = 'Docker 缓存'
  description = 'Docker 构建缓存、日志和虚拟机镜像'
  category = 'Docker'
  icon = '🐳'

  async scan(): Promise<CacheItem[]> {
    const items: CacheItem[] = []
    const home = homedir()

    // Buildx cache
    const buildxDir = path.join(home, '.docker', 'buildx')
    const buildxSize = await this.getSize(buildxDir)
    if (buildxSize > 0) {
      items.push(this.makeItem(
        'buildx',
        'Buildx 构建缓存',
        'Docker Buildx 构建器缓存（中间层镜像）',
        [buildxDir],
        buildxSize,
        'safe',
        '下次 docker buildx build 构建时自动重建缓存层（构建速度会暂时变慢）'
      ))
    }

    // Docker Scout SBOM cache
    const scoutDir = path.join(home, '.docker', 'scout', 'sbom')
    const scoutSize = await this.getSize(scoutDir)
    if (scoutSize > 0) {
      items.push(this.makeItem(
        'scout-sbom',
        'Docker Scout SBOM 缓存',
        'Docker Scout SBOM 扫描缓存数据',
        [scoutDir],
        scoutSize,
        'safe',
        '下次 docker scout 扫描自动重建'
      ))
    }

    // Colima VM
    const colimaDir = path.join(home, '.colima')
    const colimaSize = await this.getSize(colimaDir)
    if (colimaSize > 0) {
      items.push(this.makeItem(
        'colima-vm',
        'Colima VM 镜像',
        'Colima 虚拟机磁盘镜像和配置（删除后需重新创建 VM）',
        [colimaDir],
        colimaSize,
        'caution',
        'colima start 重新创建 VM'
      ))
    }

    // Docker Desktop logs
    const logsDir = path.join(home, 'Library', 'Containers', 'com.docker.docker', 'Data', 'logs')
    const logsSize = await this.getSize(logsDir)
    if (logsSize > 0) {
      items.push(this.makeItem(
        'desktop-logs',
        'Docker Desktop 日志',
        'Docker Desktop 应用运行时日志',
        [logsDir],
        logsSize,
        'safe',
        '重启 Docker Desktop 自动生成新日志'
      ))
    }

    return items
  }
}
