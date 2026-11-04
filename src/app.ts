import '@fontsource-variable/manrope'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import { watch } from 'vue'
import type { Context } from '@cormijs/vue/client'
import { initAuth, session } from './composables/useAuth'
import { currentLocale, i18n, t } from './i18n'
import AppProviders from './components/ui/AppProviders.vue'

const titleKeys: Record<string, string> = {
  '/': 'app.pageNames.overview',
  '/login': 'app.pageNames.login',
  '/verify': 'app.pageNames.verify',
  '/monitors': 'app.pageNames.monitors',
  '/monitors/create': 'app.pageNames.create',
  '/incidents': 'app.pageNames.incidents',
  '/settings': 'app.pageNames.settings',
  '/settings/notifications': 'app.pageNames.notifications',
  '/settings/status-page': 'app.pageNames.statusPage',
}

function documentTitle(pathname: string) {
  const key = titleKeys[pathname] ?? (pathname.startsWith('/status/') ? 'app.pageNames.publicStatus' : pathname.startsWith('/monitors/') ? 'app.pageNames.monitorDetail' : 'app.pageNames.notFound')
  return t('app.title', { page: t(key) })
}

export default (ctx: Context) => {
  ctx.$app.use(i18n)
  ctx.wrap(AppProviders)

  let pathname = '/'

  ctx.on('app/mount', () => {
    ctx.$router.router?.beforeEach(async (to) => {
      await initAuth()
      const isPublic = to.path.startsWith('/status/') || to.path === '/verify'
      if (!session.value && to.path !== '/login' && !isPublic) return '/login'
      if (session.value && to.path === '/login') return '/'
    })
  })

  ctx.on('router/change', (location) => {
    pathname = location.pathname
    document.title = documentTitle(pathname)
  })

  // the tab title lives outside the render tree, so it follows the locale explicitly
  watch(currentLocale, () => {
    document.title = documentTitle(pathname)
  })
}
