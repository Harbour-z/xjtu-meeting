# 后端技术原理说明书

## 一、技术选型原理

### 1.1 为什么选择 FastAPI？

FastAPI 是一个现代、高性能的 Python Web 框架，选择它的原因：

| 特性         | 说明                                               |
| ------------ | -------------------------------------------------- |
| **高性能**   | 基于 Starlette 和 Pydantic，性能接近 Node.js 和 Go |
| **自动文档** | 自动生成 Swagger UI 和 ReDoc 文档，无需手写        |
| **类型提示** | 完全基于 Python 类型注解，编辑器支持好             |
| **异步支持** | 原生支持 async/await，适合高并发场景               |
| **数据验证** | 自动请求数据验证，减少重复代码                     |

### 1.2 为什么选择 SQLite？

SQLite 是一个轻量级的文件数据库，选择它的原因：

| 优势         | 说明                                   |
| ------------ | -------------------------------------- |
| **零配置**   | 无需安装独立的数据库服务，一个文件即可 |
| **轻量级**   | 整个数据库就是一个文件，部署简单       |
| **性能足够** | 对于中小型应用，性能完全够用           |
| **易于备份** | 复制文件即可完成备份                   |
| **免费开源** | 无需购买商业数据库授权                 |

**适用场景评估：**
- ✅ 预约系统用户量不大（全校教师）
- ✅ 读多写少（查询预约 > 创建预约）
- ✅ 部署简单，无需专业运维
- ❌ 如果未来用户量暴增，可平滑迁移到 PostgreSQL/MySQL

---

## 二、项目架构详解

### 2.1 目录结构说明

```
backend/
├── main.py          # 应用入口，路由定义
├── database.py      # 数据库连接配置
├── models.py        # SQLAlchemy 数据模型（表结构）
├── schemas.py       # Pydantic 数据验证模型
├── crud.py          # 数据库 CRUD 操作封装
├── requirements.txt # Python 依赖列表
├── reserve.db       # SQLite 数据库文件（运行后自动生成）
└── static/
    └── admin.html   # 管理后台页面
```

### 2.2 模块职责划分

```
┌─────────────────────────────────────────────────────────────┐
│                         main.py                              │
│  - FastAPI 应用实例                                          │
│  - 路由定义 (API 端点)                                       │
│  - 中间件配置 (CORS)                                         │
│  - 启动事件处理                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         crud.py                              │
│  - 数据库操作封装                                            │
│  - get_rooms(), create_booking(), etc.                      │
│  - 业务逻辑处理（时间冲突检测等）                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        models.py                             │
│  - SQLAlchemy ORM 模型                                       │
│  - Room 类 -> rooms 表                                       │
│  - Booking 类 -> bookings 表                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       database.py                            │
│  - 数据库连接引擎                                            │
│  - SessionLocal 会话工厂                                     │
│  - get_db() 依赖注入函数                                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        schemas.py                            │
│  - Pydantic 数据验证模型                                     │
│  - 请求体验证 (BookingCreate)                                │
│  - 响应格式定义 (RoomResponse)                               │
│  - 与 models.py 分离，实现关注点分离                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、SQLite 详解

### 3.1 SQLite 是什么？

SQLite 是一个嵌入式 SQL 数据库引擎，特点是：

```
传统数据库架构:
┌───────────┐     ┌───────────┐     ┌───────────┐
│  应用程序  │────▶│  数据库   │────▶│  数据文件  │
└───────────┘     │  服务进程 │     └───────────┘
                  └───────────┘
                  (需要独立运行)

SQLite 架构:
┌───────────┐     ┌───────────┐
│  应用程序  │────▶│  数据文件  │
└───────────┘     │ (.db文件)  │
                  └───────────┘
                  (无需独立服务)
```

### 3.2 安装 SQLite

**macOS:**
```bash
# macOS 自带 SQLite，无需安装
# 验证
sqlite3 --version
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install sqlite3
sqlite3 --version
```

**CentOS/RHEL:**
```bash
sudo yum install sqlite
sqlite3 --version
```

**Windows:**
1. 访问 https://www.sqlite.org/download.html
2. 下载 `sqlite-tools-win32-*.zip`
3. 解压到任意目录，添加到 PATH

### 3.3 Python 中使用 SQLite

本项目通过 SQLAlchemy ORM 使用 SQLite，无需直接写 SQL。

#### 3.3.1 连接配置 (database.py)

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# 数据库文件路径
DB_PATH = os.path.join(os.path.dirname(__file__), "reserve.db")

# 连接字符串格式: sqlite:///路径
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

# 创建引擎
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}  # SQLite 特有配置
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建基类
Base = declarative_base()
```

**关键点解释：**

| 配置                      | 说明                           |
| ------------------------- | ------------------------------ |
| `sqlite:///`              | SQLite 连接协议前缀            |
| `check_same_thread=False` | 允许多线程访问（FastAPI 需要） |
| `autocommit=False`        | 手动控制事务提交               |

#### 3.3.2 定义模型 (models.py)

```python
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Room(Base):
    """会议室模型 - 对应 rooms 表"""
    __tablename__ = "rooms"  # 表名

    # 字段定义
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    campus = Column(String(50), nullable=False)
    capacity = Column(Integer, default=20)
    location = Column(String(200))
    equipment = Column(Text)
    created_at = Column(DateTime, default=datetime.now)

    # 关联关系
    bookings = relationship("Booking", back_populates="room")
```

#### 3.3.3 数据操作 (crud.py)

```python
from sqlalchemy.orm import Session
import models, schemas

def get_rooms(db: Session, campus: str = None):
    """查询会议室列表"""
    query = db.query(models.Room)
    if campus:
        query = query.filter(models.Room.campus == campus)
    return query.all()

def create_booking(db: Session, booking: schemas.BookingCreate):
    """创建预约"""
    # 创建模型实例
    db_booking = models.Booking(**booking.model_dump())
    # 添加到会话
    db.add(db_booking)
    # 提交事务
    db.commit()
    # 刷新获取自增ID等
    db.refresh(db_booking)
    return db_booking
```

### 3.4 SQLite 数据类型映射

| Python 类型 | SQLite 类型    | SQLAlchemy 类型 |
| ----------- | -------------- | --------------- |
| int         | INTEGER        | Integer         |
| str         | TEXT           | String, Text    |
| float       | REAL           | Float           |
| bool        | INTEGER (0/1)  | Boolean         |
| datetime    | TEXT (ISO格式) | DateTime        |
| bytes       | BLOB           | LargeBinary     |

### 3.5 数据库初始化

```python
# main.py 中的初始化逻辑
@app.on_event("startup")
def startup():
    # 创建所有表（如果不存在）
    Base.metadata.create_all(bind=engine)

    # 插入示例数据
    db = SessionLocal()
    if len(crud.get_rooms(db)) == 0:
        init_sample_data(db)
    db.close()
```

### 3.6 常用 SQLite 命令

```bash
# 打开数据库
sqlite3 reserve.db

# 查看所有表
.tables

# 查看表结构
.schema rooms

# 查询数据
SELECT * FROM rooms;
SELECT * FROM bookings WHERE date = '2024-01-15';

# 插入数据
INSERT INTO rooms (name, campus, capacity, location)
VALUES ('新会议室', 'xingqing', 25, '主楼301');

# 更新数据
UPDATE rooms SET capacity = 30 WHERE id = 1;

# 删除数据
DELETE FROM bookings WHERE id = 1;

# 退出
.exit
```

---

## 四、FastAPI 核心原理

### 4.1 请求处理流程

```
客户端请求
    │
    ▼
┌─────────────────┐
│  ASGI 服务器    │  (uvicorn)
│  (uvicorn)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  中间件处理     │  (CORS、认证等)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  路由匹配       │  找到对应的处理函数
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  参数解析       │  路径参数、查询参数、请求体
│  数据验证       │  Pydantic 自动验证
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  依赖注入       │  get_db() 获取数据库会话
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  业务处理       │  CRUD 操作、业务逻辑
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  响应序列化     │  Pydantic 模型转 JSON
└────────┬────────┘
         │
         ▼
返回给客户端
```

### 4.2 依赖注入

FastAPI 的依赖注入系统是其核心特性之一：

```python
from fastapi import Depends
from sqlalchemy.orm import Session
from database import get_db

# 定义路由时声明依赖
@app.get("/api/rooms")
def get_rooms(
    campus: str = None,        # 查询参数
    db: Session = Depends(get_db)  # 依赖注入
):
    # db 会自动传入，无需手动创建
    return crud.get_rooms(db, campus)
```

**工作原理：**
1. 每次请求时，FastAPI 调用 `get_db()`
2. `get_db()` 创建数据库会话
3. 会话注入到路由函数
4. 请求结束后，会话自动关闭

### 4.3 Pydantic 数据验证

```python
from pydantic import BaseModel, Field

class BookingCreate(BaseModel):
    """创建预约的请求体验证"""
    room_id: int = Field(..., description="会议室ID")
    date: str = Field(..., description="预约日期")
    start_time: str = Field(..., description="开始时间")
    end_time: str = Field(..., description="结束时间")
    teacher_name: str = Field(..., min_length=1, max_length=50)
    phone: str = Field(None, pattern=r"^1[3-9]\d{9}$")  # 手机号正则
```

**自动验证效果：**
- 类型不匹配 → 返回 422 错误
- 字段缺失 → 返回详细错误信息
- 格式不对 → 返回具体错误位置

### 4.4 自动 API 文档

FastAPI 自动生成两种文档：

- **Swagger UI**: `/docs`
- **ReDoc**: `/redoc`

文档内容包括：
- 所有 API 端点
- 请求参数说明
- 请求体/响应体结构
- 在线测试功能

---

## 五、业务逻辑实现

### 5.1 时间冲突检测

```python
def check_time_conflict(db, room_id, date, start_time, end_time, exclude_id=None):
    """检查时间段是否冲突"""
    # 查询该会议室当天所有预约
    query = db.query(Booking).filter(
        Booking.room_id == room_id,
        Booking.date == date,
        # 时间段有交集的条件
        or_(
            and_(
                Booking.start_time < end_time,
                Booking.end_time > start_time
            )
        )
    )
    if exclude_id:
        query = queryfilter(Booking.id != exclude_id)

    return query.first() is not None
```

**时间冲突逻辑图解：**

```
已预约:      |--------|
新预约:  |------|           ❌ 冲突（开始时间在预约内）
新预约:           |------|  ❌ 冲突（结束时间在预约内）
新预约:  |--------------|   ❌ 冲突（完全包含）
新预约: |---|              ✅ 不冲突（在之前）
新预约:                 |--| ✅ 不冲突（在之后）
```

### 5.2 实时状态计算

```python
def get_room_current_status(db, room_id, target_date):
    """计算会议室当前状态"""
    current_time = datetime.now().strftime("%H:%M")

    # 获取当天所有预约
    bookings = get_room_bookings_for_date(db, room_id, target_date)

    # 检查当前是否被占用
    for booking in bookings:
        if booking.start_time <= current_time < booking.end_time:
            # 被占用，计算最早空闲时间
            return {
                "is_available": False,
                "earliest_available": booking.end_time
            }

    # 当前空闲，返回当前时间
    return {
        "is_available": True,
        "earliest_available": current_time
    }
```

---

## 六、性能优化建议

### 6.1 数据库索引

```python
# models.py 中添加索引
class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), index=True)  # 已有索引
    date = Column(String(10), nullable=False, index=True)  # 添加日期索引
    # ...
```

### 6.2 查询优化

```python
# 使用 join 减少查询次数
def get_bookings_with_room(db):
    return db.query(Booking).join(Room).all()
```

### 6.3 缓存策略（可选）

对于会议室列表等不常变动的数据，可以添加缓存：

```python
from functools import lru_cache
from datetime import datetime, timedelta

@lru_cache(maxsize=128)
def get_cached_rooms(campus: str, date: str):
    # 缓存 5 分钟
    return get_rooms_from_db(campus, date)
```

---

## 七、安全注意事项

### 7.1 生产环境配置

```python
# main.py 生产环境配置
app = FastAPI(
    docs_url=None,      # 禁用 /docs
    redoc_url=None,     # 禁用 /redoc
)

# 或者添加认证
from fastapi.security import HTTPBasic

@app.get("/admin")
def admin(credentials: HTTPBasic = Depends()):
    # 验证用户名密码
    pass
```

### 7.2 输入验证

```python
# schemas.py 中严格验证
from pydantic import validator

class BookingCreate(BaseModel):
    @validator('date')
    def validate_date(cls, v):
        # 检查是否是未来日期
        if v < date.today().isoformat():
            raise ValueError('不能预约过去的日期')
        return v
```

---

## 八、扩展方向

### 8.1 迁移到 PostgreSQL/MySQL

只需修改数据库连接配置：

```python
# database.py
# PostgreSQL
SQLALCHEMY_DATABASE_URL = "postgresql://user:pass@localhost/dbname"

# MySQL
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://user:pass@localhost/dbname"
```

### 8.2 添加用户认证

可以使用 JWT 或 OAuth2：

```python
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@app.get("/users/me")
def read_users_me(token: str = Depends(oauth2_scheme)):
    # 验证 token
    pass
```

### 8.3 添加消息通知

预约成功后发送邮件/短信通知：

```python
def send_notification(booking):
    # 发送邮件
    send_email(booking.teacher_name, booking.room_name)
    # 或发送短信
    send_sms(booking.phone, f"预约成功：{booking.room_name}")
```