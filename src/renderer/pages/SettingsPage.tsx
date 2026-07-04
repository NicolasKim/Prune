export default function SettingsPage() {
  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-lg font-semibold">设置</h2>

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-medium text-sm">关于 DevCleaner</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>版本: 0.1.0</p>
          <p>平台: macOS</p>
          <p>备份目录: ~/Library/Application Support/com.devcleaner/backups/</p>
        </div>
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
