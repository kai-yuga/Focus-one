import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // This allows your existing code using process.env.API_KEY to work
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});