import fs from 'fs'
import path from 'path'

export interface UploadedFileStore {
  buffer: Buffer
  fileName: string
  contentType: string
}

const CACHE_DIR = path.join(process.cwd(), 'node_modules', '.cache', 'academic_uploads')

function ensureCacheDir() {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true })
    }
  } catch {
    // Ignore error
  }
}

// In-memory cache attached to globalThis so all Next.js route bundles share the same map
const g = globalThis as unknown as {
  __UPLOADED_FILES_MAP?: Map<string, UploadedFileStore>
}

if (!g.__UPLOADED_FILES_MAP) {
  g.__UPLOADED_FILES_MAP = new Map<string, UploadedFileStore>()
}

export const UPLOADED_FILES_MAP = g.__UPLOADED_FILES_MAP

export function saveUploadedFile(id: string, file: UploadedFileStore) {
  UPLOADED_FILES_MAP.set(id, file)
  try {
    ensureCacheDir()
    fs.writeFileSync(path.join(CACHE_DIR, `${id}.bin`), file.buffer)
    fs.writeFileSync(
      path.join(CACHE_DIR, `${id}.meta.json`),
      JSON.stringify({ fileName: file.fileName, contentType: file.contentType })
    )
  } catch (err) {
    console.warn('[upload-store] Could not write to disk cache:', err)
  }
}

export function getUploadedFile(id: string): UploadedFileStore | undefined {
  const inMemory = UPLOADED_FILES_MAP.get(id)
  if (inMemory) return inMemory

  try {
    const binPath = path.join(CACHE_DIR, `${id}.bin`)
    const metaPath = path.join(CACHE_DIR, `${id}.meta.json`)
    if (fs.existsSync(binPath) && fs.existsSync(metaPath)) {
      const buffer = fs.readFileSync(binPath)
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
      const file: UploadedFileStore = {
        buffer,
        fileName: meta.fileName,
        contentType: meta.contentType,
      }
      UPLOADED_FILES_MAP.set(id, file)
      return file
    }
  } catch (err) {
    console.warn('[upload-store] Could not read from disk cache:', err)
  }
  return undefined
}

