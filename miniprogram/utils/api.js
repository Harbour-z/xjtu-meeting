// utils/api.js - API 封装（微信云托管版本）
const app = getApp()

// 云托管配置
const CLOUD_CONFIG = {
    env: 'prod-3gptjz9l8a2f3d51',  // 云环境ID
    service: 'meeting'              // 服务名称
}

/**
 * 封装云托管请求方法
 */
function request(path, method = 'GET', data = {}) {
    return new Promise((resolve, reject) => {
        console.log('云托管请求:', path, method, data)
        wx.cloud.callContainer({
            config: {
                env: CLOUD_CONFIG.env
            },
            path: path,
            method: method,
            data: data,
            header: {
                'X-WX-SERVICE': CLOUD_CONFIG.service,
                'content-type': 'application/json'
            },
            success(res) {
                console.log('云托管响应:', res)
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(res.data)
                } else {
                    reject(res.data || { detail: '请求失败' })
                }
            },
            fail(err) {
                console.error('云托管请求失败:', err)
                reject({ detail: '网络错误，请检查网络连接' })
            }
        })
    })
}

/* ========== 传统 HTTP 请求方式（备用） ==========
 * 适用于：自有服务器部署、其他云平台（Railway/Render/Vercel等）
 * 使用时：将此段代码取消注释，并注释上方的云托管 request 函数
 *
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
 *
 * app.js 中需要配置：
 * globalData: {
 *     apiBase: 'https://your-domain.com'  // 你的服务器地址
 * }
 * =============================================== */

/**
 * 获取校区列表
 */
function getCampusList() {
    return request('/api/campus')
}

/**
 * 获取会议室列表（带状态）
 * @param {string} campus - 校区代码
 * @param {string} date - 查询日期 YYYY-MM-DD
 * @param {string} currentDate - 当前日期 YYYY-MM-DD（从客户端获取，避免服务器时间不准确）
 * @param {string} currentTime - 当前时间 HH:MM（从客户端获取，避免服务器时间不准确）
 */
function getRooms(campus, date, currentDate, currentTime) {
    const params = []
    if (campus) params.push(`campus=${campus}`)
    if (date) params.push(`date=${date}`)
    if (currentDate) params.push(`current_date=${currentDate}`)
    if (currentTime) params.push(`current_time=${currentTime}`)
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

// ==================== 认证相关 ====================

/**
 * 获取绑定状态
 */
function getAuthStatus(openid) {
    return request(`/api/auth/status?openid=${openid}`)
}

/**
 * 绑定用户
 */
function bindUser(openid, employeeId, name) {
    return request('/api/auth/bind', 'POST', {
        openid: openid,
        employee_id: employeeId,
        name: name
    })
}

/**
 * 获取用户信息
 */
function getUserInfo(openid) {
    return request(`/api/auth/userinfo?openid=${openid}`)
}

module.exports = {
    request,
    getCampusList,
    getRooms,
    getRoom,
    getRoomTimeline,
    getBookings,
    createBooking,
    deleteBooking,
    getAuthStatus,
    bindUser,
    getUserInfo
}