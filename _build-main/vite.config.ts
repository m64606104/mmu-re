import type { Connect } from 'vite'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// 本地 `vite` 为 development → base `/`，直接打开 http://localhost:5173/ 即可。
// `vite build` / `vite preview` 默认 production → base `/mmu-re/`，与 GitHub Pages 一致。
//
// 开发时若上游（如 tudou.chat）未对浏览器 Origin 返回 CORS，或本机 TLS 校验失败，可在
// `_build-main/.env.development.local` 中设置：
//   MOMOYU_OPENAI_PROXY_TARGET=https://www.tudou.chat
// 然后将设置里的 API Base 填为：http://localhost:5173/momoyu-openai-proxy（不要带 /v1 后缀）。
// 可选：MOMOYU_OPENAI_PROXY_INSECURE_TLS=1 以忽略上游证书链错误（仅本地，勿用于生产）。
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = (env.MOMOYU_OPENAI_PROXY_TARGET || '').trim()
  const proxyInsecureTls = env.MOMOYU_OPENAI_PROXY_INSECURE_TLS === '1'

  return {
  base: mode === 'production' ? '/mmu-re/' : '/',
  ...(mode === 'development' && proxyTarget
    ? {
        server: {
          proxy: {
            '/momoyu-openai-proxy': {
              target: proxyTarget,
              changeOrigin: true,
              secure: !proxyInsecureTls,
              rewrite: (p) => {
                const next = p.replace(/^\/momoyu-openai-proxy/, '')
                return next.length ? next : '/'
              },
            },
          },
        },
      }
    : {}),
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
}
})
