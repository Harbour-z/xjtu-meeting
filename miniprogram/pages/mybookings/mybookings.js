// pages/mybookings/mybookings.js - 我的预约
const api = require('../../utils/api')

Page({
    data: {
        teacherName: '',
        bookings: [],
        loading: true,
        showNameInput: false
    },

    onLoad() {
        // 读取缓存的老师姓名
        const savedName = wx.getStorageSync('teacherName')
        if (savedName) {
            this.setData({ teacherName: savedName })
            this.loadBookings()
        } else {
            this.setData({ showNameInput: true, loading: false })
        }
    },

    onShow() {
        if (this.data.teacherName) {
            this.loadBookings()
        }
    },

    onPullDownRefresh() {
        this.loadBookings().then(() => {
            wx.stopPullDownRefresh()
        })
    },

    // 输入姓名
    onNameInput(e) {
        this.setData({ teacherName: e.detail })
    },

    // 确认姓名
    onNameConfirm() {
        const { teacherName } = this.data
        if (!teacherName.trim()) {
            wx.showToast({ title: '请输入姓名', icon: 'none' })
            return
        }

        wx.setStorageSync('teacherName', teacherName.trim())
        this.setData({ showNameInput: false })
        this.loadBookings()
    },

    // 加载预约列表
    async loadBookings() {
        const { teacherName } = this.data
        if (!teacherName) return

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

    // 判断是否过期
    isExpired(booking) {
        const now = new Date()
        const bookingTime = new Date(`${booking.date} ${booking.end_time}`)
        return bookingTime < now
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
    }
})