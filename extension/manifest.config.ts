import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

const hostPermissions =
  process.env.NODE_ENV === 'production'
    ? ['https://linkarena.app/*']
    : ['http://localhost:3000/*', 'https://linkarena.app/*']

export default defineManifest({
  manifest_version: 3,
  name: 'LinkArena',
  version: pkg.version,
  icons: {
    16: 'public/icons/bookmark-16.png',
    48: 'public/icons/bookmark-48.png',
    128: 'public/icons/bookmark-128.png',
  },
  action: {
    default_icon: {
      16: 'public/icons/bookmark-16.png',
      48: 'public/icons/bookmark-48.png',
    },
    default_popup: 'src/popup/index.html',
  },
  permissions: [
    'activeTab',
    'contextMenus',
    'tabs',
    'storage',
    'sidePanel',
    'bookmarks',
  ],
  host_permissions: hostPermissions,
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
  externally_connectable: {
    matches: [
      'http://localhost:3000/*',
      'https://linkarena.app/*',
      'https://*.linkarena.app/*',
    ],
  },
})
