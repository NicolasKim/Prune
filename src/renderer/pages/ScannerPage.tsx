import { useState, useCallback } from 'react'
import { useCleaner } from '../hooks/useCleaner'
import ScanResultItem from '../components/ScanResultItem'
import ScanProgress from '../components/ScanProgress'
import { formatBytes } from '../../shared/format'
import type { useScanner } from '../hooks/useScanner'

type ScanSession = ReturnType<typeof useScanner>

interface Props {
  scanSession: ScanSession
}

export default function ScannerPage({ scanSession }: Props) {
  const { items, scanning, scanId, error, startScan, removeItems } = scanSession
  const { cleaning, results, clean, clearResults } = useCleaner()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggleItem = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectSafeItems = useCallback(() => {
    setSelected(new Set(items.filter(i => i.riskLevel === 'safe').map(i => i.id)))
  }, [items])

  const safeItemCount = items.filter(i => i.riskLevel === 'safe').length

  const handleClean = useCallback(async () => {
    if (!scanId) return
    const res = await clean(Array.from(selected), scanId)
    if (res) {
      const cleanedIds = res.filter(r => r.success).map(r => r.itemId)
      removeItems(cleanedIds)
      setSelected(prev => {
        const next = new Set(prev)
        cleanedIds.forEach(id => next.delete(id))
        return next
      })
    }
  }, [scanId, selected, clean, removeItems])

  const selectedCount = selected.size
  const selectedBytes = items.filter(i => selected.has(i.id)).reduce((s, i) => s + i.sizeBytes, 0)

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">扫描清理</h2>
        <button
          onClick={startScan}
          disabled={scanning || cleaning}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {scanning ? '扫描中...' : '开始扫描'}
        </button>
      </div>

      {/* Progress */}
      <ScanProgress scanning={scanning} itemCount={items.length} />

      {!scanning && safeItemCount > 0 && (
        <div className="flex items-center justify-end">
          <button
            onClick={selectSafeItems}
            disabled={cleaning}
            className="px-3 py-1.5 text-sm font-medium text-green-800 bg-green-100 rounded-lg hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            选择全部安全项（{safeItemCount}）
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Result list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {items.map(item => (
          <ScanResultItem
            key={item.id}
            item={item}
            selected={selected.has(item.id)}
            onToggle={toggleItem}
          />
        ))}
        {!scanning && items.length === 0 && !error && (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            点击"开始扫描"检测缓存文件
          </div>
        )}
      </div>

      {/* Bottom bar */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-100 rounded-lg">
          <span className="text-sm text-gray-600">
            已选 <strong>{selectedCount}</strong> 项（共 <strong>{formatBytes(selectedBytes)}</strong>）
          </span>
          <button
            onClick={handleClean}
            disabled={cleaning}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {cleaning ? '清理中...' : '清理已选项目'}
          </button>
        </div>
      )}

      {/* Clean results modal */}
      {results && results.length > 0 && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => clearResults()}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">清理结果</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {results.map(r => (
                <div key={r.itemId} className={`text-sm px-3 py-2 rounded ${r.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {r.success ? '清理成功' : `失败: ${r.error}`}
                </div>
              ))}
            </div>
            <button onClick={() => clearResults()} className="mt-4 w-full py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors">
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
