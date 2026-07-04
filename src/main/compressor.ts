import { spawn, execFile } from 'child_process'
import { createHash } from 'crypto'
import { createWriteStream } from 'fs'
import { unlink, stat } from 'fs/promises'
import path from 'path'
import { getBackupDir } from '../shared/constants'

export interface CompressResult {
  compressedPath: string
  sha256: string
  compressedSize: number
}

function runTar(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = execFile('/usr/bin/tar', args, { maxBuffer: 1024 * 1024 * 100 })
    let stderr = ''
    child.stderr?.on('data', (d: Buffer) => { stderr += d.toString() })
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`tar exited with code ${code}: ${stderr}`))
    })
    child.on('error', reject)
  })
}

export async function createBackupArchive(
  sourcePaths: string[],
  backupId: string
): Promise<CompressResult> {
  const compressedPath = path.join(getBackupDir(), `${backupId}.tar.gz`)

  // tar -cz → stdout, computed sha256 inline while writing to disk
  const tarArgs = ['-cz']
  for (const src of sourcePaths) {
    tarArgs.push('-C', path.dirname(src), path.basename(src))
  }

  const sha256 = await new Promise<string>((resolve, reject) => {
    const tar = spawn('/usr/bin/tar', tarArgs)
    const writeStream = createWriteStream(compressedPath)
    const hash = createHash('sha256')

    tar.stdout.pipe(writeStream)
    tar.stdout.on('data', (chunk: Buffer) => hash.update(chunk))

    let stderr = ''
    tar.stderr?.on('data', (d: Buffer) => { stderr += d.toString() })

    tar.on('close', (code) => {
      if (code === 0) {
        writeStream.end()
        writeStream.on('finish', () => resolve(hash.digest('hex')))
      } else {
        reject(new Error(`tar exited with code ${code}: ${stderr}`))
      }
    })
    tar.on('error', reject)
  })

  const { size: compressedSize } = await stat(compressedPath)
  return { compressedPath, sha256, compressedSize }
}

export async function restoreBackupArchive(
  compressedPath: string,
  targetDir: string
): Promise<void> {
  await runTar(['-xzf', compressedPath, '-C', targetDir])
}

export async function deleteArchive(compressedPath: string): Promise<void> {
  await unlink(compressedPath)
}
