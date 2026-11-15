import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        // Static imports load every chunk before play, including offline sessions.
        codeSplitting: {
          groups: [
            { name: 'three-core', test: /node_modules\/three\/build\/three\.core\.js/ },
            { name: 'three-renderer', test: /node_modules\/three\/build\/three\.module\.js/ },
            { name: 'react', test: /node_modules\/(react|react-dom|scheduler)\// },
          ],
        },
      },
    },
  },
});
