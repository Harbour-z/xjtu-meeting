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
        selectedSlot: null,
        // 当前时间相关
        currentDate: '',
        currentTime: ''
    },

    onLoad(options) {
        this.initTimePicker()
        this.updateCurrentTime()
        this.setData({
            roomId: options.id,
            date: options.date || this.formatDate(new Date())
        })
        this.loadRoomData()
    },

    onShow() {
        // 每次显示页面时更新当前时间
        this.updateCurrentTime()
    },

    // 更新当前时间
    updateCurrentTime() {
        const now = new Date()
        this.setData({
            currentDate: this.formatDate(now),
            currentTime: this.formatTime(now)
        })
    },

    // 格式化时间为 HH:MM
    formatTime(date) {
        const hour = String(date.getHours()).padStart(2, '0')
        const minute = String(date.getMinutes()).padStart(2, '0')
        return `${hour}:${minute}`
    },

    // 判断时间段是否已过去
    isSlotPassed(slotStartTime) {
        const { date, currentDate, currentTime } = this.data
        // 如果不是今天，不会过去
        if (date !== currentDate) return false
        // 时间段的结束时间是 XX:59，所以判断整点是否过去
        // 例如 8:00-8:59，如果当前时间是 9:00，则该时间段已过去
        const slotEndHour = parseInt(slotStartTime.split(':')[0]) + 1
        const slotEndTime = `${String(slotEndHour).padStart(2, '0')}:00`
        return currentTime >= slotEndTime
    },

    // 判断时间段是否正在进行中
    isSlotCurrent(slotStartTime) {
        const { date, currentDate, currentTime } = this.data
        // 如果不是今天，不在进行中
        if (date !== currentDate) return false
        // 判断当前时间是否在该时间段内
        // 例如 8:00-8:59，如果当前时间是 8:30，则正在进行
        const slotHour = parseInt(slotStartTime.split(':')[0])
        const slotStart = `${String(slotHour).padStart(2, '0')}:00`
        const slotEndHour = slotHour + 1
        const slotEnd = `${String(slotEndHour).padStart(2, '0')}:00`
        return currentTime >= slotStart && currentTime < slotEnd
    },

    // 获取当前时间的下一分钟
    getNextMinute() {
        const now = new Date()
        now.setMinutes(now.getMinutes() + 1)
        return this.formatTime(now)
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

        // 更新当前时间
        this.updateCurrentTime()

        // 判断时间段是否已过去
        const isPassed = this.isSlotPassed(slot.start_time)

        if (slot.status === 'fully_booked') {
            // 已约满，显示详情（即使过去也可以查看）
            this.setData({
                showSlotInfo: true,
                selectedSlot: { ...slot, isPassed }
            })
        } else if (slot.status === 'partially_booked') {
            // 部分占用，显示详情
            this.setData({
                showSlotInfo: true,
                selectedSlot: { ...slot, isPassed }
            })
        } else {
            // 空闲
            if (isPassed) {
                // 已过去的时间段，只能查看详情，不能快速选择
                this.setData({
                    showSlotInfo: true,
                    selectedSlot: { ...slot, isPassed }
                })
            } else {
                // 未过去的时间段，可以快速选择
                // 如果正在进行中，使用当前时间的下一分钟作为开始时间
                const isCurrent = this.isSlotCurrent(slot.start_time)
                if (isCurrent) {
                    const nextMinute = this.getNextMinute()
                    this.selectSlotTime(nextMinute, slot.end_time)
                } else {
                    this.selectSlotTime(slot.start_time, slot.end_time)
                }
            }
        }
    },

    // 选择时间段（设置开始和结束时间）
    selectSlotTime(startTime, endTime) {
        const startParts = startTime.split(':')
        const startHour = parseInt(startParts[0])
        const startMinute = parseInt(startParts[1])

        const endParts = endTime.split(':')
        const endHour = parseInt(endParts[0])
        const endMinute = parseInt(endParts[1])

        // 设置开始时间
        const startHourIndex = startHour - 7
        const startMinuteIndex = startMinute

        // 设置结束时间
        const endHourIndex = endHour - 7
        const endMinuteIndex = endMinute

        this.setData({
            startTimeIndex: [startHourIndex, startMinuteIndex],
            endTimeIndex: [endHourIndex, endMinuteIndex],
            startTime: startTime,
            endTime: endTime
        }, () => this.validateTime())
    },

    // 快速选择时间（仅设置开始时间，结束时间自动设为下一分钟）
    quickSelectTime(startTime) {
        const parts = startTime.split(':')
        const hour = parseInt(parts[0])
        const minute = parseInt(parts[1])

        // 设置开始时间
        const startHourIndex = hour - 7
        const startMinuteIndex = minute

        // 结束时间默认为开始时间的下一分钟（符合1分钟缓冲规则）
        let endHour = hour
        let endMinute = minute + 1
        if (endMinute >= 60) {
            endMinute = 0
            endHour += 1
        }
        // 不超过 23:00
        if (endHour > 23 || (endHour === 23 && endMinute > 0)) {
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
        if (!slot || slot.status === 'fully_booked' || slot.isPassed) {
            // 已约满或已过去的时间段不能预约
            if (slot && slot.isPassed) {
                wx.showToast({
                    title: '该时间段已过去',
                    icon: 'none'
                })
            }
            return
        }

        // 更新当前时间
        this.updateCurrentTime()

        // 如果是正在进行中的时间段，使用当前时间的下一分钟
        const isCurrent = this.isSlotCurrent(slot.start_time)
        let startTime
        if (isCurrent) {
            startTime = this.getNextMinute()
        } else {
            startTime = slot.earliest_available || slot.start_time
        }

        // 计算结束时间
        let endTime = slot.end_time
        if (slot.status === 'partially_booked' && slot.bookings && slot.bookings.length > 0) {
            // 找到第一个在 startTime 之后的预约，用它的开始时间作为结束时间
            const sortedBookings = [...slot.bookings].sort((a, b) => a.start_time.localeCompare(b.start_time))
            for (const booking of sortedBookings) {
                if (booking.start_time > startTime) {
                    endTime = booking.start_time
                    break
                }
            }
        }

        this.setData({
            showSlotInfo: false
        })
        this.selectSlotTime(startTime, endTime)
    },

    // 开始时间选择
    onStartTimeChange(e) {
        const index = e.detail.value
        const time = this.indexToTime(index)
        const currentEndTime = this.data.endTime

        // 只有当开始时间 >= 结束时间时，才自动调整结束时间
        let endTime = currentEndTime
        let endIndex = this.data.endTimeIndex

        if (!currentEndTime || time >= currentEndTime) {
            endTime = this.addOneMinute(time)
            endIndex = this.timeToIndex(endTime)
        }

        this.setData({
            startTimeIndex: index,
            startTime: time,
            endTimeIndex: endIndex,
            endTime: endTime
        }, () => this.validateTime())
    },

    // 时间加一分钟
    addOneMinute(timeStr) {
        const parts = timeStr.split(':')
        let hour = parseInt(parts[0])
        let minute = parseInt(parts[1])

        minute += 1
        if (minute >= 60) {
            minute = 0
            hour += 1
        }

        // 不超过 23:00
        if (hour > 23 || (hour === 23 && minute > 0)) {
            return '23:00'
        }

        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    },

    // 时间字符串转选择器索引
    timeToIndex(timeStr) {
        const parts = timeStr.split(':')
        const hour = parseInt(parts[0])
        const minute = parseInt(parts[1])

        // 小时索引：从7点开始，所以索引 = hour - 7
        const hourIndex = Math.max(0, Math.min(hour - 7, 16))
        const minuteIndex = minute

        return [hourIndex, minuteIndex]
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

        // 检查是否与已有预约冲突（包括相邻预约）
        for (const slot of slots) {
            for (const booking of slot.bookings) {
                // 相邻预约也算冲突（预约之间需有1分钟缓冲）
                if (startTime <= booking.end_time && endTime >= booking.start_time) {
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