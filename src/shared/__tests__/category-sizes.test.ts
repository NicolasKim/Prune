import { describe, it, expect } from 'vitest'
import { categorySizesFromItems } from '../category-sizes'

describe('categorySizesFromItems', () => {
  it('groups items by scanner category label', () => {
    const sizes = categorySizesFromItems([
      { id: '1', scannerId: 'node.npm', name: 'a', description: '', paths: [], sizeBytes: 100, riskLevel: 'safe', restoreGuide: '' },
      { id: '2', scannerId: 'node.extra', name: 'b', description: '', paths: [], sizeBytes: 50, riskLevel: 'safe', restoreGuide: '' },
      { id: '3', scannerId: 'python.uv', name: 'c', description: '', paths: [], sizeBytes: 200, riskLevel: 'safe', restoreGuide: '' },
    ])

    expect(sizes).toEqual({
      'Node.js': 150,
      Python: 200,
    })
  })

  it('skips items with missing scannerId', () => {
    const sizes = categorySizesFromItems([
      { id: '1', scannerId: undefined as unknown as string, name: 'a', description: '', paths: [], sizeBytes: 0, riskLevel: 'safe', restoreGuide: '' },
    ])

    expect(sizes).toEqual({})
  })
})
