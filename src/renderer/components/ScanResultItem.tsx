import type { CacheItem } from '../../shared/types'
import { formatBytes } from '../../shared/format'

interface Props {
  item: CacheItem
  selected: boolean
  onToggle: (id: string) => void
}

const riskColors: Record<string, string> = {
  safe: 'bg-green-100 text-green-800',
  conditional: 'bg-yellow-100 text-yellow-800',
  caution: 'bg-red-100 text-red-800'
}

const riskLabels: Record<string, string> = {
  safe: '安全',
  conditional: '需注意',
  caution: '谨慎'
}

export default function ScanResultItem({ item, selected, onToggle }: Props) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
      selected ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'
    }`}>
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(item.id)}
        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{item.name}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${riskColors[item.riskLevel]}`}>
            {riskLabels[item.riskLevel]}
          </span>
        </div>
        <p className="text-xs text-gray-500 truncate mt-0.5">{item.description}</p>
        {item.paths.length > 0 && (
          <p className="text-xs text-gray-400 truncate mt-0.5 font-mono">{item.paths[0]}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-gray-700">{formatBytes(item.sizeBytes)}</p>
      </div>
    </div>
  )
}
