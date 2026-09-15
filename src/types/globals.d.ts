/** Frozen into the bundle by vite.config.ts, so a deployed build can name its own version. */
declare const __APP_VERSION__: string

type FileSystemPermissionMode = 'read' | 'readwrite'

type FileSystemPermissionDescriptor = { mode?: FileSystemPermissionMode }

/** The File System Access members lib.dom still omits; optional so a feature check stays honest. */
interface FileSystemHandle {
  queryPermission?(
    descriptor?: FileSystemPermissionDescriptor,
  ): Promise<PermissionState>
  requestPermission?(
    descriptor?: FileSystemPermissionDescriptor,
  ): Promise<PermissionState>
}

interface Window {
  showDirectoryPicker?(options?: {
    id?: string
    mode?: FileSystemPermissionMode
    startIn?:
      | FileSystemHandle
      | 'desktop'
      | 'documents'
      | 'downloads'
      | 'music'
      | 'pictures'
      | 'videos'
  }): Promise<FileSystemDirectoryHandle>
}
