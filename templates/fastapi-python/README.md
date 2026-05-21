# FastAPI + Python 项目模板

## 快速开始

```bash
# 创建项目目录
mkdir my-fastapi-app && cd my-fastapi-app

# 创建虚拟环境
python -m venv venv
source venv/bin/activate

# 安装依赖
pip install fastapi uvicorn sqlalchemy alembic

# 启动开发服务器
uvicorn main:app --reload
```

## 项目结构

```
src/
├── api/                # API 路由
│   ├── __init__.py
│   ├── users.py
│   └── auth.py
├── models/             # 数据模型
│   ├── __init__.py
│   └── user.py
├── schemas/            # Pydantic 模型
│   ├── __init__.py
│   └── user.py
├── services/           # 业务逻辑
│   ├── __init__.py
│   └── user_service.py
├── database.py         # 数据库连接
└── main.py             # 应用入口
```

## 核心文件

### main.py
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api import users, auth

app = FastAPI(title="My API", version="1.0.0")

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 路由
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])

@app.get("/health")
async def health():
    return {"status": "ok"}
```

### Pydantic 模型
```python
# schemas/user.py
from pydantic import BaseModel, EmailStr
from datetime import datetime

class UserBase(BaseModel):
    name: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
```

### SQLAlchemy 模型
```python
# models/user.py
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from src.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### API 路由
```python
# api/users.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.schemas.user import UserCreate, UserResponse
from src.services.user_service import UserService

router = APIRouter()

@router.get("/", response_model=list[UserResponse])
async def list_users(db: Session = Depends(get_db)):
    return UserService.list_users(db)

@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    return UserService.create_user(db, user)

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    user = UserService.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

## 常用依赖

```txt
fastapi==0.100.0
uvicorn[standard]==0.23.0
sqlalchemy==2.0.0
alembic==1.11.0
pydantic[email]==2.0.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
```

---

**模板版本**：v1.0
