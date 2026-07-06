/** scanner id → sidebar category label */
export const SCANNER_CATEGORY_BY_ID: Record<string, string> = {
  'node.npm': 'Node.js',
  'node.extra': 'Node.js',
  'node.project': 'Node.js',
  'brew.cache': 'Homebrew',
  'xcode.derived-data': 'Xcode',
  'xcode.extra': 'Xcode',
  'python.uv': 'Python',
  'python.extra': 'Python',
  'python.project': 'Python',
  'java.gradle': 'Java/Android',
  'java.extra': 'Java/Android',
  'java.project': 'Java/Android',
  'misc.rust': 'Rust',
  'misc.rust-project': 'Rust',
  'misc.go': 'Go',
  'misc.extra': 'Misc',
  'misc.flutter': 'Flutter',
  'misc.general-project': 'Misc',
  'docker.cache': 'Docker',
  'ide.caches': 'IDE',
  'system.caches': 'System',
}

export function categoryLabelForScanner(scannerId: string | undefined | null): string | null {
  if (!scannerId) return null
  return SCANNER_CATEGORY_BY_ID[scannerId] ?? scannerId
}
