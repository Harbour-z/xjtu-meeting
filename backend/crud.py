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

def get_room_current_status(db: Session, room_id: int, target_date: str = None) -> dict:
    """
    获取会议室当前状态
    返回: { is_available: bool, earliest_available: str }
    """
    today_str = date.today().strftime("%Y-%m-%d")
    if target_date is None:
        target_date = today_str

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
