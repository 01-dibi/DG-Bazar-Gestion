
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL),
    'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY)
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      // Marcamos estas librerías como externas para que Vite no falle al intentar resolverlas localmente
      // y use el importmap definido en index.html
      external: [
        'react',
        'react-dom',
        '@supabase/supabase-js',
        'lucide-react',
        '@google/genai'
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          '@supabase/supabase-js': 'supabase',
          'lucide-react': 'lucide'
        }
      }
    }
  },
  server: {
    port: 3000
  }
});
