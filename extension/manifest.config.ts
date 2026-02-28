import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

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
    'contentSettings',
  ],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [{
    js: ['src/content/main.tsx'],
    matches: ['https://*/*'],
  }],
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
})
