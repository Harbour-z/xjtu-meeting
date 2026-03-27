// pages/booking/booking.js - 预约表单
const api = require('../../utils/api')
const app = getApp()

Page({
    data: {
        roomId: null,
        roomName: '',
        date: '',
        startTime: '',
        endTime: '',
        // 表单数据
        teacherName: '',
        subject: '',
        purpose: '',
        // 用户信息
        userInfo: null,
        // 状态
        submitting: false
    },

    onLoad(options) {
        this.setData({
            roomId: options.room_id,
            roomName: decodeURIComponent(options.room_name || ''),
            date: options.date,
            startTime: options.start_time,
            endTime: options.end_time
        })

        // 从全局获取已登录用户信息
        const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo')
        if (userInfo && userInfo.name) {
            this.setData({
                userInfo: userInfo,
                teacherName: userInfo.name
            })
        }
    },

    // 输入处理
    onSubjectInput(e) {
        this.setData({ subject: e.detail })
    },

    onPurposeInput(e) {
        this.setData({ purpose: e.detail })
    },

    // 提交预约
    async onSubmit() {
        const { roomId, date, startTime, endTime, teacherName, subject, purpose } = this.data

        // 验证
        if (!teacherName) {
            wx.showToast({ title: '请先登录', icon: 'none' })
            return
        }

        try {
            this.setData({ submitting: true })

            // 获取客户端当前时间
            const now = new Date()
            const clientDate = this.formatDate(now)
            const clientTime = this.formatTime(now)

            await api.createBooking({
                room_id: parseInt(roomId),
                date,
                start_time: startTime,
                end_time: endTime,
                teacher_name: teacherName,
                subject: subject.trim() || null,
                purpose: purpose.trim() || null,
                client_date: clientDate,
                client_time: clientTime
            })

            wx.showToast({
                title: '预约成功',
                icon: 'success'
            })

            // 延迟返回
            setTimeout(() => {
                wx.navigateBack({ delta: 2 })
            }, 1500)
        } catch (err) {
            wx.showToast({
                title: err.detail || '预约失败',
                icon: 'none'
            })
        } finally {
            this.setData({ submitting: false })
        }
    },

    // 格式化日期 YYYY-MM-DD
    formatDate(date) {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    },

    // 格式化时间 HH:MM
    formatTime(date) {
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        return `${hours}:${minutes}`
    }
})