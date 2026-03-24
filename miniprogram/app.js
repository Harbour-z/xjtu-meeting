// app.js - 小程序入口
App({
    globalData: {
        // 后端API地址（部署时修改为实际服务器地址）
        apiBase: 'http://localhost:8000',
        // 当前选择的校区
        currentCampus: 'xingqing',
        // 当前选择的日期
        currentDate: ''
    },

    onLaunch() {
        // 初始化日期为今天
        const today = new Date()
        const dateStr = this.formatDate(today)
        this.globalData.currentDate = dateStr

        // 从缓存读取校区偏好
        const savedCampus = wx.getStorageSync('currentCampus')
        if (savedCampus) {
            this.globalData.currentCampus = savedCampus
        }
    },

    formatDate(date) {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }
})