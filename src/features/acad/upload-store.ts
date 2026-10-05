export interface UploadedFileStore {
  buffer: Buffer
  fileName: string
  contentType: string
}

// In-memory cache for files uploaded via mock-upload during development
export const UPLOADED_FILES_MAP = new Map<string, UploadedFileStore>()
