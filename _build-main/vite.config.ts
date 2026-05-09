import type { Connect } from 'vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 本地 `vite` 为 development → base `/`，直接打开 http://localhost:5173/ 即可。
// `vite build` / `vite preview` 默认 production → base `/mmu-re/`，与 GitHub Pages 一致。
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/mmu-re/' : '/',
  plugins: [
    react(),
    // 避免误开 /mmu-re/（线上路径）时拿到旧缓存里的「生产 index」，导致请求 /mmu-re/assets/*.js 在 dev 下 404
    ...(mode === 'development'
      ? [
          {
            name: 'dev-redirect-mmu-re-root',
            configureServer(server) {
              server.middlewares.use(((req, res, next) => {
                const path = (req.url ?? '').split('?')[0]
                if (path === '/mmu-re' || path === '/mmu-re/') {
                  res.statusCode = 302
                  res.setHeader('Location', '/')
                  res.setHeader('Cache-Control', 'no-store')
                  res.end()
                  return
                }
                next()
              }) as Connect.NextHandleFunction)
            },
          },
        ]
      : []),
  ],
}))
