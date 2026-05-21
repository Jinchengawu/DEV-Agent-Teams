---
name: angular
description: Angular 企业级前端框架
tags: [frontend, angular, typescript, enterprise]
---

# Angular 开发技能

## 触发条件

- 创建 Angular 应用
- 企业级前端开发
- 组件化架构
- 依赖注入

## 项目初始化

```bash
# 安装 Angular CLI
npm install -g @angular/cli

# 创建新项目
ng new my-angular-app

# 进入项目
cd my-angular-app
ng serve
```

## 组件

```typescript
// src/app/user/user.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { User } from '../models/user.model';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent {
  @Input() user!: User;
  @Output() userClick = new EventEmitter<User>();
  
  onClick() {
    this.userClick.emit(this.user);
  }
}
```

```html
<!-- src/app/user/user.component.html -->
<div class="user-card" (click)="onClick()">
  <h3>{{ user.name }}</h3>
  <p>{{ user.email }}</p>
</div>
```

## 服务

```typescript
// src/app/services/user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = '/api/users';
  
  constructor(private http: HttpClient) {}
  
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }
  
  getUser(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }
  
  createUser(user: Partial<User>): Observable<User> {
    return this.http.post<User>(this.apiUrl, user);
  }
}
```

## 路由

```typescript
// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { UserListComponent } from './user-list/user-list.component';
import { UserDetailComponent } from './user-detail/user-detail.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'users', component: UserListComponent },
  { path: 'users/:id', component: UserDetailComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
```

## 依赖注入

```typescript
// 自定义服务
@Injectable()
export class Logger {
  log(message: string) {
    console.log(`[LOG] ${message}`);
  }
}

// 使用
@Component({
  selector: 'app-my-component',
  providers: [Logger]
})
export class MyComponent {
  constructor(private logger: Logger) {
    this.logger.log('Component initialized');
  }
}
```

## RxJS

```typescript
import { Observable, of, from } from 'rxjs';
import { map, filter, switchMap, catchError } from 'rxjs/operators';

// 创建 Observable
const numbers$ = of(1, 2, 3, 4, 5);

// 操作符
const result$ = numbers$.pipe(
  filter(n => n % 2 === 0),
  map(n => n * 2)
);

// 订阅
result$.subscribe(value => console.log(value));

// HTTP 请求
this.http.get('/api/users').pipe(
  switchMap(users => {
    return this.http.get(`/api/users/${users[0].id}/posts`);
  }),
  catchError(error => {
    console.error(error);
    return of([]);
  })
);
```

## 最佳实践

### 组件设计
- 单一职责原则
- 使用 OnPush 变更检测
- 避免内存泄漏

### 状态管理
- 使用 NgRx 或 NGXS
- 单向数据流
- 不可变状态

### 测试
```typescript
// 组件测试
describe('UserComponent', () => {
  let component: UserComponent;
  let fixture: ComponentFixture<UserComponent>;
  
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UserComponent]
    }).compileComponents();
    
    fixture = TestBed.createComponent(UserComponent);
    component = fixture.componentInstance;
  });
  
  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

---

**技能版本**：v1.0
