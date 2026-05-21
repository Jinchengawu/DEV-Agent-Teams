---
name: react-native
description: React Native 移动应用开发最佳实践
tags: [frontend, react-native, mobile, ios, android]
---

# React Native 开发技能

## 触发条件

- 创建 React Native 应用
- 跨平台开发
- 原生模块集成
- 性能优化

## 项目初始化

```bash
# 创建新项目
npx react-native init MyApp

# 使用 Expo
npx create-expo-app MyApp

# 进入项目
cd MyApp
npm install
```

## 核心组件

### 基础组件
```tsx
import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

export const HomeScreen = () => {
  const data = [
    { id: '1', title: 'Item 1' },
    { id: '2', title: 'Item 2' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home Screen</Text>
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Text style={styles.item}>{item.title}</Text>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  item: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
});
```

### 导航
```tsx
// @react-navigation/native
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Details" component={DetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### 状态管理
```tsx
// Zustand
import { create } from 'zustand';

interface AppState {
  count: number;
  increment: () => void;
  decrement: () => void;
}

const useStore = create<AppState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}));

// 使用
const Counter = () => {
  const { count, increment, decrement } = useStore();
  
  return (
    <View>
      <Text>{count}</Text>
      <Button title="+" onPress={increment} />
      <Button title="-" onPress={decrement} />
    </View>
  );
};
```

## 原生模块

### iOS (Swift)
```swift
// iOS/MyModule.swift
import Foundation

@objc(MyModule)
class MyModule: NSObject {
  @objc
  func greet(_ name: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve("Hello, \(name)!")
  }
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
```

### Android (Kotlin)
```kotlin
// android/app/src/main/java/com/myapp/MyModule.kt
package com.myapp

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class MyModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "MyModule"

  @ReactMethod
  fun greet(name: String, promise: Promise) {
    promise.resolve("Hello, $name!")
  }
}
```

## 最佳实践

### 性能优化
- 使用 FlatList 替代 ScrollView
- 避免内联函数
- 使用 React.memo
- 图片优化

### 样式
- 使用 StyleSheet.create
- 响应式设计
- 暗色模式支持

### 测试
```tsx
// 组件测试
import { render, fireEvent } from '@testing-library/react-native';

test('increments counter', () => {
  const { getByText } = render(<Counter />);
  fireEvent.press(getByText('+'));
  expect(getByText('1')).toBeTruthy();
});
```

---

**技能版本**：v1.0
