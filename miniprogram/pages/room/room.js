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
        currentTime: '',
        // 多选时段相关
        selectedSlotIndices: [],    // 选中时段索引数组
        selectionAnchor: null       // 首次点击的时段索引
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
        if (date !== currentDate) return false
        // 30分钟时段：结束时间 = 开始时间 + 30分钟
        const parts = slotStartTime.split(':')
        const hour = parseInt(parts[0])
        const minute = parseInt(parts[1])
        let slotEndHour = hour
        let slotEndMinute = minute + 30
        if (slotEndMinute >= 60) {
            slotEndMinute = 0
            slotEndHour += 1
        }
        const slotEndTime = `${String(slotEndHour).padStart(2, '0')}:${String(slotEndMinute).padStart(2, '0')}`
        return currentTime >= slotEndTime
    },

    // 判断时间段是否正在进行中
    isSlotCurrent(slotStartTime) {
        const { date, currentDate, currentTime } = this.data
        if (date !== currentDate) return false
        // 30分钟时段：结束时间 = 开始时间 + 30分钟
        const parts = slotStartTime.split(':')
        const hour = parseInt(parts[0])
        const minute = parseInt(parts[1])
        let slotEndHour = hour
        let slotEndMinute = minute + 30
        if (slotEndMinute >= 60) {
            slotEndMinute = 0
            slotEndHour += 1
        }
        const slotEnd = `${String(slotEndHour).padStart(2, '0')}:${String(slotEndMinute).padStart(2, '0')}`
        return currentTime >= slotStartTime && currentTime < slotEnd
    },

    // 获取当前时间的下一分钟
    getNextMinute() {
        const now = new Date()
        now.setMinutes(now.getMinutes() + 1)
        return this.formatTime(now)
    },

    // 检查新时段是否与当前选择连续
    isSlotContinuous(newIndex) {
        const indices = this.data.selectedSlotIndices
        if (indices.length === 0) return true
        const minIndex = Math.min(...indices)
        const maxIndex = Math.max(...indices)
        return newIndex === minIndex - 1 || newIndex === maxIndex + 1
    },

    // 根据选中索引计算时间范围
    getTimeRangeFromIndices() {
        const indices = this.data.selectedSlotIndices
        if (indices.length === 0) return null
        const slots = this.data.slots
        const minIndex = Math.min(...indices)
        const maxIndex = Math.max(...indices)
        return {
            startTime: slots[minIndex].start_time,
            endTime: slots[maxIndex].end_time  // 直接使用时段的结束时间，不再转换
        }
    },

    // 显示结束时间转实际结束时间（XX:29→XX:30, XX:59→(XX+1):00）
    slotDisplayEndToActual(displayEnd) {
        const parts = displayEnd.split(':')
        let hour = parseInt(parts[0])
        let minute = parseInt(parts[1])
        minute += 1
        if (minute >= 60) {
            minute = 0
            hour += 1
        }
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    },

    // 处理时段多选逻辑
    handleSlotSelection(slotIndex, slot) {
        const indices = this.data.selectedSlotIndices
        const isSelected = indices.includes(slotIndex)

        if (indices.length === 0) {
            // 无选择时，设置首个选择
            this.setData({
                selectedSlotIndices: [slotIndex],
                selectionAnchor: slotIndex
            })
        } else if (isSelected) {
            // 点击已选中时段
            const minIndex = Math.min(...indices)
            const maxIndex = Math.max(...indices)

            if (indices.length === 1) {
                // 只有一个选中时段，清空所有
                this.setData({
                    selectedSlotIndices: [],
                    selectionAnchor: null,
                    startTime: '',
                    endTime: '',
                    startTimeIndex: [0, 0],
                    endTimeIndex: [0, 0],
                    canBook: false
                })
                return
            } else if (slotIndex === minIndex || slotIndex === maxIndex) {
                // 点击边缘时段，从边缘取消
                const newIndices = indices.filter(i => i !== slotIndex)
                this.setData({ selectedSlotIndices: newIndices })
            } else {
                // 点击中间时段，提示用户
                wx.showToast({
                    title: '请从边缘取消选择',
                    icon: 'none'
                })
                return
            }
        } else {
            // 点击未选中时段
            if (this.isSlotContinuous(slotIndex)) {
                // 连续，扩展选择
                this.setData({
                    selectedSlotIndices: [...indices, slotIndex]
                })
            } else {
                // 不连续，清空重选
                this.setData({
                    selectedSlotIndices: [slotIndex],
                    selectionAnchor: slotIndex
                })
            }
        }

        // 更新时间选择器
        this.updateTimeFromSlots()
    },

    // 计算最早可预约的开始时间（考虑当前时间是否在时段内）
    getEarliestStartTime(slotStartTime) {
        const { date, currentDate, currentTime } = this.data

        // 如果选择的日期不是今天，直接使用时段开始时间
        if (date !== currentDate) {
            return slotStartTime
        }

        // 将时段开始时间和当前时间转换为分钟数便于比较
        const slotParts = slotStartTime.split(':')
        const slotHour = parseInt(slotParts[0])
        const slotMinute = parseInt(slotParts[1])
        const slotTotalMinutes = slotHour * 60 + slotMinute

        const currentParts = currentTime.split(':')
        const currentHour = parseInt(currentParts[0])
        const currentMinute = parseInt(currentParts[1])
        const currentTotalMinutes = currentHour * 60 + currentMinute

        // 如果当前时间在时段内（时段开始到时段开始+30分钟）
        // 时段长度30分钟，所以时段结束时间 = 开始时间 + 30分钟
        const slotEndTotalMinutes = slotTotalMinutes + 30

        if (currentTotalMinutes >= slotTotalMinutes && currentTotalMinutes < slotEndTotalMinutes) {
            // 当前时间在时段内，使用当前时间的下一分钟作为最早开始时间
            let earliestHour = currentHour
            let earliestMinute = currentMinute + 1
            if (earliestMinute >= 60) {
                earliestMinute = 0
                earliestHour += 1
            }
            return `${String(earliestHour).padStart(2, '0')}:${String(earliestMinute).padStart(2, '0')}`
        }

        // 当前时间在时段之前或之后，直接使用时段开始时间
        return slotStartTime
    },

    // 根据选中的时段更新时间选择器
    updateTimeFromSlots() {
        const timeRange = this.getTimeRangeFromIndices()
        if (!timeRange) {
            this.setData({
                startTime: '',
                endTime: '',
                startTimeIndex: [0, 0],
                endTimeIndex: [0, 0],
                canBook: false
            })
            return
        }

        // 先更新当前时间，确保判断准确
        this.updateCurrentTime()

        const { startTime: slotStartTime, endTime } = timeRange

        // 计算最早可预约的开始时间（考虑当前时间是否在时段内）
        const startTime = this.getEarliestStartTime(slotStartTime)

        // 计算选择器索引
        const startParts = startTime.split(':')
        const startHour = parseInt(startParts[0])
        const startMinute = parseInt(startParts[1])

        const endParts = endTime.split(':')
        const endHour = parseInt(endParts[0])
        const endMinute = parseInt(endParts[1])

        const startHourIndex = startHour - 8
        const startMinuteIndex = startMinute
        const endHourIndex = endHour - 8
        const endMinuteIndex = endMinute

        this.setData({
            startTimeIndex: [startHourIndex, startMinuteIndex],
            endTimeIndex: [endHourIndex, endMinuteIndex],
            startTime: startTime,
            endTime: endTime
        }, () => this.validateTime())
    },

    // 初始化时间选择器（24小时制，精确到分钟）
    initTimePicker() {
        const hours = []
        const minutes = []

        // 工作时间 08:00 - 22:00
        for (let h = 8; h <= 22; h++) {
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

        // 获取客户端当前时间（避免服务器时间不准确）
        const now = new Date()
        const currentDate = this.formatDate(now)
        const currentTime = this.formatTime(now)

        try {
            this.setData({ loading: true })

            // 并行获取会议室信息和时间线
            const [room, timeline] = await Promise.all([
                api.getRoom(roomId),
                api.getRoomTimeline(roomId, date, currentDate, currentTime)
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
            // 部分占用，显示详情弹窗让用户查看预约信息
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
                // 未过去的时间段，使用多选逻辑
                this.handleSlotSelection(index, slot)
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

        // 设置开始时间索引
        const startHourIndex = startHour - 8
        const startMinuteIndex = startMinute

        // 设置结束时间索引
        const endHourIndex = endHour - 8
        const endMinuteIndex = endMinute

        this.setData({
            startTimeIndex: [startHourIndex, startMinuteIndex],
            endTimeIndex: [endHourIndex, endMinuteIndex],
            startTime: startTime,
            endTime: endTime
        }, () => this.validateTime())
    },

    // 设置时间选择器
    setTimePicker(startTime, endTime) {
        this.selectSlotTime(startTime, endTime)
    },

    // 快速选择时间（仅设置开始时间，结束时间自动设为下一分钟）
    quickSelectTime(startTime) {
        const parts = startTime.split(':')
        const hour = parseInt(parts[0])
        const minute = parseInt(parts[1])

        // 设置开始时间
        const startHourIndex = hour - 8
        const startMinuteIndex = minute

        // 结束时间默认为开始时间的下一分钟（符合1分钟缓冲规则）
        let endHour = hour
        let endMinute = minute + 1
        if (endMinute >= 60) {
            endMinute = 0
            endHour += 1
        }
        // 不超过 22:00
        if (endHour > 22 || (endHour === 22 && endMinute > 0)) {
            endHour = 22
            endMinute = 0
        }

        const endHourIndex = endHour - 8
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

        // 计算开始时间
        // 如果是正在进行中的时间段，使用当前时间的下一分钟
        const isCurrent = this.isSlotCurrent(slot.start_time)
        let startTime
        if (isCurrent) {
            startTime = this.getNextMinute()
        } else {
            // 使用最早可预约时间
            // 注意：earliest_available 是上一个预约的结束时间，需要加1分钟缓冲
            const earliest = slot.earliest_available || slot.start_time
            startTime = this.addOneMinute(earliest)
        }

        // 计算结束时间
        // 默认使用时间段的结束时间
        let endTime = slot.end_time
        if (slot.status === 'partially_booked' && slot.bookings && slot.bookings.length > 0) {
            // 找到第一个在 startTime 之后的预约，用它的开始时间减1分钟作为结束时间
            // 注意：需要1分钟缓冲时间，所以结束时间 = 下一个预约开始时间 - 1分钟
            const sortedBookings = [...slot.bookings].sort((a, b) => a.start_time.localeCompare(b.start_time))
            for (const booking of sortedBookings) {
                if (booking.start_time > startTime) {
                    endTime = this.subtractOneMinute(booking.start_time)
                    break
                }
            }
        }

        this.setData({
            showSlotInfo: false
        })
        this.selectSlotTime(startTime, endTime)
    },

    // 选择时间段（指定开始和结束时间）
    selectSlotTimeWithEnd(startTime, endTime) {
        const startParts = startTime.split(':')
        const startHour = parseInt(startParts[0])
        const startMinute = parseInt(startParts[1])

        const endParts = endTime.split(':')
        const endHour = parseInt(endParts[0])
        const endMinute = parseInt(endParts[1])

        // 设置开始时间
        const startHourIndex = startHour - 8
        const startMinuteIndex = startMinute

        // 设置结束时间
        const endHourIndex = endHour - 8
        const endMinuteIndex = endMinute

        this.setData({
            startTimeIndex: [startHourIndex, startMinuteIndex],
            endTimeIndex: [endHourIndex, endMinuteIndex],
            startTime: startTime,
            endTime: endTime
        }, () => this.validateTime())
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

        // 不超过 22:00
        if (hour > 22 || (hour === 22 && minute > 0)) {
            return '22:00'
        }

        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    },

    // 时间减一分钟（用于计算缓冲时间）
    subtractOneMinute(timeStr) {
        const parts = timeStr.split(':')
        let hour = parseInt(parts[0])
        let minute = parseInt(parts[1])

        minute -= 1
        if (minute < 0) {
            minute = 59
            hour -= 1
        }

        // 不早于 08:00
        if (hour < 8) {
            return '08:00'
        }

        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    },

    // 时间字符串转选择器索引
    timeToIndex(timeStr) {
        const parts = timeStr.split(':')
        const hour = parseInt(parts[0])
        const minute = parseInt(parts[1])

        // 小时索引：从8点开始，所以索引 = hour - 8
        const hourIndex = Math.max(0, Math.min(hour - 8, 14))
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
            timeConflict: false,
            selectedSlotIndices: [],
            selectionAnchor: null
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