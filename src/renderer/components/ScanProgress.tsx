interface Props {
  scanning: boolean
  itemCount: number
  onCancel?: () => void
}

export default function ScanProgress({ scanning, itemCount, onCancel }: Props) {
  if (!scanning && itemCount === 0) return null

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
      {scanning ? (
        <>
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-blue-700">正在扫描 ~/（首次全量扫描可能需要数分钟）...</span>
        </>
      ) : (
        <span className="text-sm text-green-700">
          扫描完成：找到 {itemCount} 个缓存项
        </span>
      )}
    </div>
  )
}
