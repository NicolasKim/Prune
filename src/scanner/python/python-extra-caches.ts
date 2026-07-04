import { homedir } from 'os'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { BaseScanner } from '../base'
import type { CacheItem } from '../../shared/types'

const execAsync = promisify(exec)

export class PythonExtraCachesScanner extends BaseScanner {
  id = 'python.extra'
  name = 'Python 附加缓存'
  description = 'Conda、HuggingFace、PyTorch、pyenv、__pycache__ 等缓存'
  category = 'Python'
  icon = '🐍'

  async scan(): Promise<CacheItem[]> {
    const items: CacheItem[] = []
    const home = homedir()

    // 1. Conda pkgs
    const condaPaths = ['/opt/homebrew/anaconda3/pkgs', path.join(home, 'opt', 'anaconda3', 'pkgs')]
    for (const condaPkgPath of condaPaths) {
      const size = await this.getSize(condaPkgPath)
      if (size > 0) {
        items.push(this.makeItem('conda-pkgs', 'Conda 包缓存', 'Conda 下载的已安装包存档',
          [condaPkgPath], size, 'conditional', '重新创建 Conda 环境时自动重新下载'))
      }
    }

    // 2. HuggingFace hub
    const hfPath = path.join(home, '.cache', 'huggingface', 'hub')
    const hfSize = await this.getSize(hfPath)
    if (hfSize > 0) {
      items.push(this.makeItem('huggingface-hub', 'HuggingFace Hub 缓存', '从 HuggingFace 下载的模型和数据集缓存',
        [hfPath], hfSize, 'safe', '模型会在使用时重新下载'))
    }

    // 3. PyTorch cache
    const torchPath = path.join(home, '.cache', 'torch')
    const torchSize = await this.getSize(torchPath)
    if (torchSize > 0) {
      items.push(this.makeItem('torch-cache', 'PyTorch 缓存', 'PyTorch 预训练模型和缓存数据',
        [torchPath], torchSize, 'safe', '会在使用 PyTorch 时自动重新下载'))
    }

    // 4. pyenv versions
    const pyenvPath = path.join(home, '.pyenv', 'versions')
    const pyenvSize = await this.getSize(pyenvPath)
    if (pyenvSize > 0) {
      items.push(this.makeItem('pyenv-versions', 'pyenv Python 版本', 'pyenv 管理的旧 Python 版本',
        [pyenvPath], pyenvSize, 'caution', '需要手动重新安装旧版本 Python'))
    }

    // 5. __pycache__ directories
    try {
      const { stdout } = await execAsync('find ' + home + ' -maxdepth 4 -name __pycache__ -type d 2>/dev/null')
      const pycacheDirs = stdout.trim().split('\n').filter(Boolean)
      if (pycacheDirs.length > 0) {
        let totalPycacheSize = 0
        for (const dir of pycacheDirs) {
          totalPycacheSize += await this.getSize(dir)
        }
        if (totalPycacheSize > 0) {
          items.push(this.makeItem('pycache', '__pycache__ 目录', 'Python 字节码缓存文件',
            pycacheDirs, totalPycacheSize, 'safe', '会在运行 Python 代码时自动重建'))
        }
      }
    } catch {
      // find failed — skip
    }

    // 6. Jupyter runtime
    const jupyterPath = path.join(home, 'Library', 'Jupyter', 'runtime')
    const jupyterSize = await this.getSize(jupyterPath)
    if (jupyterSize > 0) {
      items.push(this.makeItem('jupyter-runtime', 'Jupyter 运行时缓存', 'Jupyter notebook 运行时临时文件',
        [jupyterPath], jupyterSize, 'safe', '会在启动 Jupyter 时自动重新创建'))
    }

    // 7. IPython history
    const ipythonPath = path.join(home, '.ipython')
    const ipythonSize = await this.getSize(ipythonPath)
    if (ipythonSize > 0) {
      items.push(this.makeItem('ipython-history', 'IPython 历史记录', 'IPython shell 命令历史',
        [ipythonPath], ipythonSize, 'safe', '历史记录会丢失，但功能不受影响'))
    }

    return items
  }
}
