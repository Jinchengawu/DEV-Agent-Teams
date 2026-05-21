---
name: vue-development
description: Vue 3 组件开发最佳实践
tags: [frontend, vue, composition-api, pinia]
---

# Vue 3 开发技能

## 触发条件

- 创建 Vue 组件
- 使用 Composition API
- 状态管理（Pinia）
- 路由配置（Vue Router）

## 执行步骤

1. **创建组件**
   ```bash
   mkdir -p src/components/UserCard
   touch src/components/UserCard/index.vue
   touch src/components/UserCard/UserCard.vue
   touch src/components/UserCard/__tests__/UserCard.test.ts
   ```

2. **实现组件**
   ```vue
   <script setup lang="ts">
   interface Props {
     name: string
     email: string
   }
   
   const props = defineProps<Props>()
   const emit = defineEmits<{
     (e: 'click', id: number): void
   }>()
   </script>
   
   <template>
     <div class="user-card" @click="emit('click', 1)">
       <h3>{{ name }}</h3>
       <p>{{ email }}</p>
     </div>
   </template>
   
   <style scoped>
   .user-card {
     border: 1px solid #ccc;
     padding: 1rem;
     border-radius: 8px;
   }
   </style>
   ```

## 最佳实践

### Composition API
```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const count = ref(0)
const double = computed(() => count.value * 2)

function increment() {
  count.value++
}

onMounted(() => {
  console.log('Component mounted')
})
</script>
```

### Pinia 状态管理
```typescript
// stores/user.ts
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const isLoggedIn = computed(() => !!user.value)
  
  async function login(credentials: LoginCredentials) {
    user.value = await api.login(credentials)
  }
  
  function logout() {
    user.value = null
  }
  
  return { user, isLoggedIn, login, logout }
})
```

### Vue Router
```typescript
// router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/views/Home.vue')
    },
    {
      path: '/user/:id',
      component: () => import('@/views/User.vue'),
      props: true
    }
  ]
})
```

---

**技能版本**：v1.0
