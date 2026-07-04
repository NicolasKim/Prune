import type { BackupMeta } from '../../shared/types'

interface Props {
  backup: BackupMeta
  onRestore: (id: string) => void
  onDelete: (id: string) => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function BackupItemRow({ backup, onRestore, onDelete }: Props) {
  const isRestored = !!backup.restoredAt
  const ratio = ((backup.compressedSize / backup.originalSize) * 100).toFixed(0)

  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-lg border transition-colors ${
      isRestored ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{backup.itemName}</span>
          {isRestored && <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">已恢复</span>}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {formatDate(backup.createdAt)} · 原始 {formatBytes(backup.originalSize)} → 压缩 {formatBytes(backup.compressedSize)} ({ratio}%)
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        {!isRestored && (
          <button
            onClick={() => onRestore(backup.id)}
            className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            恢复
          </button>
        )}
        <button
          onClick={() => onDelete(backup.id)}
          className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
        >
          删除备份
        </button>
      </div>
    </div>
  )
}
