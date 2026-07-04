import { useState, useCallback } from 'react'
import { useBackups } from '../hooks/useBackups'
import BackupItemRow from '../components/BackupItemRow'
import ConfirmDialog from '../components/ConfirmDialog'
import type { RestoreResult } from '../../shared/types'

export default function BackupPage() {
  const { backups, loading, refresh } = useBackups()
  const [confirmAction, setConfirmAction] = useState<{ type: 'restore' | 'delete'; id: string } | null>(null)
  const [results, setResults] = useState<RestoreResult[] | null>(null)

  const handleRestore = useCallback(async (id: string) => {
    try {
      const res = await window.api.restore([id])
      setResults(res)
      refresh()
    } catch (err) {
      setResults([{ id: '', backupId: id, status: 'failed', errorMessage: String(err) }])
    }
    setConfirmAction(null)
  }, [refresh])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await window.api.deleteBackup([id])
      refresh()
    } catch (err) {
      console.error('Delete backup failed:', err)
    }
    setConfirmAction(null)
  }, [refresh])

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">备份恢复</h2>
        <button
          onClick={refresh}
          disabled={loading}
          className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          {loading ? '加载中...' : '刷新'}
        </button>
      </div>

      {/* Backup list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {backups.map(backup => (
          <BackupItemRow
            key={backup.id}
            backup={backup}
            onRestore={(id) => setConfirmAction({ type: 'restore', id })}
            onDelete={(id) => setConfirmAction({ type: 'delete', id })}
          />
        ))}
        {!loading && backups.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            暂无备份记录
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction?.type === 'restore' ? '恢复备份' : '删除备份'}
        message={
          confirmAction?.type === 'restore'
            ? '将还原备份文件到原始位置。如果目标位置已有文件，可能会被覆盖。'
            : '将永久删除此备份压缩包和记录，无法恢复。确定吗？'
        }
        confirmLabel={confirmAction?.type === 'restore' ? '恢复' : '删除'}
        variant={confirmAction?.type === 'delete' ? 'danger' : 'default'}
        onConfirm={() => {
          if (confirmAction?.type === 'restore') handleRestore(confirmAction.id)
          else if (confirmAction?.type === 'delete') handleDelete(confirmAction.id)
        }}
        onCancel={() => setConfirmAction(null)}
      />

      {/* Results overlay */}
      {results && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setResults(null)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">操作结果</h3>
            <div className="space-y-2">
              {results.map(r => (
                <div key={`${r.backupId}-${r.id}`} className={`text-sm px-3 py-2 rounded ${r.status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {r.status === 'success' ? '操作成功' : `失败: ${r.errorMessage}`}
                </div>
              ))}
            </div>
            <button onClick={() => setResults(null)} className="mt-4 w-full py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors">
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
