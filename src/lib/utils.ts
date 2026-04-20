import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function hexToRgb(hex: string): string {
  let h = hex.replace(`#`, ``).trim()

  if (h.length === 3) {
    h = h.split(``).map(c => c + c).join(``)
  }

  const int = Number.parseInt(h, 16)

  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255

  return `${r}, ${g}, ${b}`
}
