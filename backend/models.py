"""数据模型"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Room(Base):
    """会议室模型"""
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, comment="会议室名称")
    campus = Column(String(50), nullable=False,
                    comment="校区: xingqing/chuangxin")
    capacity = Column(Integer, default=20, comment="容纳人数")
    location = Column(String(200), comment="位置")
    equipment = Column(Text, comment="设备说明")
    created_at = Column(DateTime, default=datetime.now)

    # 关联预约
    bookings = relationship("Booking", back_populates="room")


class Booking(Base):
    """预约模型"""
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    date = Column(String(10), nullable=False, comment="预约日期 YYYY-MM-DD")
    start_time = Column(String(5), nullable=False, comment="开始时间 HH:MM")
    end_time = Column(String(5), nullable=False, comment="结束时间 HH:MM")
    teacher_name = Column(String(50), nullable=False, comment="预约老师")
    subject = Column(String(200), comment="会议主题")
    purpose = Column(Text, comment="预约用途")
    phone = Column(String(20), comment="联系电话")
    created_at = Column(DateTime, default=datetime.now)

    # 关联会议室
    room = relationship("Room", back_populates="bookings")


class Teacher(Base):
    """教职工白名单模型"""
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(20), unique=True, nullable=False, comment="工号")
    name = Column(String(50), nullable=False, comment="姓名")
    phone = Column(String(20), comment="联系电话")
    department = Column(String(100), comment="部门")
    is_active = Column(Boolean, default=True, comment="是否有效")
    created_at = Column(DateTime, default=datetime.now)

    # 关联用户绑定
    user_bind = relationship(
        "UserBind", back_populates="teacher", uselist=False)


class UserBind(Base):
    """用户绑定关系模型"""
    __tablename__ = "user_binds"

    id = Column(Integer, primary_key=True, index=True)
    openid = Column(String(100), unique=True,
                    nullable=False, comment="微信OpenID")
    teacher_id = Column(Integer, ForeignKey("teachers.id"),
                        nullable=False, comment="关联教职工ID")
    bound_at = Column(DateTime, default=datetime.now, comment="绑定时间")
    last_login = Column(DateTime, default=datetime.now, comment="最后登录时间")

    # 关联教职工
    teacher = relationship("Teacher", back_populates="user_bind")
