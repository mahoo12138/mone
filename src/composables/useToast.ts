import { createToastManager } from 'reka-ui'

export const toastManager = createToastManager()

/** Queue a toast; the text is already translated by the caller. */
export function toast(title: string, options?: { description?: string; status?: 'success' | 'error' }) {
  toastManager.add({
    title,
    description: options?.description,
    status: options?.status ?? 'success',
    duration: options?.status === 'error' ? 6000 : 3600,
  })
}
