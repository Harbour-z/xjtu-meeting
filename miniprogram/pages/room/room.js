// pages/room/room.js - 会议室详情
const api = require('../../utils/api')

Page({
    data: {
        roomId: null,
        room: null,
        date: '',
        slots: [],
        loading: true,
        // 时间选择器（24小时制）
        timePickerRange: [[], []], // [小时列表, 分钟列表]
        startTimeIndex: [0, 0],
        endTimeIndex: [0, 0],
        startTime: '',
        endTime: '',
        canBook: false,
        timeConflict: false,
        timeConflictMsg: '',
        // 时段详情弹窗
        showSlotInfo: false,
        selectedSlot: null
    },

    onLoad(options) {
        this.initTimePicker()
        this.setData({
            roomId: options.id,
            date: options.date || this.formatDate(new Date())
        })
        this.loadRoomData()
    },

    // 初始化时间选择器（24小时制，精确到分钟）
    initTimePicker() {
        const hours = []
        const minutes = []

        // 工作时间 07:00 - 23:00
        for (let h = 7; h <= 23; h++) {
            hours.push(String(h).padStart(2, '0'))
        }

        // 分钟 00-59
        for (let m = 0; m < 60; m++) {
            minutes.push(String(m).padStart(2, '0'))
        }

        this.setData({
            timePickerRange: [hours, minutes]
        })
    },

    async loadRoomData() {
        const { roomId, date } = this.data

        try {
            this.setData({ loading: true })

            // 并行获取会议室信息和时间线
            const [room, timeline] = await Promise.all([
                api.getRoom(roomId),
                api.getRoomTimeline(roomId, date)
            ])

            this.setData({
                room,
                slots: timeline.slots,
                loading: false
            })

            // 设置页面标题
            wx.setNavigationBarTitle({
                title: room.name
            })
        } catch (err) {
            this.setData({ loading: false })
            wx.showToast({
                title: err.detail || '加载失败',
                icon: 'none'
            })
        }
    },

    // 点击时间段
    onSlotTap(e) {
        const { index } = e.currentTarget.dataset
        const slot = this.data.slots[index]

        if (slot.status === 'fully_booked') {
            // 已约满，显示详情
            this.setData({
                showSlotInfo: true,
                selectedSlot: slot
            })
        } else if (slot.status === 'partially_booked') {
            // 部分占用，显示详情并可快速预约
            this.setData({
                showSlotInfo: true,
                selectedSlot: slot
            })
        } else {
            // 空闲，快速选择
            this.quickSelectTime(slot.start_time)
        }
    },

    // 快速选择时间
    quickSelectTime(startTime) {
        const parts = startTime.split(':')
        const hour = parseInt(parts[0])
        const minute = parseInt(parts[1])

        // 设置开始时间
        const startHourIndex = hour - 7
        const startMinuteIndex = minute

        // 默认结束时间为开始时间后1小时
        let endHour = hour + 1
        let endMinute = minute
        if (endHour > 23) {
            endHour = 23
            endMinute = 0
        }

        const endHourIndex = endHour - 7
        const endMinuteIndex = endMinute

        this.setData({
            startTimeIndex: [startHourIndex, startMinuteIndex],
            endTimeIndex: [endHourIndex, endMinuteIndex],
            startTime: startTime,
            endTime: `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`
        }, () => this.validateTime())
    },

    closeSlotInfo() {
        this.setData({ showSlotInfo: false, selectedSlot: null })
    },

    // 快速预约（从弹窗）
    quickBook() {
        const slot = this.data.selectedSlot
        if (!slot || slot.status === 'fully_booked') return

        // 使用最早可预约时间
        const startTime = slot.earliest_available || slot.start_time
        this.setData({
            showSlotInfo: false
        })
        this.quickSelectTime(startTime)
    },

    // 开始时间选择
    onStartTimeChange(e) {
        const index = e.detail.value
        const time = this.indexToTime(index)
        this.setData({
            startTimeIndex: index,
            startTime: time
        }, () => this.validateTime())
    },

    // 结束时间选择
    onEndTimeChange(e) {
        const index = e.detail.value
        const time = this.indexToTime(index)
        this.setData({
            endTimeIndex: index,
            endTime: time
        }, () => this.validateTime())
    },

    // 索引转时间
    indexToTime(index) {
        const [hourIndex, minuteIndex] = index
        const hours = this.data.timePickerRange[0]
        const minutes = this.data.timePickerRange[1]
        return `${hours[hourIndex]}:${minutes[minuteIndex]}`
    },

    // 列滚动回调（可选）
    onStartColumnChange(e) {
        // 可以在这里处理联动逻辑
    },

    onEndColumnChange(e) {
        // 可以在这里处理联动逻辑
    },

    // 验证时间
    validateTime() {
        const { startTime, endTime, slots } = this.data

        // 重置状态
        this.setData({
            canBook: false,
            timeConflict: false,
            timeConflictMsg: ''
        })

        if (!startTime || !endTime) {
            return
        }

        // 检查开始时间是否小于结束时间
        if (startTime >= endTime) {
            this.setData({
                timeConflict: true,
                timeConflictMsg: '结束时间必须晚于开始时间'
            })
            return
        }

        // 检查是否与已有预约冲突
        for (const slot of slots) {
            for (const booking of slot.bookings) {
                // 检查时间重叠
                if (startTime < booking.end_time && endTime > booking.start_time) {
                    this.setData({
                        timeConflict: true,
                        timeConflictMsg: `与 ${booking.teacher_name} 的预约冲突（${booking.start_time}-${booking.end_time}）`
                    })
                    return
                }
            }
        }

        // 验证通过
        this.setData({ canBook: true })
    },

    // 确认预约
    onBookTap() {
        const { startTime, endTime, roomId, date, room } = this.data

        if (!startTime || !endTime) {
            wx.showToast({
                title: '请选择预约时间',
                icon: 'none'
            })
            return
        }

        // 跳转到预约表单页
        wx.navigateTo({
            url: `/pages/booking/booking?room_id=${roomId}&room_name=${encodeURIComponent(room.name)}&date=${date}&start_time=${startTime}&end_time=${endTime}`
        })
    },

    // 刷新
    onRefresh() {
        this.setData({
            startTimeIndex: [0, 0],
            endTimeIndex: [0, 0],
            startTime: '',
            endTime: '',
            canBook: false,
            timeConflict: false
        })
        this.loadRoomData()
    },

    formatDate(date) {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }
})