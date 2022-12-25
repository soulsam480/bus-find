import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import Unocss from 'unocss/vite';
import presetWind from '@unocss/preset-wind';
import { presetForms } from '@julr/unocss-preset-forms';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    Unocss({
      presets: [presetWind(), presetForms()],
    }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        sourcemap: false,
      },
      manifest: {
        name: 'Find Bus',
        short_name: 'Find Bus',
        description: 'Find Bus in Bengaluru',
        theme_color: '#CEE5A8',
        background_color: '#CEE5A8',
        icons: [
          ...[48, 72, 144, 192, 512].map((size) => {
            return {
              src: `icon-${size}-${size}.png`,
              sizes: `${size}x${size}`,
              type: 'image/png',
            };
          }),
        ],
      },
    }),
  ],
});
