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
        dateList: [],  // 7天日期列表
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
        // 每次显示页面时都向服务器验证绑定状态（安全关键！）
        await this.verifyAuthStatus()
    },

    // 向服务器验证绑定状态（安全关键）
    async verifyAuthStatus() {
        const app = getApp()
        try {
            const openid = await app.getOpenid()
            const result = await api.getAuthStatus(openid)

            if (result.is_bound) {
                // 已绑定，更新用户信息
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
                // 刷新数据
                this.loadRooms()
            } else {
                // 未绑定，清除本地缓存并跳转到绑定页面
                app.globalData.userInfo = null
                wx.removeStorageSync('userInfo')
                this.setData({
                    userName: '',
                    isBound: false
                })
                wx.redirectTo({
                    url: `/pages/bind/bind?openid=${openid}`
                })
            }
        } catch (err) {
            console.error('验证绑定状态失败:', err)
            // 网络错误时，使用本地缓存的用户信息（降级处理）
            const savedUserInfo = wx.getStorageSync('userInfo')
            if (savedUserInfo && savedUserInfo.isBound) {
                this.setData({
                    userName: savedUserInfo.name,
                    isBound: true
                })
                this.loadRooms()
            } else {
                // 无本地缓存，提示用户
                wx.showToast({
                    title: '网络错误，请重试',
                    icon: 'none'
                })
            }
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

        // 计算日历的日期范围（只能选择今天及以后的日期，最多提前60天）
        const minDate = today.getTime()  // 最小日期为今天，不允许选择过去的日期
        const maxDate = today.getTime() + 60 * 24 * 60 * 60 * 1000  // 最多提前60天（约2个月）
        const defaultDate = today.getTime()

        // 生成7天日期列表
        const dateList = this.generateDateList()

        this.setData({
            currentDate: dateStr,
            currentCampusIndex: campusIndex >= 0 ? campusIndex : 0,
            dateDisplay: this.formatDateDisplay(today),
            weekDay: this.getWeekDay(today),
            dateList: dateList,
            minDate: minDate,
            maxDate: maxDate,
            defaultDate: defaultDate
        })

        this.loadRooms()
    },

    // 生成未来7天的日期列表
    generateDateList() {
        const list = []
        const today = new Date()
        const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

        for (let i = 0; i < 7; i++) {
            const date = new Date(today)
            date.setDate(today.getDate() + i)

            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            const dateStr = `${year}-${month}-${day}`

            list.push({
                date: dateStr,
                day: date.getDate(),
                weekDay: weekDays[date.getDay()],
                isToday: i === 0,
                display: i === 0 ? '今天' : (i === 1 ? '明天' : weekDays[date.getDay()])
            })
        }

        return list
    },

    // 点击日期项
    onDateItemTap(e) {
        const { date } = e.currentTarget.dataset
        if (date === this.data.currentDate) return

        const dateObj = new Date(date.replace(/-/g, '/'))

        this.setData({
            currentDate: date,
            dateDisplay: this.formatDateDisplay(dateObj),
            weekDay: this.getWeekDay(dateObj)
        })

        this.loadRooms()
    },

    async loadRooms() {
        const { campusList, currentCampusIndex, currentDate } = this.data
        const campus = campusList[currentCampusIndex].code

        // 获取客户端当前时间（避免服务器时间不准确）
        const now = new Date()
        const curDate = this.formatDateForApi(now)
        const curTime = this.formatTimeForApi(now)

        try {
            this.setData({ loading: true })
            const rooms = await api.getRooms(campus, currentDate, curDate, curTime)

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

    // 格式化日期为 API 格式 YYYY-MM-DD
    formatDateForApi(date) {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    },

    // 格式化时间为 API 格式 HH:MM
    formatTimeForApi(date) {
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        return `${hours}:${minutes}`
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