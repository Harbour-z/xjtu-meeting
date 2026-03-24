// utils/api.js - API 封装
const app = getApp()

/**
 * 封装请求方法
 */
function request(url, method = 'GET', data = {}) {
    return new Promise((resolve, reject) => {
        wx.request({
            url: `${app.globalData.apiBase}${url}`,
            method,
            data,
            header: {
                'content-type': 'application/json'
            },
            success(res) {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(res.data)
                } else {
                    reject(res.data || { detail: '请求失败' })
                }
            },
            fail(err) {
                reject({ detail: '网络错误，请检查网络连接' })
            }
        })
    })
}

/**
 * 获取校区列表
 */
function getCampusList() {
    return request('/api/campus')
}

/**
 * 获取会议室列表（带状态）
 */
function getRooms(campus, date) {
    const params = []
    if (campus) params.push(`campus=${campus}`)
    if (date) params.push(`date=${date}`)
    const query = params.length > 0 ? `?${params.join('&')}` : ''
    return request(`/api/rooms${query}`)
}

/**
 * 获取单个会议室
 */
function getRoom(roomId) {
    return request(`/api/rooms/${roomId}`)
}

/**
 * 获取会议室时间线
 */
function getRoomTimeline(roomId, date) {
    return request(`/api/rooms/${roomId}/timeline?date=${date}`)
}

/**
 * 获取预约列表
 */
function getBookings(date, roomId, teacherName) {
    const params = []
    if (date) params.push(`date=${date}`)
    if (roomId) params.push(`room_id=${roomId}`)
    if (teacherName) params.push(`teacher_name=${encodeURIComponent(teacherName)}`)
    const query = params.length > 0 ? `?${params.join('&')}` : ''
    return request(`/api/bookings${query}`)
}

/**
 * 创建预约
 */
function createBooking(data) {
    return request('/api/bookings', 'POST', data)
}

/**
 * 取消预约
 */
function deleteBooking(bookingId) {
    return request(`/api/bookings/${bookingId}`, 'DELETE')
}

module.exports = {
    request,
    getCampusList,
    getRooms,
    getRoom,
    getRoomTimeline,
    getBookings,
    createBooking,
    deleteBooking
}