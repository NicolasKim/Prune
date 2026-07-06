// Patch Electron.app Info.plist so the Dock shows "Prune" during development.
// This is a development-only cosmetic fix; packaged app uses electron-builder config.
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

try {
  const electronRoot = path.dirname(require.resolve('electron/package.json'))
  const plistPath = path.join(electronRoot, 'dist', 'Electron.app', 'Contents', 'Info.plist')

  if (!fs.existsSync(plistPath)) {
    console.log('[patch-electron-name] Electron.app Info.plist not found, skipping.')
    process.exit(0)
  }

  const current = execSync(`/usr/libexec/PlistBuddy -c "Print :CFBundleDisplayName" "${plistPath}"`, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim()

  if (current === 'Prune') {
    console.log('[patch-electron-name] already set to Prune, skipping.')
    process.exit(0)
  }

  console.log(`[patch-electron-name] current: "${current}", setting to "Prune"`)
  execSync(`/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName Prune" "${plistPath}"`, {
    stdio: 'inherit',
  })
  execSync(`/usr/libexec/PlistBuddy -c "Set :CFBundleName Prune" "${plistPath}"`, {
    stdio: 'inherit',
  })
  console.log('[patch-electron-name] done.')
} catch (err) {
  console.error('[patch-electron-name] failed:', err.message)
  process.exit(0) // non-fatal, don't break install
}
