// vite.config.js
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    extensions: ['.ts', '.js']
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es']
    }
  },
  css: {
    modules: false,
    preprocessorOptions: {
      scss: {}
    }
  }
});
