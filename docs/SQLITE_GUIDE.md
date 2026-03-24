# SQLite 安装与使用详细指南

## 一、SQLite 简介

### 1.1 什么是 SQLite？

SQLite 是一个**嵌入式 SQL 数据库引擎**，不同于 MySQL、PostgreSQL 等需要独立运行的数据库服务，SQLite 直接嵌入到应用程序中运行。

```
传统数据库:
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   应用程序   │─────▶│  数据库服务  │─────▶│   数据文件   │
└─────────────┘      │ (独立进程)  │      └─────────────┘
                     └─────────────┘
                     需要安装、配置、启动

SQLite:
┌─────────────┐      ┌─────────────┐
│   应用程序   │─────▶│   数据文件   │
└─────────────┘      │  (.db文件)  │
      │              └─────────────┘
      │
      └── SQLite 引擎嵌入在应用程序中
          无需独立服务
```

### 1.2 SQLite 的特点

| 优点     | 说明                             |
| -------- | -------------------------------- |
| 零配置   | 无需安装、无需配置、无需启动服务 |
| 轻量级   | 整个数据库就是一个文件，易于部署 |
| 无服务器 | 不需要独立的数据库服务器进程     |
| 单文件   | 数据库就是一个文件，备份只需复制 |
| 跨平台   | 支持所有主流操作系统             |
| 免费     | 公有领域，无版权限制             |

| 局限性   | 说明                           |
| -------- | ------------------------------ |
| 并发写入 | 同一时间只允许一个写入者       |
| 网络     | 不支持网络访问（只能本地文件） |
| 大数据量 | 单表建议不超过几百万行         |

### 1.3 适用场景

✅ **适合使用 SQLite：**
- 中小型网站和应用（日访问量 < 10万）
- 移动应用（iOS/Android 都内置 SQLite）
- 桌面应用
- 嵌入式设备
- 开发和测试环境
- 数据分析和报告

❌ **不适合使用 SQLite：**
- 大型高并发应用
- 需要网络访问数据库
- 需要复杂事务的场景
- 数据量特别大（GB级别以上）

---

## 二、安装 SQLite

### 2.1 macOS

macOS **系统自带 SQLite**，通常无需安装：

```bash
# 检查是否已安装
sqlite3 --version
# 输出示例: 3.39.5 2022-10-14 22:05:37 ...

# 如果需要安装最新版本，使用 Homebrew
brew install sqlite

# 安装后检查
sqlite3 --version
```

### 2.2 Ubuntu / Debian

```bash
# 更新包列表
sudo apt update

# 安装 SQLite
sudo apt install sqlite3

# 安装 SQLite 开发库（编译 Python sqlite3 模块需要）
sudo apt install libsqlite3-dev

# 验证安装
sqlite3 --version
```

### 2.3 CentOS / RHEL / Fedora

```bash
# CentOS/RHEL
sudo yum install sqlite

# Fedora
sudo dnf install sqlite

# 安装开发库
sudo yum install sqlite-devel

# 验证安装
sqlite3 --version
```

### 2.4 Windows

#### 方式一：官方网站下载

1. 访问 SQLite 官网下载页面：https://www.sqlite.org/download.html
2. 下载以下文件：
   - `sqlite-tools-win32-*.zip`（命令行工具）
   - `sqlite-dll-win32-*.zip`（动态链接库，可选）
3. 解压到一个文件夹，例如 `C:\sqlite`
4. 添加到系统环境变量 PATH：
   - 右键「此电脑」→「属性」→「高级系统设置」
   - 点击「环境变量」
   - 在「系统变量」中找到 `Path`，点击「编辑」
   - 添加 `C:\sqlite`
5. 打开新的命令提示符，验证：

```cmd
sqlite3 --version
```

#### 方式二：使用 Chocolatey（Windows 包管理器）

```powershell
# 安装 Chocolatey（如果未安装）
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))

# 安装 SQLite
choco install sqlite

# 验证
sqlite3 --version
```

#### 方式三：使用 Scoop

```powershell
# 安装 Scoop（如果未安装）
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# 安装 SQLite
scoop install sqlite

# 验证
sqlite3 --version
```

### 2.5 Python 中的 SQLite

Python **标准库已包含 sqlite3 模块**，无需额外安装：

```python
import sqlite3

# 测试连接
conn = sqlite3.connect(':memory:')  # 内存数据库
print(sqlite3.sqlite_version)  # 输出 SQLite 版本
conn.close()
```

如果 Python 提示 `No module named 'sqlite3'`，需要重新编译 Python：

```bash
# Ubuntu/Debian
sudo apt install libsqlite3-dev
# 然后重新编译 Python

# CentOS/RHEL
sudo yum install sqlite-devel
# 然后重新编译 Python
```

---

## 三、命令行基础操作

### 3.1 创建/打开数据库

```bash
# 创建或打开数据库文件
sqlite3 mydb.db

# 如果文件不存在，会自动创建
# 如果文件存在，会打开现有数据库
```

### 3.2 基本命令

```sql
-- 进入 SQLite 命令行后：

-- 查看帮助
.help

-- 查看所有表
.tables

-- 查看表结构
.schema 表名

-- 查看表完整结构（包括索引）
.schema

-- 显示列标题（默认不显示）
.headers on

-- 设置输出格式
.mode column    -- 列模式
.mode list      -- 列表模式
.mode csv       -- CSV 格式
.mode json      -- JSON 格式

-- 退出
.exit
-- 或
.quit
```

### 3.3 SQL 基础操作

```sql
-- 创建表
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 插入数据
INSERT INTO users (name, email) VALUES ('张三', 'zhangsan@example.com');
INSERT INTO users (name, email) VALUES ('李四', 'lisi@example.com');

-- 查询数据
SELECT * FROM users;
SELECT name, email FROM users WHERE id = 1;

-- 更新数据
UPDATE users SET email = 'newemail@example.com' WHERE id = 1;

-- 删除数据
DELETE FROM users WHERE id = 2;

-- 删除表
DROP TABLE users;
```

### 3.4 导入导出数据

```bash
# 导出为 SQL 文件
sqlite3 mydb.db .dump > backup.sql

# 从 SQL 文件导入
sqlite3 newdb.db < backup.sql

# 导出为 CSV
sqlite3 mydb.db
sqlite> .mode csv
sqlite> .output users.csv
sqlite> SELECT * FROM users;
sqlite> .output stdout

# 导入 CSV
sqlite3 mydb.db
sqlite> .mode csv
sqlite> .import users.csv users
```

---

## 四、在 Python 中使用 SQLite

### 4.1 基础连接

```python
import sqlite3

# 连接数据库（文件不存在会自动创建）
conn = sqlite3.connect('example.db')

# 创建游标
cursor = conn.cursor()

# 执行 SQL
cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT
    )
''')

# 提交事务
conn.commit()

# 关闭连接
conn.close()
```

### 4.2 使用上下文管理器（推荐）

```python
import sqlite3

# 使用 with 语句，自动管理连接
with sqlite3.connect('example.db') as conn:
    cursor = conn.cursor()
    cursor.execute("INSERT INTO users (name, email) VALUES (?, ?)", ('王五', 'wangwu@example.com'))
    # 退出 with 块时自动 commit
```

### 4.3 参数化查询（防止 SQL 注入）

```python
import sqlite3

conn = sqlite3.connect('example.db')
cursor = conn.cursor()

# ✅ 正确：使用参数化查询
user_id = 1
cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))

# ❌ 错误：字符串拼接（有 SQL 注入风险）
# cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")

# 批量插入
users = [
    ('用户1', 'user1@example.com'),
    ('用户2', 'user2@example.com'),
    ('用户3', 'user3@example.com'),
]
cursor.executemany("INSERT INTO users (name, email) VALUES (?, ?)", users)

conn.commit()
conn.close()
```

### 4.4 获取查询结果

```python
import sqlite3

conn = sqlite3.connect('example.db')
cursor = conn.cursor()

cursor.execute("SELECT * FROM users")

# 获取一条记录
one_row = cursor.fetchone()
print(one_row)  # (1, '张三', 'zhangsan@example.com')

# 获取多条记录
cursor.execute("SELECT * FROM users")
many_rows = cursor.fetchmany(3)  # 获取 3 条

# 获取所有记录
cursor.execute("SELECT * FROM users")
all_rows = cursor.fetchall()
for row in all_rows:
    print(row)

conn.close()
```

### 4.5 使用 Row 对象（字典方式访问）

```python
import sqlite3

conn = sqlite3.connect('example.db')
conn.row_factory = sqlite3.Row  # 设置行工厂

cursor = conn.cursor()
cursor.execute("SELECT * FROM users")

for row in cursor:
    print(row['name'])      # 通过列名访问
    print(row['email'])     # 而不是 row[1]

conn.close()
```

---

## 五、本项目中的 SQLite 使用

### 5.1 项目结构

```
backend/
├── database.py      # 数据库连接配置
├── models.py        # SQLAlchemy 模型定义
├── crud.py          # CRUD 操作
├── main.py          # 应用入口
└── reserve.db       # SQLite 数据库文件（运行后生成）
```

### 5.2 数据库配置 (database.py)

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# 数据库文件路径
DB_PATH = os.path.join(os.path.dirname(__file__), "reserve.db")

# SQLite 连接字符串
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

# 创建引擎
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}  # SQLite 多线程支持
)

# 会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 模型基类
Base = declarative_base()

# 依赖注入函数
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 5.3 模型定义 (models.py)

```python
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Room(Base):
    """会议室模型"""
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    campus = Column(String(50), nullable=False)
    capacity = Column(Integer, default=20)
    location = Column(String(200))
    equipment = Column(Text)
    created_at = Column(DateTime, default=datetime.now)

    # 关联预约
    bookings = relationship("Booking", back_populates="room")


class Booking(Base):
    """预约模型"""
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    date = Column(String(10), nullable=False)
    start_time = Column(String(5), nullable=False)
    end_time = Column(String(5), nullable=False)
    teacher_name = Column(String(50), nullable=False)
    purpose = Column(Text)
    phone = Column(String(20))
    created_at = Column(DateTime, default=datetime.now)

    # 关联会议室
    room = relationship("Room", back_populates="bookings")
```

### 5.4 CRUD 操作 (crud.py)

```python
from sqlalchemy.orm import Session
import models, schemas

def get_rooms(db: Session, campus: str = None):
    """获取会议室列表"""
    query = db.query(models.Room)
    if campus:
        query = query.filter(models.Room.campus == campus)
    return query.all()

def create_room(db: Session, room: schemas.RoomCreate):
    """创建会议室"""
    db_room = models.Room(**room.model_dump())
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    return db_room

def create_booking(db: Session, booking: schemas.BookingCreate):
    """创建预约"""
    db_booking = models.Booking(**booking.model_dump())
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    return db_booking
```

### 5.5 初始化数据库 (main.py)

```python
from database import init_db

@app.on_event("startup")
def startup():
    """应用启动时初始化数据库"""
    init_db()  # 创建表（如果不存在）
```

---

## 六、数据库维护

### 6.1 查看数据库内容

```bash
# 进入数据库
cd backend
sqlite3 reserve.db

# 查看所有表
.tables

# 查看会议室
SELECT * FROM rooms;

# 查看预约
SELECT * FROM bookings;

# 退出
.exit
```

### 6.2 备份数据库

```bash
# 方式一：复制文件
cp backend/reserve.db backend/reserve.db.backup

# 方式二：导出 SQL
sqlite3 backend/reserve.db .dump > backup.sql

# 方式三：使用 SQLite 命令
sqlite3 backend/reserve.db
sqlite> .backup 'reserve_backup.db'
```

### 6.3 恢复数据库

```bash
# 从 SQL 文件恢复
sqlite3 new_reserve.db < backup.sql

# 或直接复制备份文件
cp reserve.db.backup reserve.db
```

### 6.4 数据库优化

```bash
sqlite3 reserve.db

-- 优化数据库（整理碎片）
VACUUM;

-- 分析统计信息（优化查询计划）
ANALYZE;

-- 查看数据库信息
.database
```

### 6.5 数据库完整性检查

```bash
sqlite3 reserve.db

-- 完整性检查
PRAGMA integrity_check;

-- 检查外键约束
PRAGMA foreign_key_check;
```

---

## 七、常见问题

### Q1: SQLite 数据库文件在哪里？

```
backend/reserve.db
```

这是一个普通的二进制文件，可以直接复制、备份、移动。

### Q2: 如何查看数据库大小？

```bash
ls -lh backend/reserve.db
# -rw-r--r-- 1 user user 12K Mar 24 16:19 reserve.db
```

### Q3: 数据库被锁定怎么办？

```bash
# 查看是否有其他进程在使用
lsof reserve.db

# 如果有 SQLite 锁文件，删除它
rm reserve.db-journal
rm reserve.db-wal
rm reserve.db-shm
```

### Q4: 如何迁移到 MySQL/PostgreSQL？

1. 导出数据：
```bash
sqlite3 reserve.db .dump > data.sql
```

2. 修改 SQL 语法（SQLite 和 MySQL/PostgreSQL 有细微差异）

3. 在 MySQL/PostgreSQL 中导入

4. 修改 Python 连接配置

### Q5: 如何加密 SQLite 数据库？

SQLite 本身不支持加密，但可以使用：

- **SQLCipher**：加密版本的 SQLite
- **SEE**：SQLite 官方加密扩展

```bash
# 安装 SQLCipher
pip install sqlcipher3

# 使用加密数据库
from sqlcipher3 import dbapi2 as sqlite3
conn = sqlite3.connect('encrypted.db')
conn.execute("PRAGMA key='your-password'")
```

---

## 八、性能调优

### 8.1 创建索引

```sql
-- 为常用查询字段创建索引
CREATE INDEX idx_bookings_date ON bookings(date);
CREATE INDEX idx_bookings_room_id ON bookings(room_id);
CREATE INDEX idx_bookings_teacher ON bookings(teacher_name);
```

### 8.2 使用事务

```python
# 批量操作使用事务
with sqlite3.connect('reserve.db') as conn:
    cursor = conn.cursor()
    for i in range(1000):
        cursor.execute("INSERT INTO test (value) VALUES (?)", (i,))
    # 自动提交，性能更好
```

### 8.3 WAL 模式

```sql
-- 启用 Write-Ahead Logging 模式
-- 提高并发性能
PRAGMA journal_mode=WAL;

-- 查看当前模式
PRAGMA journal_mode;
```

### 8.4 内存数据库

对于临时数据或缓存，可以使用内存数据库：

```python
# 内存数据库，程序结束数据消失
conn = sqlite3.connect(':memory:')

# 或使用 SQLAlchemy
engine = create_engine('sqlite:///:memory:')
```

---

## 九、参考资料

- [SQLite 官方文档](https://www.sqlite.org/docs.html)
- [SQLite 教程](https://www.sqlitetutorial.net/)
- [Python sqlite3 文档](https://docs.python.org/3/library/sqlite3.html)
- [SQLAlchemy 文档](https://docs.sqlalchemy.org/)
- [SQLite 数据类型](https://www.sqlite.org/datatype3.html)
- [SQLite 限制](https://www.sqlite.org/limits.html)