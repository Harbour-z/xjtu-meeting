// pages/bookings/bookings.js - 预约情况页面
const api = require('../../utils/api')
const app = getApp()

// 校区列表
const campusList = [
    { code: 'all', name: '全部' },
    { code: 'xingqing', name: '兴庆校区' },
    { code: 'chuangxin', name: '创新港校区' }
]

Page({
    data: {
        currentDate: '',
        dateDisplay: '',
        weekDay: '',
        dateList: [],  // 7天日期列表
        currentCampusIndex: 0,
        campusList: campusList,
        bookings: [],
        groupedBookings: [],
        loading: true,
        // 日期时间
        clientDate: '',
        clientTime: '',
        // 日历
        showCalendar: false,
        minDate: 0,
        maxDate: 0,
        defaultDate: 0
    },

    onLoad() {
        this.initData()
    },

    async onShow() {
        this.updateCurrentTime()
        // 每次显示时验证绑定状态
        await this.verifyAuth()
    },

    // 验证绑定状态
    async verifyAuth() {
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
            } else {
                // 未绑定，清除本地缓存并跳转到绑定页面
                app.globalData.userInfo = null
                wx.removeStorageSync('userInfo')
                wx.switchTab({ url: '/pages/index/index' })
            }
        } catch (err) {
            console.error('验证绑定状态失败:', err)
            // 网络错误时不做处理，允许继续查看
        }
    },

    // 更新当前日期和时间
    updateCurrentTime() {
        const now = new Date()
        this.setData({
            clientDate: this.formatDate(now),
            clientTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
        })
    },

    // 初始化数据
    initData() {
        const today = new Date()
        const dateStr = this.formatDate(today)

        // 日历范围：最小日期为今天（不允许选择过去的日期），最多提前60天
        const minDate = today.getTime()
        const maxDate = today.getTime() + 60 * 24 * 60 * 60 * 1000  // 最多提前60天（约2个月）
        const defaultDate = today.getTime()

        // 生成7天日期列表
        const dateList = this.generateDateList()

        this.setData({
            currentDate: dateStr,
            dateDisplay: this.formatDateDisplay(today),
            weekDay: this.getWeekDay(today),
            dateList: dateList,
            minDate: minDate,
            maxDate: maxDate,
            defaultDate: defaultDate
        })

        this.loadBookings()
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

    // 格式化日期显示
    formatDateDisplay(dateObj) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const targetDate = new Date(dateObj)
        targetDate.setHours(0, 0, 0, 0)

        if (targetDate.getTime() === today.getTime()) {
            return '今天'
        } else if (targetDate.getTime() === tomorrow.getTime()) {
            return '明天'
        } else {
            const month = dateObj.getMonth() + 1
            const day = dateObj.getDate()
            const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
            return `${month}月${day}日 ${days[dateObj.getDay()]}`
        }
    },

    // 获取星期几
    getWeekDay(date) {
        const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
        return days[date.getDay()]
    },

    // 格式化日期为 YYYY-MM-DD
    formatDate(date) {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
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

        this.loadBookings()
    },

    // 校区切换
    onCampusChange(e) {
        const index = e.currentTarget.dataset.index
        if (index === this.data.currentCampusIndex) return

        this.setData({ currentCampusIndex: index })
        this.loadBookings()
    },

    // 显示日期选择器
    showDatePicker() {
        this.setData({ showCalendar: true })
    },

    // 日历关闭
    onCalendarClose() {
        this.setData({ showCalendar: false })
    },

    // 日历确认
    onCalendarConfirm(e) {
        const date = new Date(e.detail)
        const dateStr = this.formatDate(date)

        // 更新日期列表（如果选择的日期不在当前7天内）
        const dateList = this.data.dateList
        const isInList = dateList.find(d => d.date === dateStr)
        let newDateList = dateList

        if (!isInList) {
            // 重新生成以选中日期为基准的7天列表
            newDateList = []
            const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
            const selectedDate = new Date(date)

            for (let i = 0; i < 7; i++) {
                const d = new Date(selectedDate)
                d.setDate(selectedDate.getDate() + i)

                const year = d.getFullYear()
                const month = String(d.getMonth() + 1).padStart(2, '0')
                const day = String(d.getDate()).padStart(2, '0')
                const dStr = `${year}-${month}-${day}`

                newDateList.push({
                    date: dStr,
                    day: d.getDate(),
                    weekDay: weekDays[d.getDay()],
                    isToday: false,
                    display: weekDays[d.getDay()]
                })
            }
        }

        this.setData({
            currentDate: dateStr,
            dateDisplay: this.formatDateDisplay(date),
            weekDay: this.getWeekDay(date),
            showCalendar: false,
            dateList: newDateList
        })

        this.loadBookings()
    },

    // 下拉刷新
    onPullDownRefresh() {
        this.loadBookings().then(() => {
            wx.stopPullDownRefresh()
        })
    },

    // 加载预约数据
    async loadBookings() {
        const { currentDate, currentCampusIndex, campusList } = this.data
        const campus = campusList[currentCampusIndex].code

        this.setData({ loading: true })

        try {
            // 调用 API，campus 为 'all' 时不传参数
            const campusParam = campus === 'all' ? null : campus
            const bookings = await api.getBookings(currentDate, null, null, campusParam)

            // 按校区和会议室分组
            const grouped = this.groupBookings(bookings || [])

            this.setData({
                bookings: bookings || [],
                groupedBookings: grouped,
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

    // 按校区和会议室分组
    groupBookings(bookings) {
        const grouped = {}

        bookings.forEach(booking => {
            const campusKey = booking.campus || 'unknown'
            const campusName = campusKey === 'xingqing' ? '兴庆校区' : '创新港校区'
            const roomKey = booking.room_name

            if (!grouped[campusKey]) {
                grouped[campusKey] = {
                    campusName,
                    rooms: {}
                }
            }

            if (!grouped[campusKey].rooms[roomKey]) {
                grouped[campusKey].rooms[roomKey] = {
                    room_name: roomKey,
                    room_location: booking.room_location,
                    bookings: []
                }
            }

            // 添加状态
            const status = this.getBookingStatus(booking)
            grouped[campusKey].rooms[roomKey].bookings.push({
                ...booking,
                status
            })
        })

        // 转换为数组并按时间排序
        const result = Object.values(grouped).map(campusGroup => ({
            campusName: campusGroup.campusName,
            rooms: Object.values(campusGroup.rooms).map(room => ({
                ...room,
                bookings: room.bookings.sort((a, b) => a.start_time.localeCompare(b.start_time))
            }))
        }))

        return result
    },

    // 判断预约状态
    getBookingStatus(booking) {
        const { clientDate, clientTime } = this.data

        // 预约日期在当前日期之后 -> 待进行
        if (booking.date > clientDate) {
            return 'pending'
        }

        // 预约日期在当前日期之前 -> 已结束
        if (booking.date < clientDate) {
            return 'ended'
        }

        // 同一天，比较时间
        if (booking.start_time > clientTime) {
            return 'pending'
        } else if (booking.end_time <= clientTime) {
            return 'ended'
        } else {
            return 'ongoing'
        }
    }
})
