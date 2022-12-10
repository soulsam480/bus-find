import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import Unocss from 'unocss/vite';
import presetWind from '@unocss/preset-wind';
import { presetForms } from '@julr/unocss-preset-forms';

// https://vitejs.dev/config/
export default defineConfig({
  optimizeDeps: {
    exclude: ['kysely'],
  },
  plugins: [
    vue(),
    Unocss({
      presets: [presetWind(), presetForms()],
    }),
  ],
});
