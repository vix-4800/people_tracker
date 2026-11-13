import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
export default defineConfig({
  base: './',
  plugins: [vue(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['icons/*.png'],
    manifest: { name: 'Учёт перемещений', short_name: 'Перемещения', lang: 'ru', description: 'Местонахождение сотрудников и история рабочего дня. Всё на вашем устройстве.', theme_color: '#16735b', background_color: '#f5f6f8', display: 'standalone', start_url: './', scope: './', icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] },
    workbox: { globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'], cleanupOutdatedCaches: true, navigateFallback: 'index.html' }
  })],
  test: { include: ['src/**/*.test.ts'], environment: 'node' }
})
