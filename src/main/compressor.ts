import { execFile } from 'child_process'
import { createHash } from 'crypto'
import { createReadStream } from 'fs'
import { unlink } from 'fs/promises'
import path from 'path'
import { BACKUP_DIR } from '../shared/constants'

export interface CompressResult {
  compressedPath: string
  sha256: string
  compressedSize: number
}

function runTar(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = execFile('/usr/bin/tar', args, { maxBuffer: 1024 * 1024 * 100 })
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`tar exited with code ${code}`))
    })
    child.on('error', reject)
  })
}

function computeSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(filePath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

export async function createBackupArchive(
  sourcePaths: string[],
  backupId: string
): Promise<CompressResult> {
  const compressedPath = path.join(BACKUP_DIR, `${backupId}.tar.gz`)

  // tar -czf target.tar.gz -C /parent/dir dirname -C /other dirname ...
  const args = ['-czf', compressedPath]
  for (const src of sourcePaths) {
    const parent = path.dirname(src)
    const base = path.basename(src)
    args.push('-C', parent, base)
  }

  await runTar(args)
  const sha256 = await computeSha256(compressedPath)
  const { size: compressedSize } = await import('fs/promises').then(fs =>
    fs.stat(compressedPath)
  )

  return { compressedPath, sha256, compressedSize }
}

export async function restoreBackupArchive(
  compressedPath: string,
  targetDir: string
): Promise<void> {
  // tar -xzf backup.tar.gz -C /target/dir
  await runTar(['-xzf', compressedPath, '-C', targetDir])
}

export async function deleteArchive(compressedPath: string): Promise<void> {
  await unlink(compressedPath)
}
