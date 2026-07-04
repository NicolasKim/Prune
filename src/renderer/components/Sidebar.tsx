interface NavItem {
  id: string
  label: string
  icon: string
}

const navItems: NavItem[] = [
  { id: 'scanner', label: '扫描清理', icon: '🧹' },
  { id: 'backups', label: '备份恢复', icon: '📦' },
  { id: 'settings', label: '设置', icon: '⚙️' }
]

interface Props {
  activePage: string
  onNavigate: (page: string) => void
  categorySizes?: Record<string, number>
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

export default function Sidebar({ activePage, onNavigate, categorySizes = {} }: Props) {
  const totalBytes = Object.values(categorySizes).reduce((s, v) => s + v, 0)

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col py-4">
      {/* App title */}
      <div className="px-4 mb-6">
        <h1 className="text-lg font-bold text-gray-800">DevCleaner</h1>
        <p className="text-xs text-gray-400 mt-0.5">macOS 开发者缓存清理</p>
        <p className="text-xs text-gray-500 mt-1">总计可释放 <strong>{formatBytes(totalBytes)}</strong></p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              activePage === item.id
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Category summary */}
      {Object.keys(categorySizes).length > 0 && (
        <div className="px-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">分类汇总</p>
          <div className="space-y-1">
            {Object.entries(categorySizes)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 6)
              .map(([cat, size]) => (
                <div key={cat} className="flex justify-between text-xs">
                  <span className="text-gray-600 truncate">{cat}</span>
                  <span className="text-gray-500 shrink-0 ml-2">{formatBytes(size)}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </aside>
  )
}
