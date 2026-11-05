import '@fontsource-variable/manrope'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import { watch } from 'vue'
import type { Context } from '@cormijs/vue/client'
import { initAuth, session } from './composables/useAuth'
import { currentLocale, i18n, t } from './i18n'
import AppProviders from './components/ui/AppProviders.vue'

const titleKeys: Record<string, string> = {
  '/': 'app.pageNames.landing',
  '/overview': 'app.pageNames.overview',
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

// The landing page and the sign-in form are the anonymous face of the app; a signed-in
// reader is moved straight into the workspace. Anything else needs a session.
function guardedPath(path: string, signedIn: boolean) {
  if (path === '/' || path === '/login') return signedIn ? '/overview' : undefined
  if (signedIn || path === '/verify' || path.startsWith('/status/')) return undefined
  return '/login'
}

export default (ctx: Context) => {
  ctx.$app.use(i18n)
  ctx.wrap(AppProviders)

  let pathname = '/'

  ctx.on('app/mount', () => {
    const router = ctx.$router.router
    if (!router) return
    router.beforeEach(async (to) => {
      await initAuth()
      return guardedPath(to.path, Boolean(session.value))
    })
    // Cormi emits app/mount after the first navigation has already resolved, so the entry
    // route never passes through beforeEach and has to be checked against the same rule.
    void initAuth().then(() => {
      const target = guardedPath(router.currentRoute.value.path, Boolean(session.value))
      if (target) router.replace(target)
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
