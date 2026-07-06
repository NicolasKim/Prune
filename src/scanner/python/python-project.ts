import path from 'path'
import { BaseScanner } from '../base'
import { getNamedDirectories, getProjectRegistry } from '../scan-context'
import type { CacheItem } from '../../shared/types'

export class PythonProjectScanner extends BaseScanner {
  id = 'python.project'
  name = 'Python 项目缓存'
  description = 'Python 项目下的虚拟环境和工具缓存目录'
  category = 'Python'
  icon = '🐍'

  async scan(): Promise<CacheItem[]> {
    const items: CacheItem[] = []

    const venvDirs = new Set<string>([
      ...getNamedDirectories('.venv'),
      ...getNamedDirectories('venv'),
    ])
    for (const proj of getProjectRegistry().getByStack('python')) {
      for (const dirName of ['.venv', 'venv'] as const) {
        const venvDir = path.join(proj, dirName)
        if (await this.pathExists(venvDir)) {
          venvDirs.add(venvDir)
        }
      }
    }

    const uniqueVenv = [...venvDirs]
    if (uniqueVenv.length > 0) {
      let venvTotalSize = 0
      for (const dir of uniqueVenv) {
        venvTotalSize += await this.getSize(dir)
      }
      if (venvTotalSize > 0) {
        items.push(this.makeItem(
          'venv',
          `虚拟环境 (${uniqueVenv.length} 个项目)`,
          'Python 虚拟环境目录，包含 pip 安装的所有依赖包',
          uniqueVenv,
          venvTotalSize,
          'caution',
          '重新创建虚拟环境: python -m venv .venv && pip install -r requirements.txt'
        ))
      }
    }

    const pytestDirs = getNamedDirectories('.pytest_cache')
    if (pytestDirs.length > 0) {
      let totalSize = 0
      for (const dir of pytestDirs) {
        totalSize += await this.getSize(dir)
      }
      if (totalSize > 0) {
        items.push(this.makeItem(
          'pytest-cache',
          `.pytest_cache/ (${pytestDirs.length} 个项目)`,
          'pytest 测试缓存，包含上次测试失败记录',
          pytestDirs,
          totalSize,
          'safe',
          '下次运行 pytest 自动重建'
        ))
      }
    }

    const mypyDirs = getNamedDirectories('.mypy_cache')
    if (mypyDirs.length > 0) {
      let totalSize = 0
      for (const dir of mypyDirs) {
        totalSize += await this.getSize(dir)
      }
      if (totalSize > 0) {
        items.push(this.makeItem(
          'mypy-cache',
          `.mypy_cache/ (${mypyDirs.length} 个项目)`,
          'mypy 类型检查缓存',
          mypyDirs,
          totalSize,
          'safe',
          '下次运行 mypy 自动重建'
        ))
      }
    }

    const ruffDirs = getNamedDirectories('.ruff_cache')
    if (ruffDirs.length > 0) {
      let totalSize = 0
      for (const dir of ruffDirs) {
        totalSize += await this.getSize(dir)
      }
      if (totalSize > 0) {
        items.push(this.makeItem(
          'ruff-cache',
          `.ruff_cache/ (${ruffDirs.length} 个项目)`,
          'Ruff linter 缓存',
          ruffDirs,
          totalSize,
          'safe',
          '下次运行 ruff 自动重建'
        ))
      }
    }

    const toxDirs = getNamedDirectories('.tox')
    if (toxDirs.length > 0) {
      let totalSize = 0
      for (const dir of toxDirs) {
        totalSize += await this.getSize(dir)
      }
      if (totalSize > 0) {
        items.push(this.makeItem(
          'tox',
          `.tox/ (${toxDirs.length} 个项目)`,
          'Tox 测试环境目录，包含隔离的测试虚拟环境',
          toxDirs,
          totalSize,
          'conditional',
          '运行 tox -r 重建测试环境'
        ))
      }
    }

    return items
  }
}
