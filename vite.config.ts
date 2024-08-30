import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import glsl from 'vite-plugin-glsl'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    glsl({
      include: '**/*.{vert,frag,glsl}', // Match your shader file extensions
      compress: false, // Set to true to compress GLSL code
    }),
  ],
  
})
