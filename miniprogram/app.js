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

        // 尝试从缓存恢复用户信息
        const savedUserInfo = wx.getStorageSync('userInfo')
        if (savedUserInfo && savedUserInfo.isBound) {
            this.globalData.userInfo = savedUserInfo
            this.globalData.openid = savedUserInfo.openid || ''
        }
    },

    // 获取用户 openid（从云托管请求头中获取）
    getOpenid() {
        return new Promise((resolve, reject) => {
            // 如果已有 openid，直接返回
            if (this.globalData.openid) {
                resolve(this.globalData.openid)
                return
            }

            // 云托管环境下，通过云函数获取 openid
            wx.cloud.callFunction({
                name: 'getOpenId',
                config: {
                    env: this.globalData.cloudEnv
                }
            }).then(res => {
                if (res.result && res.result.openid) {
                    this.globalData.openid = res.result.openid
                    resolve(res.result.openid)
                } else {
                    reject(new Error('获取 openid 失败'))
                }
            }).catch(err => {
                console.error('获取 openid 失败:', err)
                // 开发环境使用模拟 openid
                const mockOpenid = 'mock_openid_' + Date.now()
                this.globalData.openid = mockOpenid
                resolve(mockOpenid)
            })
        })
    },

    // 检查用户绑定状态
    async checkBindStatus() {
        try {
            const openid = await this.getOpenid()
            const api = require('./utils/api')
            const result = await api.getAuthStatus(openid)

            if (result.is_bound) {
                // 已绑定，更新用户信息
                this.globalData.userInfo = {
                    openid: openid,
                    name: result.teacher_name,
                    employeeId: result.employee_id,
                    isBound: true
                }
                wx.setStorageSync('userInfo', this.globalData.userInfo)
                return true
            } else {
                // 未绑定
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