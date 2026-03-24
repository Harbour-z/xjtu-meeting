// pages/booking/booking.js - 预约表单
const api = require('../../utils/api')

Page({
    data: {
        roomId: null,
        roomName: '',
        date: '',
        startTime: '',
        endTime: '',
        // 表单数据
        teacherName: '',
        phone: '',
        purpose: '',
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

        // 尝试读取缓存的老师姓名
        const savedName = wx.getStorageSync('teacherName')
        if (savedName) {
            this.setData({ teacherName: savedName })
        }
    },

    // 输入处理
    onNameInput(e) {
        this.setData({ teacherName: e.detail })
    },

    onPhoneInput(e) {
        this.setData({ phone: e.detail })
    },

    onPurposeInput(e) {
        this.setData({ purpose: e.detail })
    },

    // 提交预约
    async onSubmit() {
        const { roomId, date, startTime, endTime, teacherName, phone, purpose } = this.data

        // 验证
        if (!teacherName.trim()) {
            wx.showToast({ title: '请输入姓名', icon: 'none' })
            return
        }

        if (!phone.trim()) {
            wx.showToast({ title: '请输入联系电话', icon: 'none' })
            return
        }

        // 简单的手机号验证
        if (!/^1[3-9]\d{9}$/.test(phone)) {
            wx.showToast({ title: '请输入正确的手机号', icon: 'none' })
            return
        }

        try {
            this.setData({ submitting: true })

            await api.createBooking({
                room_id: parseInt(roomId),
                date,
                start_time: startTime,
                end_time: endTime,
                teacher_name: teacherName.trim(),
                phone: phone.trim(),
                purpose: purpose.trim() || null
            })

            // 缓存老师姓名
            wx.setStorageSync('teacherName', teacherName.trim())

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
    }
})