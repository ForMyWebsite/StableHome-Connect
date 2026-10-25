import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'StableHome Connect',
    short_name: 'StableHome',
    description: 'Prevent eviction. Find assistance. Stay housed.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f9fa',
    theme_color: '#17324d',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
