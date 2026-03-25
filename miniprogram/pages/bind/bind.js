// pages/bind/bind.js - 身份验证绑定页面
const api = require('../../utils/api')
const app = getApp()

Page({
    data: {
        openid: '',
        employeeId: '',
        name: '',
        loading: false,
        canSubmit: false
    },

    onLoad(options) {
        // 从参数获取 openid
        if (options.openid) {
            this.setData({ openid: options.openid })
        } else {
            // 如果没有 openid，返回首页重新获取
            wx.showToast({
                title: '登录状态异常',
                icon: 'none'
            })
            setTimeout(() => {
                wx.redirectTo({ url: '/pages/index/index' })
            }, 1500)
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

                // 延迟跳转到首页
                setTimeout(() => {
                    wx.redirectTo({ url: '/pages/index/index' })
                }, 1500)
            } else {
                wx.showToast({
                    title: result.message || '验证失败',
                    icon: 'none',
                    duration: 3000
                })
            }
        } catch (err) {
            wx.showToast({
                title: err.detail || '网络错误',
                icon: 'none'
            })
        } finally {
            this.setData({ loading: false })
        }
    }
})