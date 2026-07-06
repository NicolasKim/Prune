import fs from 'fs/promises'
import path from 'path'
import type { TechStackScanner, CacheItem, RiskLevel } from '../shared/types'

export abstract class BaseScanner implements TechStackScanner {
  abstract id: string
  abstract name: string
  abstract description: string
  abstract category: string
  icon: string = '📁'

  abstract scan(): Promise<CacheItem[]>

  protected async pathExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  protected async getSize(filePath: string): Promise<number> {
    try {
      const stat = await fs.stat(filePath)
      if (stat.isDirectory()) {
        return await this.getDirSize(filePath)
      }
      return stat.size
    } catch {
      return 0
    }
  }

  private async getDirSize(dirPath: string): Promise<number> {
    let total = 0
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)
        if (entry.isDirectory()) {
          total += await this.getDirSize(fullPath)
        } else if (entry.isFile()) {
          total += (await fs.stat(fullPath)).size
        }
      }
    } catch {
      // permission denied or path not found — skip
    }
    return total
  }

  protected makeItem(
    id: string,
    name: string,
    description: string,
    paths: string[],
    sizeBytes: number,
    riskLevel: RiskLevel,
    restoreGuide: string
  ): CacheItem {
    return {
      id: `${this.id}.${id}`,
      scannerId: this.id,
      name,
      description,
      paths,
      sizeBytes,
      riskLevel,
      restoreGuide,
    }
  }
}
