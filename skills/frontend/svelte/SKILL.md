---
name: svelte
description: Svelte 编译型前端框架开发
tags: [frontend, svelte, compiler, reactive]
---

# Svelte 开发技能

## 触发条件

- 创建 Svelte 应用
- 编译时优化
- 响应式编程
- 轻量级前端

## 项目初始化

```bash
# 使用 Vite
npm create vite@latest my-svelte-app -- --template svelte

# 进入项目
cd my-svelte-app
npm install
npm run dev
```

## 基础组件

```svelte
<!-- src/App.svelte -->
<script>
  let count = 0;
  
  function increment() {
    count += 1;
  }
  
  $: doubled = count * 2;
</script>

<main>
  <h1>Count: {count}</h1>
  <p>Doubled: {doubled}</p>
  <button on:click={increment}>
    Increment
  </button>
</main>

<style>
  main {
    text-align: center;
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
  }
  
  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
  }
</style>
```

## 响应式声明

```svelte
<script>
  let items = [1, 2, 3];
  let filter = '';
  
  // 响应式声明
  $: filteredItems = items.filter(item => 
    item.toString().includes(filter)
  );
  
  // 多语句
  $: {
    console.log('Items changed:', items);
    console.log('Filtered:', filteredItems);
  }
  
  // 函数
  $: total = calculateTotal(items);
  
  function calculateTotal(arr) {
    return arr.reduce((sum, item) => sum + item, 0);
  }
</script>
```

## 事件处理

```svelte
<script>
  let name = 'World';
  
  function handleSubmit(event) {
    event.preventDefault();
    alert(`Hello, ${name}!`);
  }
  
  function handleKeydown(event) {
    if (event.key === 'Enter') {
      handleSubmit(event);
    }
  }
</script>

<form on:submit={handleSubmit}>
  <input 
    bind:value={name} 
    on:keydown={handleKeydown}
  />
  <button type="submit">Greet</button>
</form>
```

## 组件通信

```svelte
<!-- Child.svelte -->
<script>
  export let message;
  export let onMessage;
</script>

<div>
  <p>{message}</p>
  <button on:click={() => onMessage('Hello from child')}>
    Send Message
  </button>
</div>
```

```svelte
<!-- Parent.svelte -->
<script>
  import Child from './Child.svelte';
  
  let childMessage = 'Hello from parent';
  
  function handleMessage(msg) {
    alert(msg);
  }
</script>

<Child 
  message={childMessage} 
  onMessage={handleMessage}
/>
```

## Store

```javascript
// stores/counter.js
import { writable, derived } from 'svelte/store';

export const count = writable(0);

export const doubled = derived(count, $count => $count * 2);

export function increment() {
  count.update(n => n + 1);
}
```

```svelte
<!-- 使用 Store -->
<script>
  import { count, doubled, increment } from './stores/counter';
</script>

<div>
  <p>Count: {$count}</p>
  <p>Doubled: {$doubled}</p>
  <button on:click={increment}>+</button>
</div>
```

## 最佳实践

### 性能
- 使用 `$$props` 避免不必要的组件更新
- 使用 `tick()` 等待 DOM 更新
- 使用 `requestAnimationFrame` 优化动画

### 代码组织
- 使用 `<script context="module">` 共享逻辑
- 使用 Store 管理全局状态
- 使用 Actions 复用 DOM 逻辑

---

**技能版本**：v1.0
