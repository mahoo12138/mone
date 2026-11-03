import '@fontsource-variable/manrope'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import type { Context } from '@cormijs/vue/client'
import { initAuth, session } from './composables/useAuth'

export default (ctx: Context) => {
  ctx.on('app/mount', () => {
    ctx.$router.router?.beforeEach(async (to) => {
      await initAuth()
      if (!session.value && to.path !== '/login') return '/login'
      if (session.value && to.path === '/login') return '/'
    })
  })

  ctx.on('router/change', (location) => {
    document.title = location.pathname === '/' ? 'Mone — Overview' : `Mone — ${location.pathname.split('/').filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(' / ')}`
  })
}
