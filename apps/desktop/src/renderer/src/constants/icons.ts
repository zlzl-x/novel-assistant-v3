export type IconName =
  | 'book'
  | 'document'
  | 'map'
  | 'users'
  | 'settings'
  | 'folder'
  | 'plus'
  | 'download'
  | 'list'
  | 'grid'
  | 'chevron-right'
  | 'search'
  | 'sparkles'
  | 'trash'

/** Minimal stroke icons (Lucide-style, 24x24) */
export const iconPaths: Record<IconName, string[]> = {
  book: [
    'M4 19.5A2.5 2.5 0 0 1 6.5 17H20',
    'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'
  ],
  document: [
    'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
    'M14 2v4a2 2 0 0 0 2 2h4',
    'M10 9H8',
    'M16 13H8',
    'M16 17H8'
  ],
  map: [
    'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3Z',
    'M9 3v15',
    'M15 6v15'
  ],
  users: [
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
    'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    'M22 21v-2a4 4 0 0 0-3-3.87',
    'M16 3.13a4 4 0 0 1 0 7.75'
  ],
  settings: [
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z'
  ],
  folder: ['M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z'],
  plus: ['M12 5v14', 'M5 12h14'],
  download: [
    'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',
    'M7 10l5 5 5-5',
    'M12 15V3'
  ],
  list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  grid: ['M12 3v18', 'M3 12h18', 'M5.6 5.6l12.8 12.8', 'M18.4 5.6 5.6 18.4'],
  'chevron-right': ['M9 18l6-6-6-6'],
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.3-4.3'],
  sparkles: [
    'M9.94 9.94 12 3l2.06 6.94L21 12l-6.94 2.06L12 21l-2.06-6.94L3 12l6.94-2.06Z'
  ],
  trash: [
    'M3 6h18',
    'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
    'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6',
    'M10 11v6',
    'M14 11v6'
  ]
}

export const workspaceNavItems = [
  { key: 'manuscript', label: '正文', icon: 'document' as const, routeName: 'manuscript' },
  { key: 'map', label: '地图', icon: 'map' as const, routeName: 'map' },
  { key: 'characters', label: '角色', icon: 'users' as const, routeName: 'characters' },
  { key: 'settings', label: '设定', icon: 'settings' as const, routeName: 'project-settings' }
]

export const settingModuleIconMap = {
  richtext: 'document',
  checklist: 'list',
  table: 'grid',
  default: 'book'
} as const
