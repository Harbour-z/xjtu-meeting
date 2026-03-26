// app.js - 小程序入口
App({
    globalData: {
        // 云环境ID
        cloudEnv: 'prod-3gptjz9l8a2f3d51',
        // 当前选择的校区
        currentCampus: 'xingqing',
        // 当前选择的日期
        currentDate: '',
        // 用户信息（绑定后才有）
        userInfo: null,
        // 用户 openid
        openid: ''
    },

    onLaunch() {
        // 初始化云开发
        if (wx.cloud) {
            wx.cloud.init({
                env: this.globalData.cloudEnv,
                traceUser: true
            })
        }

        // 初始化日期为今天
        const today = new Date()
        const dateStr = this.formatDate(today)
        this.globalData.currentDate = dateStr

        // 从缓存读取校区偏好
        const savedCampus = wx.getStorageSync('currentCampus')
        if (savedCampus) {
            this.globalData.currentCampus = savedCampus
        }

        // 尝试从缓存恢复用户信息（缓存可能被清除）
        const savedUserInfo = wx.getStorageSync('userInfo')
        if (savedUserInfo && savedUserInfo.isBound) {
            this.globalData.userInfo = savedUserInfo
            this.globalData.openid = savedUserInfo.openid || ''
        }
    },

    // 获取用户 openid
    // 优先级：缓存 > 云函数 > 后端API
    getOpenid() {
        return new Promise((resolve, reject) => {
            // 如果已有 openid，直接返回
            if (this.globalData.openid) {
                resolve(this.globalData.openid)
                return
            }

            // 方式1：尝试从云函数获取（生产环境推荐）
            if (wx.cloud) {
                wx.cloud.callFunction({
                    name: 'getOpenId',
                    config: {
                        env: this.globalData.cloudEnv
                    }
                }).then(res => {
                    if (res.result && res.result.openid) {
                        this.globalData.openid = res.result.openid
                        resolve(res.result.openid)
                        return
                    }
                }).catch(err => {
                    console.warn('云函数获取 openid 失败，尝试其他方式:', err)
                })
            }

            // 方式2：调用后端接口获取 openid（云托管环境）
            // 云托管会在请求头中自动带上 X-WX-OPENID
            const api = require('./utils/api')
            api.request('/api/auth/getOpenid', 'GET')
                .then(res => {
                    if (res.openid) {
                        this.globalData.openid = res.openid
                        resolve(res.openid)
                    } else {
                        reject(new Error('获取 openid 失败'))
                    }
                })
                .catch(err => {
                    console.error('获取 openid 失败:', err)
                    reject(err)
                })
        })
    },

    // 检查用户绑定状态（关键：用于缓存清除后恢复登录）
    async checkBindStatus() {
        try {
            const openid = await this.getOpenid()
            const api = require('./utils/api')
            const result = await api.getAuthStatus(openid)

            if (result.is_bound) {
                // 已绑定，自动恢复用户信息
                this.globalData.userInfo = {
                    openid: openid,
                    name: result.teacher_name,
                    employeeId: result.employee_id,
                    isBound: true
                }
                // 重新保存到缓存
                wx.setStorageSync('userInfo', this.globalData.userInfo)
                console.log('登录状态已恢复:', result.teacher_name)
                return true
            } else {
                // 未绑定，需要去绑定页面
                console.log('用户未绑定')
                return false
            }
        } catch (err) {
            console.error('检查绑定状态失败:', err)
            return false
        }
    },

    formatDate(date) {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }
})