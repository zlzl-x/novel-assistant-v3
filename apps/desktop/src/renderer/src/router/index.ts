import { createRouter, createWebHashHistory } from 'vue-router'
import AppShell from '@/layouts/AppShell.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: AppShell,
      children: [
        {
          path: '',
          name: 'project-list',
          component: () => import('@/views/ProjectListView.vue'),
          meta: { title: '作品列表' }
        },
        {
          path: 'app-settings',
          name: 'app-settings',
          component: () => import('@/views/AppSettingsView.vue'),
          meta: { title: '应用设置' }
        },
        {
          path: 'project/:id',
          component: () => import('@/components/layout/ProjectWorkspace.vue'),
          redirect: (to) => `/project/${String(to.params.id)}/manuscript`,
          children: [
            {
              path: 'manuscript',
              name: 'manuscript',
              component: () => import('@/views/ManuscriptView.vue'),
              meta: { title: '正文', nav: 'manuscript' }
            },
            {
              path: 'manuscript/:chapterId',
              name: 'manuscript-chapter',
              component: () => import('@/views/ManuscriptView.vue'),
              meta: { title: '正文', nav: 'manuscript' }
            },
            {
              path: 'map',
              name: 'map',
              component: () => import('@/views/MapView.vue'),
              meta: { title: '地图', nav: 'map' }
            },
            {
              path: 'characters',
              name: 'characters',
              component: () => import('@/views/CharactersView.vue'),
              meta: { title: '角色', nav: 'characters' }
            },
            {
              path: 'settings',
              name: 'project-settings',
              component: () => import('@/views/SettingsView.vue'),
              meta: { title: '设定', nav: 'settings' }
            }
          ]
        }
      ]
    }
  ]
})

export default router
