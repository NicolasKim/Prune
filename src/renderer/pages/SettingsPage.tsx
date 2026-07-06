import { useSettings } from '../hooks/useSettings'
import pruneLogo from '../assets/prune-logo.png'

export default function SettingsPage() {
  const { settings, loading, saving, error, setLaunchAtLogin } = useSettings()

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-lg font-semibold">设置</h2>

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-medium text-sm">启动与菜单栏</h3>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-gray-700">开机自启动</p>
            <p className="text-xs text-gray-400">
              登录 macOS 后自动在菜单栏启动 Prune（启动时不显示主窗口）
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings?.launchAtLogin ?? false}
            disabled={loading || saving}
            onClick={() => setLaunchAtLogin(!(settings?.launchAtLogin ?? false))}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
              settings?.launchAtLogin ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
                settings?.launchAtLogin ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
        <p className="text-xs text-gray-400">
          关闭主窗口后应用会保留在菜单栏，点击菜单栏图标可重新打开。
        </p>
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-medium text-sm">扫描范围</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>项目扫描根路径: ~/（用户主目录全量递归）</p>
          <p className="text-xs text-gray-400">
            为提升速度，会自动跳过 Library、Pictures、node_modules、.git 等非开发目录。
          </p>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-medium text-sm">关于 Prune</h3>
        <div className="flex items-center gap-3">
          <img
            src={pruneLogo}
            alt="Prune"
            className="w-14 h-14 rounded-2xl shadow-sm"
          />
          <div className="text-sm text-gray-600 space-y-1">
            <p className="font-medium text-gray-800">Prune</p>
            <p>版本: 0.1.0</p>
            <p>平台: macOS</p>
          </div>
        </div>
        <p className="text-sm text-gray-600">备份目录: ~/Library/Application Support/com.devcleaner/backups/</p>
        <p className="text-xs text-gray-400 mt-2">
          所有删除操作都会先创建 tar.gz 压缩备份，确保可以恢复。
        </p>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <h3 className="font-medium text-sm">风险等级说明</h3>
        <div className="text-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">安全</span>
            <span className="text-gray-600">纯缓存，删除后工具会自动重建</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">需注意</span>
            <span className="text-gray-600">删除后需要手动恢复或重新下载</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">谨慎</span>
            <span className="text-gray-600">可能影响工作流，删除前请确认</span>
          </div>
        </div>
      </section>
    </div>
  )
}
