"""FastAPI 主应用"""
from fastapi import FastAPI, Depends, HTTPException, Query, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
import os

from database import get_db, init_db, engine
from models import Base, Teacher, UserBind
import schemas
import crud

# 创建应用
app = FastAPI(
    title="西安交大会议室预约系统",
    description="会议室预约管理 API",
    version="1.0.0"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(STATIC_DIR):
    os.makedirs(STATIC_DIR)


@app.on_event("startup")
def startup():
    """启动时初始化数据库"""
    init_db()
    # 添加示例数据
    from database import SessionLocal
    db = SessionLocal()
    try:
        # 检查是否有会议室
        if crud.get_rooms(db).__len__() == 0:
            init_sample_data(db)
    finally:
        db.close()


def init_sample_data(db):
    """初始化示例数据"""
    sample_rooms = [
        {"name": "第一会议室", "campus": "xingqing", "capacity": 30,
            "location": "主楼201", "equipment": "投影仪,白板,空调"},
        {"name": "第二会议室", "campus": "xingqing", "capacity": 20,
            "location": "主楼203", "equipment": "投影仪,空调"},
        {"name": "学术报告厅", "campus": "xingqing", "capacity": 100,
            "location": "图书馆一楼", "equipment": "投影仪,音响,空调"},
        {"name": "研讨室A", "campus": "chuangxin", "capacity": 15,
            "location": "创新港1号楼301", "equipment": "投影仪,白板"},
        {"name": "研讨室B", "campus": "chuangxin", "capacity": 15,
            "location": "创新港1号楼302", "equipment": "投影仪,白板"},
        {"name": "多功能厅", "campus": "chuangxin", "capacity": 80,
            "location": "创新港中心楼", "equipment": "投影仪,音响,空调,视频会议"},
    ]
    for room_data in sample_rooms:
        room = schemas.RoomCreate(**room_data)
        crud.create_room(db, room)
    print("示例数据初始化完成")


# ==================== 校区接口 ====================

@app.get("/api/campus", response_model=List[schemas.CampusInfo])
def get_campus_list():
    """获取校区列表"""
    return [
        {"code": "xingqing", "name": "兴庆校区"},
        {"code": "chuangxin", "name": "创新港校区"}
    ]


# ==================== 会议室接口 ====================

@app.get("/api/rooms", response_model=List[schemas.RoomWithStatus])
def get_rooms(
    campus: Optional[str] = Query(None, description="校区代码"),
    date_str: Optional[str] = Query(
        None, alias="date", description="日期 YYYY-MM-DD"),
    current_date: Optional[str] = Query(None, description="当前日期（前端传入的标准时间）"),
    current_time: Optional[str] = Query(None, description="当前时间（前端传入的标准时间）"),
    db: Session = Depends(get_db)
):
    """获取会议室列表（含实时状态）"""
    rooms = crud.get_rooms(db, campus)
    target_date = date_str or current_date or date.today().strftime("%Y-%m-%d")

    result = []
    for room in rooms:
        status = crud.get_room_current_status(
            db, room.id, target_date, current_date, current_time)
        result.append(schemas.RoomWithStatus(
            id=room.id,
            name=room.name,
            campus=room.campus,
            capacity=room.capacity,
            location=room.location,
            equipment=room.equipment,
            created_at=room.created_at,
            is_available=status["is_available"],
            earliest_available=status["earliest_available"]
        ))
    return result


@app.get("/api/rooms/{room_id}", response_model=schemas.RoomResponse)
def get_room(room_id: int, db: Session = Depends(get_db)):
    """获取单个会议室"""
    room = crud.get_room(db, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="会议室不存在")
    return room


@app.get("/api/rooms/{room_id}/timeline")
def get_room_timeline(
    room_id: int,
    date_str: str = Query(..., alias="date", description="日期 YYYY-MM-DD"),
    db: Session = Depends(get_db)
):
    """获取某会议室某天的时间线（每小时一块）"""
    room = crud.get_room(db, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="会议室不存在")

    bookings = crud.get_room_bookings_for_date(db, room_id, date_str)

    # 生成时间线（07:00 - 23:00，每小时一个时段）
    slots = []
    for hour in range(7, 23):
        start = f"{hour:02d}:00"
        end = f"{hour:02d}:59"

        # 查找该小时内的所有预约
        hour_bookings = []
        for booking in bookings:
            # 预约是否与该小时有交集
            if booking.start_time < f"{hour+1:02d}:00" and booking.end_time > start:
                hour_bookings.append(booking)

        # 计算该时间段的占用情况
        if not hour_bookings:
            # 完全空闲
            status = "available"
            earliest_available = start
        else:
            # 检查是否完全被占用：预约从小时开始（或更早）到小时结束（或更晚）
            # 时间槽的实际结束时间是下一小时的开始 (hour+1):00
            slot_actual_end = f"{hour+1:02d}:00"

            # 判断是否有预约完全覆盖该时间槽
            is_fully_covered = False
            for b in hour_bookings:
                # 预约开始时间 <= 时间槽开始时间，且预约结束时间 >= 时间槽实际结束时间
                if b.start_time <= start and b.end_time >= slot_actual_end:
                    is_fully_covered = True
                    break

            if is_fully_covered:
                # 完全被占用
                status = "fully_booked"
                earliest_available = None
            else:
                # 计算被占用的分钟数（用于判断是否部分占用）
                occupied_minutes = 0
                for b in hour_bookings:
                    # 计算该预约在这个小时内的占用时间
                    b_start = max(b.start_time, start)
                    b_end = min(b.end_time, slot_actual_end)
                    # 计算分钟数
                    start_minutes = int(b_start.split(
                        ":")[0]) * 60 + int(b_start.split(":")[1])
                    end_minutes = int(b_end.split(
                        ":")[0]) * 60 + int(b_end.split(":")[1])
                    occupied_minutes += (end_minutes - start_minutes)

                # 如果占用时间接近整个小时（>= 59分钟），也视为完全占用
                if occupied_minutes >= 59:
                    status = "fully_booked"
                    earliest_available = None
                else:
                    # 部分被占用
                    status = "partially_booked"
                    # 找最早空闲时间
                    earliest = start
                    for b in sorted(hour_bookings, key=lambda x: x.start_time):
                        if b.start_time <= earliest < b.end_time:
                            earliest = b.end_time
                    earliest_available = earliest

        slots.append({
            "start_time": start,
            "end_time": end,
            "status": status,
            "earliest_available": earliest_available,
            "bookings": [
                {
                    "id": b.id,
                    "start_time": b.start_time,
                    "end_time": b.end_time,
                    "teacher_name": b.teacher_name,
                    "purpose": b.purpose,
                    "phone": b.phone
                } for b in sorted(hour_bookings, key=lambda x: x.start_time)
            ]
        })

    return {
        "room_id": room_id,
        "room_name": room.name,
        "date": date_str,
        "slots": slots
    }


# ==================== 预约接口 ====================

@app.get("/api/bookings", response_model=List[schemas.BookingWithRoom])
def get_bookings(
    date_str: Optional[str] = Query(None, alias="date", description="日期"),
    room_id: Optional[int] = Query(None, description="会议室ID"),
    teacher_name: Optional[str] = Query(None, description="老师姓名"),
    db: Session = Depends(get_db)
):
    """获取预约列表"""
    bookings = crud.get_bookings(db, date_str, room_id, teacher_name)
    result = []
    for booking in bookings:
        result.append(schemas.BookingWithRoom(
            id=booking.id,
            room_id=booking.room_id,
            date=booking.date,
            start_time=booking.start_time,
            end_time=booking.end_time,
            teacher_name=booking.teacher_name,
            subject=booking.subject,
            purpose=booking.purpose,
            phone=booking.phone,
            created_at=booking.created_at,
            room_name=booking.room.name,
            room_location=booking.room.location,
            campus=booking.room.campus
        ))
    return result


@app.post("/api/bookings", response_model=schemas.BookingResponse)
def create_booking(booking: schemas.BookingCreate, db: Session = Depends(get_db)):
    """创建预约"""
    # 检查会议室是否存在
    room = crud.get_room(db, booking.room_id)
    if not room:
        raise HTTPException(status_code=404, detail="会议室不存在")

    # 优先使用客户端时间，避免服务器时间不准确
    today = booking.client_date if booking.client_date else date.today().strftime("%Y-%m-%d")
    current_time = booking.client_time if booking.client_time else datetime.now().strftime("%H:%M")

    # 检查日期是否有效（不能预约过去的日期）
    if booking.date < today:
        raise HTTPException(status_code=400, detail="不能预约过去的日期")

    # 如果是今天，检查时间是否已过
    if booking.date == today:
        if booking.start_time < current_time:
            raise HTTPException(status_code=400, detail="不能预约已过去的时间段")

    # 检查时间冲突
    if crud.check_time_conflict(db, booking.room_id, booking.date,
                                booking.start_time, booking.end_time):
        raise HTTPException(status_code=400, detail="该时间段已被预约")

    # 检查时间有效性
    if booking.start_time >= booking.end_time:
        raise HTTPException(status_code=400, detail="结束时间必须晚于开始时间")

    # 检查工作时间
    if booking.start_time < "07:00" or booking.end_time > "23:00":
        raise HTTPException(status_code=400, detail="预约时间应在 07:00-23:00 之间")

    return crud.create_booking(db, booking)


@app.delete("/api/bookings/{booking_id}", response_model=schemas.Message)
def delete_booking(booking_id: int, db: Session = Depends(get_db)):
    """取消预约"""
    if not crud.delete_booking(db, booking_id):
        raise HTTPException(status_code=404, detail="预约不存在")
    return {"message": "预约已取消"}


# ==================== 管理后台接口 ====================

@app.get("/api/admin/rooms", response_model=List[schemas.RoomResponse])
def admin_get_rooms(db: Session = Depends(get_db)):
    """管理后台：获取所有会议室"""
    return crud.get_rooms(db)


@app.post("/api/admin/rooms", response_model=schemas.RoomResponse)
def admin_create_room(room: schemas.RoomCreate, db: Session = Depends(get_db)):
    """管理后台：创建会议室"""
    return crud.create_room(db, room)


@app.put("/api/admin/rooms/{room_id}", response_model=schemas.RoomResponse)
def admin_update_room(room_id: int, room: schemas.RoomUpdate, db: Session = Depends(get_db)):
    """管理后台：更新会议室"""
    updated = crud.update_room(db, room_id, room)
    if not updated:
        raise HTTPException(status_code=404, detail="会议室不存在")
    return updated


@app.delete("/api/admin/rooms/{room_id}", response_model=schemas.Message)
def admin_delete_room(room_id: int, db: Session = Depends(get_db)):
    """管理后台：删除会议室"""
    if not crud.delete_room(db, room_id):
        raise HTTPException(status_code=404, detail="会议室不存在")
    return {"message": "会议室已删除"}


# ==================== 教职工管理接口 ====================

@app.get("/api/admin/teachers", response_model=List[schemas.TeacherWithBind])
def admin_get_teachers(db: Session = Depends(get_db)):
    """管理后台：获取所有教职工"""
    teachers = crud.get_teachers(db)
    result = []
    for teacher in teachers:
        # 检查是否已绑定
        bind = crud.get_user_bind_by_teacher(db, teacher.id)
        result.append(schemas.TeacherWithBind(
            id=teacher.id,
            employee_id=teacher.employee_id,
            name=teacher.name,
            phone=teacher.phone,
            department=teacher.department,
            is_active=teacher.is_active,
            created_at=teacher.created_at,
            is_bound=bind is not None,
            bound_at=bind.bound_at if bind else None
        ))
    return result


@app.post("/api/admin/teachers", response_model=schemas.TeacherResponse)
def admin_create_teacher(teacher: schemas.TeacherCreate, db: Session = Depends(get_db)):
    """管理后台：创建教职工"""
    # 检查工号是否已存在
    existing = crud.get_teacher_by_employee_id(db, teacher.employee_id)
    if existing:
        raise HTTPException(status_code=400, detail="工号已存在")
    return crud.create_teacher(db, teacher)


@app.put("/api/admin/teachers/{teacher_id}", response_model=schemas.TeacherResponse)
def admin_update_teacher(teacher_id: int, teacher: schemas.TeacherUpdate, db: Session = Depends(get_db)):
    """管理后台：更新教职工"""
    updated = crud.update_teacher(db, teacher_id, teacher)
    if not updated:
        raise HTTPException(status_code=404, detail="教职工不存在")
    return updated


@app.delete("/api/admin/teachers/{teacher_id}", response_model=schemas.Message)
def admin_delete_teacher(teacher_id: int, db: Session = Depends(get_db)):
    """管理后台：删除教职工"""
    # 检查是否已绑定
    bind = crud.get_user_bind_by_teacher(db, teacher_id)
    if bind:
        # 同时删除绑定关系
        crud.delete_user_bind(db, bind.openid)
    if not crud.delete_teacher(db, teacher_id):
        raise HTTPException(status_code=404, detail="教职工不存在")
    return {"message": "教职工已删除"}


@app.post("/api/admin/unbind/{teacher_id}", response_model=schemas.Message)
def admin_unbind_teacher(teacher_id: int, db: Session = Depends(get_db)):
    """管理后台：解绑教职工微信"""
    bind = crud.get_user_bind_by_teacher(db, teacher_id)
    if not bind:
        raise HTTPException(status_code=400, detail="该教职工未绑定微信")

    if not crud.delete_user_bind(db, bind.openid):
        raise HTTPException(status_code=500, detail="解绑失败")
    return {"message": "解绑成功"}


# ==================== 调试接口 ====================

@app.get("/api/debug/db-status")
def debug_db_status(db: Session = Depends(get_db)):
    """调试：检查数据库状态"""
    from database import DB_PATH
    teachers = crud.get_teachers(db)
    binds = db.query(UserBind).all()
    rooms = crud.get_rooms(db)

    return {
        "db_path": DB_PATH,
        "data_dir": os.environ.get("DATA_PATH", "未设置"),
        "teachers_count": len(teachers),
        "teachers": [{"id": t.id, "employee_id": t.employee_id, "name": t.name, "is_active": t.is_active} for t in teachers],
        "binds_count": len(binds),
        "rooms_count": len(rooms)
    }


# ==================== 认证接口 ====================

# 微信小程序配置（云托管环境下从请求头获取）
WX_APPID = "wx6d73efcdaee8bf3d"


@app.get("/api/auth/getOpenid")
def get_openid(request: Request):
    """从云托管请求头获取用户 openid"""
    # 云托管环境会在请求头中自动注入 X-WX-OPENID
    openid = request.headers.get("X-WX-OPENID")
    if openid:
        return {"openid": openid}

    # 开发环境返回模拟 openid
    return {"openid": "dev_openid_" + str(hash(request.client.host) % 10000)}


@app.get("/api/auth/status")
def get_auth_status(
    openid: str = Query(..., description="用户OpenID"),
    db: Session = Depends(get_db)
):
    """获取用户绑定状态"""
    bind = crud.get_user_bind(db, openid)
    if bind:
        return {
            "is_bound": True,
            "teacher_name": bind.teacher.name,
            "employee_id": bind.teacher.employee_id
        }
    return {"is_bound": False, "teacher_name": None, "employee_id": None}


@app.post("/api/auth/bind", response_model=schemas.BindResponse)
def bind_user(bind_req: schemas.BindRequest, db: Session = Depends(get_db)):
    """绑定用户工号和姓名"""
    # 调试日志
    print(
        f"[BIND] 收到绑定请求: openid={bind_req.openid}, employee_id=[{bind_req.employee_id}], name=[{bind_req.name}]")

    # 检查该 openid 是否已绑定
    existing_bind = crud.get_user_bind(db, bind_req.openid)
    if existing_bind:
        print(f"[BIND] openid 已绑定: {existing_bind.teacher.name}")
        return schemas.BindResponse(
            success=False,
            message="该微信已绑定其他账号",
            teacher_name=existing_bind.teacher.name
        )

    # 清理输入（去除首尾空格）
    employee_id = bind_req.employee_id.strip()
    name = bind_req.name.strip()

    # 验证工号和姓名
    teacher = crud.verify_teacher(db, employee_id, name)
    if not teacher:
        # 调试：打印数据库中的教职工
        all_teachers = crud.get_teachers(db)
        print(f"[BIND] 验证失败! 数据库中的教职工:")
        for t in all_teachers:
            print(
                f"  - employee_id=[{t.employee_id}], name=[{t.name}], is_active={t.is_active}")
        print(f"[BIND] 输入: employee_id=[{employee_id}], name=[{name}]")

        return schemas.BindResponse(
            success=False,
            message=f"工号或姓名验证失败，请检查输入（工号: {employee_id}）"
        )

    # 检查该工号是否已被其他微信绑定
    teacher_bind = crud.get_user_bind_by_teacher(db, teacher.id)
    if teacher_bind:
        return schemas.BindResponse(
            success=False,
            message="该工号已被其他微信绑定"
        )

    # 创建绑定
    crud.create_user_bind(db, bind_req.openid, teacher.id)
    print(f"[BIND] 绑定成功: {teacher.name}")

    return schemas.BindResponse(
        success=True,
        message="绑定成功",
        teacher_name=teacher.name
    )


@app.get("/api/auth/userinfo")
def get_user_info(
    openid: str = Query(..., description="用户OpenID"),
    db: Session = Depends(get_db)
):
    """获取用户信息"""
    bind = crud.get_user_bind(db, openid)
    if not bind:
        raise HTTPException(status_code=404, detail="用户未绑定")

    # 更新最后登录时间
    crud.update_last_login(db, openid)

    return {
        "openid": bind.openid,
        "employee_id": bind.teacher.employee_id,
        "name": bind.teacher.name,
        "phone": bind.teacher.phone,
        "department": bind.teacher.department,
        "bound_at": bind.bound_at
    }


@app.post("/api/auth/unbind", response_model=schemas.Message)
def unbind_user(
    openid: str = Query(..., description="用户OpenID"),
    db: Session = Depends(get_db)
):
    """解绑用户（管理员操作）"""
    if not crud.delete_user_bind(db, openid):
        raise HTTPException(status_code=404, detail="绑定关系不存在")
    return {"message": "解绑成功"}


# ==================== 静态页面 ====================

@app.get("/", response_class=HTMLResponse)
def index_page():
    """首页 - 重定向到管理后台"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>西安交大会议室预约系统</title>
        <style>
            body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f7fa; }
            .container { text-align: center; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
            h1 { color: #1890ff; margin-bottom: 20px; }
            .links { display: flex; flex-direction: column; gap: 12px; margin-top: 24px; }
            a { padding: 12px 24px; background: linear-gradient(135deg, #1890ff, #40a9ff); color: white; text-decoration: none; border-radius: 8px; }
            a:hover { opacity: 0.9; }
            .api-link { background: #52c41a; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🏛️ 西安交大会议室预约系统</h1>
            <p>西安交通大学会议室预约管理平台</p>
            <div class="links">
                <a href="/admin">📋 进入管理后台</a>
                <a href="/docs" class="api-link">📖 API 文档</a>
            </div>
        </div>
    </body>
    </html>
    """


@app.get("/admin", response_class=HTMLResponse)
def admin_page():
    """管理后台页面 - 包含预约管理、会议室管理、教职工管理"""
    admin_html = os.path.join(STATIC_DIR, "admin.html")
    if os.path.exists(admin_html):
        with open(admin_html, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>管理后台页面不存在</h1><p>请检查 static/admin.html 文件</p>"


# 挂载静态文件
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
