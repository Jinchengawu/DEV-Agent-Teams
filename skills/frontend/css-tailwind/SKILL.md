---
name: css-tailwind
description: Tailwind CSS 样式开发最佳实践
tags: [frontend, css, tailwind, styling]
---

# Tailwind CSS 技能

## 触发条件

- 使用 Tailwind CSS
- 响应式设计
- 暗色模式
- 自定义主题

## 基础用法

### 布局
```html
<div class="flex items-center justify-between p-4">
  <div class="flex-1">Content</div>
  <div class="w-1/3">Sidebar</div>
</div>
```

### 响应式
```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div class="card">Card 1</div>
  <div class="card">Card 2</div>
  <div class="card">Card 3</div>
</div>
```

### 暗色模式
```html
<div class="bg-white dark:bg-gray-800 text-black dark:text-white">
  Content
</div>
```

## 常用组件

### 按钮
```html
<button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
  Button
</button>
```

### 卡片
```html
<div class="bg-white shadow-md rounded-lg p-6">
  <h3 class="text-xl font-semibold mb-2">Title</h3>
  <p class="text-gray-600">Content</p>
</div>
```

### 表单
```html
<input class="border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500" />
```

## 自定义主题

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#3490dc',
        secondary: '#ffed4a',
        danger: '#e33371',
      },
    },
  },
}
```

---

**技能版本**：v1.0
