"""CRUD 操作"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime, date
from typing import List, Optional
import models
import schemas


# ==================== 会议室操作 ====================

def get_rooms(db: Session, campus: Optional[str] = None) -> List[models.Room]:
    """获取所有会议室"""
    query = db.query(models.Room)
    if campus:
        query = query.filter(models.Room.campus == campus)
    return query.all()


def get_room(db: Session, room_id: int) -> Optional[models.Room]:
    """获取单个会议室"""
    return db.query(models.Room).filter(models.Room.id == room_id).first()


def create_room(db: Session, room: schemas.RoomCreate) -> models.Room:
    """创建会议室"""
    db_room = models.Room(**room.model_dump())
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    return db_room


def update_room(db: Session, room_id: int, room: schemas.RoomUpdate) -> Optional[models.Room]:
    """更新会议室"""
    db_room = get_room(db, room_id)
    if not db_room:
        return None
    update_data = room.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_room, key, value)
    db.commit()
    db.refresh(db_room)
    return db_room


def delete_room(db: Session, room_id: int) -> bool:
    """删除会议室"""
    db_room = get_room(db, room_id)
    if not db_room:
        return False
    db.delete(db_room)
    db.commit()
    return True


# ==================== 预约操作 ====================

def get_bookings(db: Session, date_str: Optional[str] = None,
                 room_id: Optional[int] = None,
                 teacher_name: Optional[str] = None) -> List[models.Booking]:
    """获取预约列表"""
    query = db.query(models.Booking)
    if date_str:
        query = query.filter(models.Booking.date == date_str)
    if room_id:
        query = query.filter(models.Booking.room_id == room_id)
    if teacher_name:
        query = query.filter(models.Booking.teacher_name == teacher_name)
    return query.order_by(models.Booking.date, models.Booking.start_time).all()


def get_booking(db: Session, booking_id: int) -> Optional[models.Booking]:
    """获取单个预约"""
    return db.query(models.Booking).filter(models.Booking.id == booking_id).first()


def create_booking(db: Session, booking: schemas.BookingCreate) -> models.Booking:
    """创建预约"""
    db_booking = models.Booking(**booking.model_dump())
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    return db_booking


def delete_booking(db: Session, booking_id: int) -> bool:
    """删除预约"""
    db_booking = get_booking(db, booking_id)
    if not db_booking:
        return False
    db.delete(db_booking)
    db.commit()
    return True


def check_time_conflict(db: Session, room_id: int, date_str: str,
                        start_time: str, end_time: str,
                        exclude_booking_id: Optional[int] = None) -> bool:
    """检查时间冲突"""
    query = db.query(models.Booking).filter(
        models.Booking.room_id == room_id,
        models.Booking.date == date_str,
        or_(
            and_(
                models.Booking.start_time < end_time,
                models.Booking.end_time > start_time
            )
        )
    )
    if exclude_booking_id:
        query = query.filter(models.Booking.id != exclude_booking_id)
    return query.first() is not None


def get_room_bookings_for_date(db: Session, room_id: int, date_str: str) -> List[models.Booking]:
    """获取某会议室某天的所有预约"""
    return db.query(models.Booking).filter(
        models.Booking.room_id == room_id,
        models.Booking.date == date_str
    ).order_by(models.Booking.start_time).all()


# ==================== 状态计算 ====================

def get_room_current_status(db: Session, room_id: int, target_date: str = None,
                            current_date: str = None, current_time: str = None) -> dict:
    """
    获取会议室当前状态
    参数：
    - room_id: 会议室ID
    - target_date: 查询的日期
    - current_date: 当前日期（前端传入，避免服务器时间不准）
    - current_time: 当前时间（前端传入，避免服务器时间不准）
    返回: { is_available: bool, earliest_available: str }
    """
    # 使用前端传入的时间，如果没有则使用服务器时间（兜底）
    if current_date:
        today_str = current_date
    else:
        today_str = date.today().strftime("%Y-%m-%d")

    if target_date is None:
        target_date = today_str

    if current_time:
        current_time = current_time
    else:
        current_time = datetime.now().strftime("%H:%M")

    # 工作时间范围
    work_start = "07:00"
    work_end = "23:00"

    # 获取该日期的所有预约
    bookings = get_room_bookings_for_date(db, room_id, target_date)

    # 如果查询的不是今天
    if target_date != today_str:
        if not bookings:
            return {"is_available": True, "earliest_available": work_start}

        # 找第一个空闲时段的开始时间
        first_booking = bookings[0]
        if first_booking.start_time > work_start:
            # 第一个预约前有空闲
            return {"is_available": True, "earliest_available": work_start}

        # 找预约之间的空闲时段
        for i in range(len(bookings) - 1):
            if bookings[i].end_time < bookings[i + 1].start_time:
                return {"is_available": True, "earliest_available": bookings[i].end_time}

        # 所有预约都是连续的，返回最后一个预约的结束时间
        last_end = bookings[-1].end_time
        if last_end < work_end:
            return {"is_available": True, "earliest_available": last_end}
        else:
            return {"is_available": False, "earliest_available": "已约满"}

    # ===== 查询的是今天 =====

    # 如果当前时间早于工作时间
    if current_time < work_start:
        return {"is_available": True, "earliest_available": work_start}

    # 如果当前时间晚于或等于工作结束时间
    if current_time >= work_end:
        return {"is_available": False, "earliest_available": "已下班"}

    # 检查当前是否被占用，并找到最早空闲时间
    # 构建时间线：标记哪些时间被占用
    occupied_ranges = [(b.start_time, b.end_time) for b in bookings]

    # 检查当前时间是否在某个预约中
    for start, end in occupied_ranges:
        if start <= current_time < end:
            # 当前被占用
            # 找到这个预约结束后的最早空闲时间
            check_time = end
            while check_time < work_end:
                is_still_occupied = False
                for s, e in occupied_ranges:
                    if s <= check_time < e:
                        check_time = e
                        is_still_occupied = True
                        break
                if not is_still_occupied:
                    return {"is_available": False, "earliest_available": check_time}
            return {"is_available": False, "earliest_available": "已约满"}

    # 当前时间空闲，返回当前时间作为最早可预约时间
    # 但需要检查当前时间到下班时间之间是否有空闲
    return {"is_available": True, "earliest_available": current_time}


# ==================== 教职工操作 ====================

def get_teachers(db: Session, is_active: Optional[bool] = None) -> List[models.Teacher]:
    """获取所有教职工"""
    query = db.query(models.Teacher)
    if is_active is not None:
        query = query.filter(models.Teacher.is_active == is_active)
    return query.order_by(models.Teacher.employee_id).all()


def get_teacher(db: Session, teacher_id: int) -> Optional[models.Teacher]:
    """获取单个教职工"""
    return db.query(models.Teacher).filter(models.Teacher.id == teacher_id).first()


def get_teacher_by_employee_id(db: Session, employee_id: str) -> Optional[models.Teacher]:
    """根据工号获取教职工"""
    return db.query(models.Teacher).filter(models.Teacher.employee_id == employee_id).first()


def create_teacher(db: Session, teacher: schemas.TeacherCreate) -> models.Teacher:
    """创建教职工"""
    db_teacher = models.Teacher(**teacher.model_dump())
    db.add(db_teacher)
    db.commit()
    db.refresh(db_teacher)
    return db_teacher


def update_teacher(db: Session, teacher_id: int, teacher: schemas.TeacherUpdate) -> Optional[models.Teacher]:
    """更新教职工"""
    db_teacher = get_teacher(db, teacher_id)
    if not db_teacher:
        return None
    update_data = teacher.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_teacher, key, value)
    db.commit()
    db.refresh(db_teacher)
    return db_teacher


def delete_teacher(db: Session, teacher_id: int) -> bool:
    """删除教职工"""
    db_teacher = get_teacher(db, teacher_id)
    if not db_teacher:
        return False
    db.delete(db_teacher)
    db.commit()
    return True


def verify_teacher(db: Session, employee_id: str, name: str) -> Optional[models.Teacher]:
    """验证教职工工号和姓名"""
    return db.query(models.Teacher).filter(
        models.Teacher.employee_id == employee_id,
        models.Teacher.name == name,
        models.Teacher.is_active == True
    ).first()


# ==================== 用户绑定操作 ====================

def get_user_bind(db: Session, openid: str) -> Optional[models.UserBind]:
    """根据openid获取用户绑定"""
    return db.query(models.UserBind).filter(models.UserBind.openid == openid).first()


def get_user_bind_by_teacher(db: Session, teacher_id: int) -> Optional[models.UserBind]:
    """根据teacher_id获取用户绑定"""
    return db.query(models.UserBind).filter(models.UserBind.teacher_id == teacher_id).first()


def create_user_bind(db: Session, openid: str, teacher_id: int) -> models.UserBind:
    """创建用户绑定"""
    db_bind = models.UserBind(openid=openid, teacher_id=teacher_id)
    db.add(db_bind)
    db.commit()
    db.refresh(db_bind)
    return db_bind


def update_last_login(db: Session, openid: str) -> None:
    """更新最后登录时间"""
    db_bind = get_user_bind(db, openid)
    if db_bind:
        db_bind.last_login = datetime.now()
        db.commit()


def delete_user_bind(db: Session, openid: str) -> bool:
    """删除用户绑定（解绑）"""
    db_bind = get_user_bind(db, openid)
    if not db_bind:
        return False
    db.delete(db_bind)
    db.commit()
    return True
