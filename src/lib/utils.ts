import { type ClassValue, clsx } from 'clsx'

/**
 * Merges class names cleanly using clsx.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}
