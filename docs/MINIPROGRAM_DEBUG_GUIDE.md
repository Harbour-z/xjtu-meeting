# 微信小程序本地调试指南

## 一、环境准备

### 1.1 下载微信开发者工具

1. 访问 [微信开发者工具官网](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 根据操作系统下载对应版本：
   - macOS: 选择 `darwin` 版本
   - Windows: 选择 `windows` 版本（64位或32位）
   - Linux: 选择 `linux` 版本

3. 安装完成后打开，使用微信扫码登录

### 1.2 获取小程序 AppID（可选）

本地调试可以不填 AppID，使用「测试号」即可。

如果需要正式 AppID：
1. 访问 [微信公众平台](https://mp.weixin.qq.com/)
2. 注册小程序账号
3. 在「开发管理」→「开发设置」中获取 AppID

---

## 二、导入项目

### 2.1 打开项目

1. 启动微信开发者工具
2. 点击左侧「小程序」
3. 点击「+」号或「导入项目」

4. 填写项目信息：

| 字段     | 填写内容                        |
| -------- | ------------------------------- |
| 项目名称 | xjtu-office-reserve（可自定义） |
| 目录     | 选择 `miniprogram` 文件夹路径   |
| AppID    | 可留空，使用测试号              |

```
目录路径示例：
/Users/harbour/coding/xjtu-office-reserve/miniprogram
```

5. 点击「确定」导入

### 2.2 项目结构说明

```
miniprogram/
├── pages/              # 页面文件夹
│   ├── index/          # 首页
│   ├── room/           # 会议室详情
│   ├── booking/        # 预约表单
│   └── mybookings/     # 我的预约
├── utils/              # 工具函数
│   └── api.js          # API 封装
├── images/             # 图片资源
├── app.js              # 小程序入口
├── app.json            # 全局配置
├── app.wxss            # 全局样式
└── project.config.json # 项目配置
```

---

## 三、安装依赖

### 3.1 安装 Node.js（如未安装）

**macOS:**
```bash
# 使用 Homebrew
brew install node

# 或下载安装包
# https://nodejs.org/
```

**Windows:**
- 下载 [Node.js 官网](https://nodejs.org/) 安装包
- 或使用 `winget install OpenJS.NodeJS.LTS`

**验证安装:**
```bash
node --version
npm --version
```

### 3.2 安装 Vant Weapp 组件

```bash
# 进入小程序目录
cd /Users/harbour/coding/xjtu-office-reserve/miniprogram

# 初始化 npm（如果没有 package.json）
npm init -y

# 安装 Vant Weapp
npm i @vant/weapp -S --production
```

### 3.3 构建 npm

**在微信开发者工具中：**

1. 点击菜单栏「工具」→「构建 npm」
2. 等待构建完成
3. 构建成功后会生成 `miniprogram_npm` 文件夹

![构建npm](https://img.yzcdn.cn/vant-weapp/build-npm.png)

---

## 四、配置后端地址

### 4.1 修改 API 地址

编辑 `miniprogram/app.js` 文件：

```javascript
App({
  globalData: {
    // 本地调试：使用本地地址
    apiBase: 'http://localhost:8000',

    // 真机调试：使用电脑局域网 IP
    // apiBase: 'http://192.168.1.100:8000',

    // 生产环境：使用服务器域名
    // apiBase: 'https://your-domain.com',

    currentCampus: 'xingqing',
    currentDate: ''
  },
  // ...
})
```

### 4.2 获取本机 IP（真机调试需要）

**macOS:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
# 输出类似: inet 192.168.1.100 netmask 0xffffff00 broadcast 192.168.1.255
```

**Windows:**
```cmd
ipconfig
# 查看 IPv4 地址
```

将获取到的 IP 地址填入 `apiBase`，例如：
```javascript
apiBase: 'http://192.168.1.100:8000'
```

### 4.3 关闭域名校验（仅开发环境）

**在微信开发者工具中：**

1. 点击右上角「详情」
2. 选择「本地设置」标签
3. 勾选「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」

![关闭域名校验](https://img.yzcdn.cn/vant-weapp/no-check-domain.png)

> ⚠️ 注意：此设置仅用于开发调试，正式发布必须使用 HTTPS 域名

---

## 五、本地调试步骤

### 5.1 启动后端服务

```bash
# 打开终端，进入后端目录
cd /Users/harbour/coding/xjtu-office-reserve/backend

# 启动服务
python3 main.py

# 看到以下输出表示启动成功
# INFO: Uvicorn running on http://0.0.0.0:8000
```

### 5.2 调试小程序

1. 在微信开发者工具中打开项目
2. 确保已安装依赖并构建 npm
3. 确保已关闭域名校验
4. 点击「编译」按钮

### 5.3 查看调试信息

**控制台输出：**
- 点击底部「调试器」面板
- 选择「Console」查看日志输出
- 选择「Network」查看网络请求

**常见日志：**
```javascript
// 在代码中使用 console.log 输出调试信息
console.log('当前校区:', this.data.currentCampus)
console.log('会议室列表:', res.data)
```

---

## 六、真机调试

### 6.1 准备工作

1. 手机和电脑连接**同一个 Wi-Fi**
2. 后端服务监听 `0.0.0.0`（已配置）
3. 获取电脑局域网 IP 地址
4. 修改 `app.js` 中的 `apiBase` 为电脑 IP

### 6.2 预览小程序

**方式一：扫码预览**

1. 点击开发者工具顶部「预览」按钮
2. 生成二维码
3. 用微信扫描二维码
4. 在手机上查看小程序

**方式二：真机调试**

1. 点击开发者工具顶部「真机调试」按钮
2. 选择「自动真机调试」或「手动真机调试」
3. 扫码后在手机上调试
4. 开发者工具会显示真机的调试信息

### 6.3 防火墙设置

如果手机无法访问后端，检查电脑防火墙：

**macOS:**
```
系统偏好设置 → 安全性与隐私 → 防火墙 → 防火墙选项
允许 Python 接受传入连接
```

**Windows:**
```
控制面板 → Windows Defender 防火墙 → 允许应用通过防火墙
添加 Python 到允许列表
```

---

## 七、常见问题

### Q1: 点击按钮没反应？

**检查点：**
1. 是否已安装 Vant Weapp 并构建 npm
2. 查看 Console 是否有报错
3. 检查事件绑定是否正确

### Q2: 网络请求失败？

**检查步骤：**
1. 确认后端服务是否启动
2. 确认 `apiBase` 地址是否正确
3. 确认是否关闭了域名校验
4. 查看 Network 面板的具体错误

**常见错误码：**
| 错误                             | 原因         | 解决方法     |
| -------------------------------- | ------------ | ------------ |
| `ERR_CONNECTION_REFUSED`         | 后端未启动   | 启动后端服务 |
| `net::ERR_INTERNET_DISCONNECTED` | 网络不通     | 检查网络连接 |
| `request:fail`                   | 域名校验失败 | 关闭域名校验 |

### Q3: npm 构建失败？

**解决方法：**
```bash
# 删除旧的依赖
rm -rf node_modules
rm -rf miniprogram_npm
rm package-lock.json

# 重新安装
npm install

# 然后在开发者工具中重新「构建 npm」
```

### Q4: 样式不生效？

**检查点：**
1. WXSS 文件是否正确引用
2. 类名是否正确
3. 是否使用了 Vant 组件但未在 `app.json` 中声明

### Q5: 真机无法访问后端？

**排查步骤：**
1. 确认手机和电脑在同一 Wi-Fi
2. 确认 `apiBase` 使用的是电脑 IP（不是 localhost）
3. 确认防火墙允许 8000 端口
4. 尝试用手机浏览器访问 `http://电脑IP:8000/api/campus`

---

## 八、调试技巧

### 8.1 使用 vconsole

在 `app.js` 中添加：

```javascript
// 开发环境开启调试
if (process.env.NODE_ENV === 'development') {
  wx.setEnableDebug({
    enableDebug: true
  })
}
```

### 8.2 网络请求封装

`utils/api.js` 中已封装了请求方法，可添加统一错误处理：

```javascript
function request(url, method = 'GET', data = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBase}${url}`,
      method,
      data,
      success(res) {
        console.log(`[API] ${method} ${url}`, res.data)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject(res.data)
        }
      },
      fail(err) {
        console.error(`[API Error] ${method} ${url}`, err)
        reject({ detail: '网络错误' })
      }
    })
  })
}
```

### 8.3 数据缓存调试

```javascript
// 查看缓存
wx.getStorageInfo({
  success(res) {
    console.log('缓存信息:', res)
  }
})

// 清除缓存
wx.clearStorage()
```

---

## 九、开发流程建议

```
1. 修改代码
     ↓
2. 保存文件（开发者工具会自动刷新）
     ↓
3. 查看 Console 是否有错误
     ↓
4. 查看 Network 确认 API 调用
     ↓
5. 在模拟器中测试功能
     ↓
6. 真机预览验证
     ↓
7. 完成
```

---

## 十、相关链接

- [微信小程序官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [Vant Weapp 组件文档](https://vant-contrib.gitee.io/vant-weapp/#/home)
- [微信开发者工具下载](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- [小程序注册](https://mp.weixin.qq.com/)