import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Campus Super-App',
    short_name: 'Campus',
    description: 'Unified campus experience platform for academics, presence, digital ID, and events',
    start_url: '/',
    display: 'standalone',
    background_color: '#F6F8FC',
    theme_color: '#182B49',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}
