// pages/mybookings/mybookings.js - 我的预约
const api = require('../../utils/api')
const app = getApp()

Page({
    data: {
        userInfo: null,
        bookings: [],
        loading: true,
        currentDate: '',
        currentTime: ''
    },

    onLoad() {
        this.checkUserInfo()
        this.updateCurrentTime()
    },

    onShow() {
        this.updateCurrentTime()
        this.loadBookings()
    },

    // 更新当前日期和时间
    updateCurrentTime() {
        const now = new Date()
        this.setData({
            currentDate: this.formatDate(now),
            currentTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
        })
    },

    // 检查用户信息
    checkUserInfo() {
        const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo')
        if (userInfo && userInfo.isBound) {
            this.setData({ userInfo })
        }
    },

    onPullDownRefresh() {
        this.loadBookings().then(() => {
            wx.stopPullDownRefresh()
        })
    },

    // 加载预约列表
    async loadBookings() {
        const { userInfo } = this.data
        const teacherName = userInfo ? userInfo.name : null

        if (!teacherName) {
            this.setData({ loading: false, bookings: [] })
            return
        }

        try {
            this.setData({ loading: true })
            const bookings = await api.getBookings(null, null, teacherName)

            // 按日期排序，最近的在前
            bookings.sort((a, b) => {
                const dateA = new Date(`${a.date} ${a.start_time}`)
                const dateB = new Date(`${b.date} ${b.start_time}`)
                return dateB - dateA
            })

            this.setData({
                bookings: bookings || [],
                loading: false
            })
        } catch (err) {
            this.setData({ loading: false })
            wx.showToast({
                title: err.detail || '加载失败',
                icon: 'none'
            })
        }
    },

    // 取消预约
    async onCancelBooking(e) {
        const { id } = e.currentTarget.dataset

        const res = await wx.showModal({
            title: '确认取消',
            content: '确定要取消这个预约吗？',
            confirmColor: '#ff4d4f'
        })

        if (!res.confirm) return

        try {
            await api.deleteBooking(id)
            wx.showToast({ title: '已取消', icon: 'success' })
            this.loadBookings()
        } catch (err) {
            wx.showToast({
                title: err.detail || '取消失败',
                icon: 'none'
            })
        }
    },

    // 判断预约状态：pending(待进行), ongoing(进行中), ended(已结束)
    getBookingStatus(booking) {
        const now = new Date()
        const today = this.formatDate(now)
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

        // 预约日期在当前日期之后 -> 待进行
        if (booking.date > today) {
            return 'pending'
        }

        // 预约日期在当前日期之前 -> 已结束
        if (booking.date < today) {
            return 'ended'
        }

        // 同一天，比较时间
        if (booking.start_time > currentTime) {
            // 开始时间还未到
            return 'pending'
        } else if (booking.end_time <= currentTime) {
            // 结束时间已过
            return 'ended'
        } else {
            // 当前时间在开始和结束之间
            return 'ongoing'
        }
    },

    // 判断是否过期
    isExpired(booking) {
        return this.getBookingStatus(booking) === 'ended'
    },

    // 格式化日期显示
    formatDateDisplay(dateStr) {
        const date = new Date(dateStr.replace(/-/g, '/'))
        const today = new Date()
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        if (date.toDateString() === today.toDateString()) {
            return '今天'
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return '明天'
        } else {
            const month = date.getMonth() + 1
            const day = date.getDate()
            const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
            return `${month}月${day}日 ${days[date.getDay()]}`
        }
    },

    // 格式化日期为 YYYY-MM-DD
    formatDate(date) {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }
})