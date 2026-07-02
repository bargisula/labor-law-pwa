import { defineConfig } from 'astro/config';
import AstroPWA from '@vite-pwa/astro';

export default defineConfig({
  site: 'https://labor-law-pwa.pages.dev',
  integrations: [
    AstroPWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '勞基法查詢',
        short_name: '勞基法',
        description: '勞動基準法條文與相關解釋查詢，離線可用',
        lang: 'zh-TW',
        display: 'standalone',
        start_url: '/',
        theme_color: '#0f766e',
        background_color: '#f8fafc',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 預快取全部頁面與資料，安裝後離線也能查
        globPatterns: ['**/*.{js,css,html,json,svg,png,ico,woff2}'],
        navigateFallback: null,
      },
    }),
  ],
});
