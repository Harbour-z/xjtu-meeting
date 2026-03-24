# 西安交通大学会议室预约系统

> 微信小程序 + FastAPI + SQLite 前后端分离架构

---

## 目录

- [项目概述](#项目概述)
- [技术架构](#技术架构)
- [快速开始](#快速开始)
- [后端部署指南](#后端部署指南)
- [小程序部署指南](#小程序部署指南)
- [API 接口文档](#api-接口文档)
- [数据库设计](#数据库设计)
- [常见问题](#常见问题)

---

## 项目概述

本系统为西安交通大学教师提供会议室预约服务，支持：

- **多校区支持**：兴庆校区、创新港校区
- **实时状态**：显示会议室当前是否空闲、最早可预约时间
- **时间线预约**：可视化选择预约时段
- **Web 管理界面**：管理员可通过 Web 界面进行预约和管理会议室
- **微信小程序**：教师通过微信小程序进行预约

### 页面入口

| 入口       | 地址       | 说明                                         |
| ---------- | ---------- | -------------------------------------------- |
| 首页       | `/`        | 系统入口导航页                               |
| 预约管理   | `/booking` | 管理员版用户界面，可查看教室情况、预约和取消 |
| 会议室管理 | `/admin`   | 会议室增删改管理                             |
| API 文档   | `/docs`    | Swagger UI 自动生成文档                      |

---

## 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                    微信小程序前端                         │
│         (原生小程序 + Vant Weapp UI组件库)               │
└─────────────────────────────────────────────────────────┘
                           │
                           │ HTTP/HTTPS
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    FastAPI 后端                          │
│    - RESTful API                                        │
│    - 自动生成 Swagger 文档                               │
│    - CORS 跨域支持                                      │
└─────────────────────────────────────────────────────────┘
                           │
                           │ SQLAlchemy ORM
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    SQLite 数据库                         │
│    - 轻量级文件数据库                                    │
│    - 无需独立数据库服务                                  │
│    - 数据文件: backend/reserve.db                       │
└─────────────────────────────────────────────────────────┘
```

### 技术栈说明

| 层级     | 技术             | 说明                              |
| -------- | ---------------- | --------------------------------- |
| 前端框架 | 微信小程序原生   | 无需学习 Vue/React，开发成本低    |
| UI 组件  | Vant Weapp       | 有赞开源，组件丰富美观            |
| 后端框架 | FastAPI (Python) | 现代 Python Web 框架，性能优异    |
| 数据验证 | Pydantic         | 自动数据验证，与 FastAPI 完美配合 |
| ORM      | SQLAlchemy       | Python 最流行的 ORM 框架          |
| 数据库   | SQLite           | 轻量级，无需配置，适合中小型应用  |

---

## 快速开始

### 环境要求

- Python 3.8+
- 微信开发者工具
- Node.js 16+ (用于安装小程序依赖)

### 本地开发启动

#### 1. 启动后端

```bash
# 进入后端目录
cd backend

# 安装依赖
pip install -r requirements.txt

# 启动服务
python main.py

# 后端将运行在 http://localhost:8000
# 首页导航: http://localhost:8000/
# 预约管理: http://localhost:8000/booking
# 会议室管理: http://localhost:8000/admin
# API 文档: http://localhost:8000/docs
```

#### 2. 启动小程序

```bash
# 进入小程序目录
cd miniprogram

# 安装 Vant Weapp 组件
npm install

# 或使用 yarn
yarn install
```

然后用微信开发者工具打开 `miniprogram` 目录即可预览。

---

## 后端部署指南

### 一、服务器环境准备

#### 1.1 安装 Python 3

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv
```

**CentOS/RHEL:**
```bash
sudo yum install python3 python3-pip
```

**验证安装:**
```bash
python3 --version
# 输出: Python 3.x.x
```

#### 1.2 创建虚拟环境（推荐）

```bash
# 创建项目目录
mkdir -p /opt/xjtu-office-reserve
cd /opt/xjtu-office-reserve

# 创建虚拟环境
python3 -m venv venv

# 激活虚拟环境
source venv/bin/activate

# 验证
which python
# 输出: /opt/xjtu-office-reserve/venv/bin/python
```

### 二、上传代码

```bash
# 方式1: 使用 git clone
git clone <your-repo-url> /opt/xjtu-office-reserve

# 方式2: 使用 scp 上传
scp -r ./backend user@server:/opt/xjtu-office-reserve/
```

### 三、安装依赖

```bash
cd /opt/xjtu-office-reserve/backend

# 激活虚拟环境
source ../venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 四、配置服务

#### 4.1 创建 systemd 服务

```bash
sudo nano /etc/systemd/system/xjtu-reserve.service
```

写入以下内容：

```ini
[Unit]
Description=XJTU Office Reserve API Server
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/xjtu-office-reserve/backend
Environment="PATH=/opt/xjtu-office-reserve/venv/bin"
ExecStart=/opt/xjtu-office-reserve/venv/bin/python main.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

#### 4.2 启动服务

```bash
# 重载 systemd 配置
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start xjtu-reserve

# 设置开机自启
sudo systemctl enable xjtu-reserve

# 查看状态
sudo systemctl status xjtu-reserve
```

### 五、Nginx 反向代理（推荐）

#### 5.1 安装 Nginx

```bash
sudo apt install nginx
```

#### 5.2 配置反向代理

```bash
sudo nano /etc/nginx/sites-available/xjtu-reserve
```

写入配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名

    # 强制 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 证书配置（使用 Let's Encrypt）
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # 反向代理到 FastAPI
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态文件缓存
    location /static/ {
        proxy_pass http://127.0.0.1:8000/static/;
        expires 7d;
    }
}
```

#### 5.3 启用配置

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/xjtu-reserve /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

### 六、SSL 证书配置

```bash
# 安装 certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

### 七、防火墙配置

```bash
# 开放 HTTP 和 HTTPS
sudo ufw allow 'Nginx Full'

# 查看状态
sudo ufw status
```

---

## 小程序部署指南

### 一、准备工作

#### 1.1 注册微信小程序

1. 访问 [微信公众平台](https://mp.weixin.qq.com/)
2. 注册小程序账号
3. 获取 AppID

#### 1.2 下载开发者工具

从 [微信开发者工具官网](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) 下载安装

### 二、配置项目

#### 2.1 修改 AppID

编辑 `miniprogram/project.config.json`：

```json
{
  "appid": "你的小程序AppID"
}
```

#### 2.2 修改后端地址

编辑 `miniprogram/app.js`：

```javascript
App({
  globalData: {
    // 修改为你的服务器地址（必须是 HTTPS）
    apiBase: 'https://your-domain.com',
    // ...
  }
})
```

#### 2.3 配置服务器域名

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入「开发」->「开发管理」->「开发设置」
3. 在「服务器域名」中添加你的域名

### 三、安装依赖

```bash
cd miniprogram

# 初始化 npm（如果没有 package.json）
npm init -y

# 安装 Vant Weapp
npm i @vant/weapp -S --production
```

### 四、构建 npm

在微信开发者工具中：
1. 点击「工具」->「构建 npm」
2. 等待构建完成

### 五、上传发布

1. 在开发者工具中点击「上传」
2. 填写版本号和备注
3. 登录微信公众平台提交审核
4. 审核通过后发布

---

## API 接口文档

### 基础信息

- **Base URL**: `https://your-domain.com`
- **文档地址**: `https://your-domain.com/docs` (Swagger UI)

### 接口列表

#### 1. 获取校区列表

```
GET /api/campus
```

**响应示例:**
```json
[
  {"code": "xingqing", "name": "兴庆校区"},
  {"code": "chuangxin", "name": "创新港校区"}
]
```

#### 2. 获取会议室列表

```
GET /api/rooms?campus=xingqing&date=2024-01-15
```

**参数:**
| 参数   | 必填 | 说明              |
| ------ | ---- | ----------------- |
| campus | 否   | 校区代码          |
| date   | 否   | 日期 (YYYY-MM-DD) |

**响应示例:**
```json
[
  {
    "id": 1,
    "name": "第一会议室",
    "campus": "xingqing",
    "capacity": 30,
    "location": "主楼201",
    "equipment": "投影仪,白板,空调",
    "is_available": true,
    "earliest_available": "08:00"
  }
]
```

#### 3. 获取会议室时间线

```
GET /api/rooms/{room_id}/timeline?date=2024-01-15
```

**响应示例:**
```json
{
  "room_id": 1,
  "room_name": "第一会议室",
  "date": "2024-01-15",
  "slots": [
    {
      "start_time": "08:00",
      "end_time": "08:30",
      "is_booked": false,
      "teacher_name": null
    },
    {
      "start_time": "08:30",
      "end_time": "09:00",
      "is_booked": true,
      "teacher_name": "张老师"
    }
  ]
}
```

#### 4. 创建预约

```
POST /api/bookings
```

**请求体:**
```json
{
  "room_id": 1,
  "date": "2024-01-15",
  "start_time": "09:00",
  "end_time": "11:00",
  "teacher_name": "张老师",
  "purpose": "组会",
  "phone": "13800138000"
}
```

**响应:** 返回创建的预约信息

#### 5. 取消预约

```
DELETE /api/bookings/{booking_id}
```

#### 6. 管理后台接口

```
GET    /api/admin/rooms       # 获取所有会议室
POST   /api/admin/rooms       # 添加会议室
PUT    /api/admin/rooms/{id}  # 修改会议室
DELETE /api/admin/rooms/{id}  # 删除会议室
```

---

## 数据库设计

### 表结构

#### rooms 表 - 会议室

| 字段       | 类型     | 说明                          |
| ---------- | -------- | ----------------------------- |
| id         | INTEGER  | 主键，自增                    |
| name       | TEXT     | 会议室名称                    |
| campus     | TEXT     | 校区代码 (xingqing/chuangxin) |
| capacity   | INTEGER  | 容纳人数                      |
| location   | TEXT     | 位置                          |
| equipment  | TEXT     | 设备说明                      |
| created_at | DATETIME | 创建时间                      |

#### bookings 表 - 预约记录

| 字段         | 类型     | 说明                  |
| ------------ | -------- | --------------------- |
| id           | INTEGER  | 主键，自增            |
| room_id      | INTEGER  | 会议室ID (外键)       |
| date         | TEXT     | 预约日期 (YYYY-MM-DD) |
| start_time   | TEXT     | 开始时间 (HH:MM)      |
| end_time     | TEXT     | 结束时间 (HH:MM)      |
| teacher_name | TEXT     | 预约老师姓名          |
| purpose      | TEXT     | 预约用途              |
| phone        | TEXT     | 联系电话              |
| created_at   | DATETIME | 创建时间              |

### 数据文件位置

```
backend/reserve.db
```

### 数据库管理

#### 查看数据

```bash
# 安装 sqlite3 命令行工具
sudo apt install sqlite3

# 打开数据库
sqlite3 backend/reserve.db

# 查询所有会议室
SELECT * FROM rooms;

# 查询所有预约
SELECT * FROM bookings;

# 退出
.exit
```

#### 备份数据库

```bash
# 备份
cp backend/reserve.db backend/reserve.db.backup

# 或使用 sqlite3 命令
sqlite3 backend/reserve.db ".backup 'backup.db'"
```

---

## 常见问题

### Q1: 小程序请求失败？

1. 检查后端是否正常运行
2. 检查域名是否配置 HTTPS
3. 检查小程序后台是否配置了服务器域名

### Q2: 如何修改端口？

编辑 `backend/main.py` 最后一行：

```python
uvicorn.run(app, host="0.0.0.0", port=8000)  # 改为你需要的端口
```

### Q3: 如何重置数据库？

```bash
# 停止服务
sudo systemctl stop xjtu-reserve

# 删除数据库文件
rm backend/reserve.db

# 重启服务（会自动创建新数据库和示例数据）
sudo systemctl start xjtu-reserve
```

### Q4: 如何查看日志？

```bash
# 查看服务日志
sudo journalctl -u xjtu-reserve -f

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/error.log
```

---

## 技术支持

如有问题，请联系开发团队。