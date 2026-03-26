// pages/bind/bind.js - 身份验证绑定页面
const api = require('../../utils/api')
const app = getApp()

Page({
    data: {
        openid: '',
        employeeId: '',
        name: '',
        loading: true,  // 初始为加载状态
        canSubmit: false
    },

    async onLoad(options) {
        // 先获取 openid
        let openid = ''

        if (options.openid && options.openid !== 'logout') {
            openid = options.openid
        } else {
            // 没有 openid 或退出登录，重新获取
            try {
                openid = await app.getOpenid()
            } catch (err) {
                console.error('获取 openid 失败:', err)
                openid = 'openid_' + Date.now()
            }
        }

        this.setData({ openid: openid })

        // 关键：检查这个 openid 是否已经绑定
        await this.checkAndAutoLogin(openid)
    },

    // 检查是否已绑定，如果已绑定则自动登录
    async checkAndAutoLogin(openid) {
        try {
            const result = await api.getAuthStatus(openid)

            if (result.is_bound) {
                // 已绑定，自动恢复登录
                app.globalData.userInfo = {
                    openid: openid,
                    name: result.teacher_name,
                    employeeId: result.employee_id,
                    isBound: true
                }
                wx.setStorageSync('userInfo', app.globalData.userInfo)

                wx.showToast({
                    title: '欢迎回来',
                    icon: 'success'
                })

                // 直接跳转首页
                setTimeout(() => {
                    wx.switchTab({ url: '/pages/index/index' })
                }, 1000)
            } else {
                // 未绑定，显示绑定表单
                this.setData({ loading: false })
            }
        } catch (err) {
            console.error('检查绑定状态失败:', err)
            this.setData({ loading: false })
        }
    },

    // 工号输入
    onEmployeeIdChange(e) {
        const value = e.detail.trim()
        this.setData({
            employeeId: value,
            canSubmit: value.length > 0 && this.data.name.length > 0
        })
    },

    // 姓名输入
    onNameChange(e) {
        const value = e.detail.trim()
        this.setData({
            name: value,
            canSubmit: value.length > 0 && this.data.employeeId.length > 0
        })
    },

    // 提交绑定
    async onSubmit() {
        if (!this.data.canSubmit || this.data.loading) return

        const { openid, employeeId, name } = this.data

        // 验证输入
        if (!employeeId || !name) {
            wx.showToast({
                title: '请填写完整信息',
                icon: 'none'
            })
            return
        }

        this.setData({ loading: true })

        try {
            const result = await api.bindUser(openid, employeeId, name)

            if (result.success) {
                // 绑定成功，保存用户信息
                app.globalData.userInfo = {
                    openid: openid,
                    employeeId: employeeId,
                    name: result.teacher_name || name,
                    isBound: true
                }
                wx.setStorageSync('userInfo', app.globalData.userInfo)

                wx.showToast({
                    title: '绑定成功',
                    icon: 'success'
                })

                // 延迟跳转到首页（tabBar 页面需要用 switchTab）
                setTimeout(() => {
                    wx.switchTab({ url: '/pages/index/index' })
                }, 1500)
            } else {
                wx.showToast({
                    title: result.message || '验证失败',
                    icon: 'none',
                    duration: 3000
                })
                this.setData({ loading: false })
            }
        } catch (err) {
            wx.showToast({
                title: err.detail || '网络错误',
                icon: 'none'
            })
            this.setData({ loading: false })
        }
    }
})