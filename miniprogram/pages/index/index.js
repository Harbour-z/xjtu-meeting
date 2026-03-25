// pages/index/index.js - 首页
const api = require('../../utils/api')

Page({
    data: {
        campusList: [
            { code: 'xingqing', name: '兴庆校区' },
            { code: 'chuangxin', name: '创新港校区' }
        ],
        currentCampusIndex: 0,
        currentDate: '',
        dateDisplay: '',
        weekDay: '',
        rooms: [],
        loading: true,
        refreshing: false,
        showCalendar: false,
        minDate: 0,
        maxDate: 0,
        defaultDate: 0,
        // 用户信息
        userName: '',
        isBound: false
    },

    async onLoad() {
        // 先检查绑定状态
        await this.checkAuth()
        this.initData()
    },

    async onShow() {
        // 每次显示页面时检查绑定状态
        const app = getApp()
        if (app.globalData.userInfo && app.globalData.userInfo.isBound) {
            this.setData({
                userName: app.globalData.userInfo.name,
                isBound: true
            })
            // 刷新数据
            this.loadRooms()
        }
    },

    // 检查用户绑定状态
    async checkAuth() {
        const app = getApp()

        // 如果已有用户信息，直接使用
        if (app.globalData.userInfo && app.globalData.userInfo.isBound) {
            this.setData({
                userName: app.globalData.userInfo.name,
                isBound: true
            })
            return
        }

        // 尝试获取 openid 并检查绑定状态
        try {
            const openid = await app.getOpenid()
            const result = await api.getAuthStatus(openid)

            if (result.is_bound) {
                // 已绑定
                app.globalData.userInfo = {
                    openid: openid,
                    name: result.teacher_name,
                    employeeId: result.employee_id,
                    isBound: true
                }
                wx.setStorageSync('userInfo', app.globalData.userInfo)
                this.setData({
                    userName: result.teacher_name,
                    isBound: true
                })
            } else {
                // 未绑定，跳转到绑定页面
                wx.redirectTo({
                    url: `/pages/bind/bind?openid=${openid}`
                })
            }
        } catch (err) {
            console.error('检查绑定状态失败:', err)
            // 开发模式：允许继续使用
            // 生产模式：应该跳转到绑定页
        }
    },

    onPullDownRefresh() {
        this.setData({ refreshing: true })
        this.loadRooms().then(() => {
            wx.stopPullDownRefresh()
            this.setData({ refreshing: false })
        })
    },

    initData() {
        const app = getApp()
        const today = new Date()
        const dateStr = app.formatDate(today)

        // 查找当前校区的索引
        const campusIndex = this.data.campusList.findIndex(
            c => c.code === app.globalData.currentCampus
        )

        // 计算日历的日期范围（提前7天到提前1年）
        const minDate = today.getTime() - 7 * 24 * 60 * 60 * 1000
        const maxDate = today.getTime() + 365 * 24 * 60 * 60 * 1000
        const defaultDate = today.getTime()

        this.setData({
            currentDate: dateStr,
            currentCampusIndex: campusIndex >= 0 ? campusIndex : 0,
            dateDisplay: this.formatDateDisplay(today),
            weekDay: this.getWeekDay(today),
            minDate: minDate,
            maxDate: maxDate,
            defaultDate: defaultDate
        })

        this.loadRooms()
    },

    async loadRooms() {
        const { campusList, currentCampusIndex, currentDate } = this.data
        const campus = campusList[currentCampusIndex].code

        try {
            this.setData({ loading: true })
            const rooms = await api.getRooms(campus, currentDate)

            this.setData({
                rooms: rooms || [],
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

    // 校区切换
    onCampusChange(e) {
        const index = e.detail.name || e.currentTarget.dataset.index
        if (index === this.data.currentCampusIndex) return

        const app = getApp()
        app.globalData.currentCampus = this.data.campusList[index].code
        wx.setStorageSync('currentCampus', this.data.campusList[index].code)

        this.setData({ currentCampusIndex: index })
        this.loadRooms()
    },

    // 日期选择
    onDateChange(e) {
        const dateStr = e.detail
        const date = new Date(dateStr.replace(/-/g, '/'))

        this.setData({
            currentDate: dateStr,
            dateDisplay: this.formatDateDisplay(date),
            weekDay: this.getWeekDay(date)
        })

        this.loadRooms()
    },

    showDatePicker() {
        this.setData({ showCalendar: true })
    },

    onCalendarClose() {
        this.setData({ showCalendar: false })
    },

    onCalendarConfirm(e) {
        this.setData({ showCalendar: false })
        const timestamp = e.detail
        const dateStr = this.formatDateStr(timestamp)
        const date = new Date(dateStr.replace(/-/g, '/'))

        this.setData({
            currentDate: dateStr,
            dateDisplay: this.formatDateDisplay(date),
            weekDay: this.getWeekDay(date),
            defaultDate: timestamp
        })

        this.loadRooms()
    },

    formatDateStr(timestamp) {
        const date = new Date(timestamp)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    },

    // 点击会议室卡片
    onRoomTap(e) {
        const { id } = e.currentTarget.dataset
        wx.navigateTo({
            url: `/pages/room/room?id=${id}&date=${this.data.currentDate}`
        })
    },

    // 格式化日期显示
    formatDateDisplay(date) {
        const month = date.getMonth() + 1
        const day = date.getDate()
        const today = new Date()
        const isToday = date.toDateString() === today.toDateString()

        return isToday ? `今天 · ${month}月${day}日` : `${month}月${day}日`
    },

    // 获取星期
    getWeekDay(date) {
        const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
        return days[date.getDay()]
    }
})