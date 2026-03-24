"""Pydantic 数据验证模型"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ==================== 会议室相关 ====================

class RoomBase(BaseModel):
    """会议室基础模型"""
    name: str = Field(..., description="会议室名称")
    campus: str = Field(..., description="校区: xingqing/chuangxin")
    capacity: int = Field(default=20, description="容纳人数")
    location: Optional[str] = Field(None, description="位置")
    equipment: Optional[str] = Field(None, description="设备说明")


class RoomCreate(RoomBase):
    """创建会议室"""
    pass


class RoomUpdate(BaseModel):
    """更新会议室"""
    name: Optional[str] = None
    campus: Optional[str] = None
    capacity: Optional[int] = None
    location: Optional[str] = None
    equipment: Optional[str] = None


class RoomResponse(RoomBase):
    """会议室响应"""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class RoomWithStatus(RoomResponse):
    """带状态的会议室响应"""
    is_available: bool = Field(..., description="当前是否空闲")
    earliest_available: Optional[str] = Field(None, description="最早可预约时间")


# ==================== 预约相关 ====================

class BookingBase(BaseModel):
    """预约基础模型"""
    room_id: int = Field(..., description="会议室ID")
    date: str = Field(..., description="预约日期 YYYY-MM-DD")
    start_time: str = Field(..., description="开始时间 HH:MM")
    end_time: str = Field(..., description="结束时间 HH:MM")
    teacher_name: str = Field(..., description="预约老师")
    purpose: Optional[str] = Field(None, description="预约用途")
    phone: Optional[str] = Field(None, description="联系电话")


class BookingCreate(BookingBase):
    """创建预约"""
    pass


class BookingResponse(BookingBase):
    """预约响应"""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class BookingWithRoom(BookingResponse):
    """带会议室信息的预约响应"""
    room_name: str = Field(..., description="会议室名称")
    room_location: Optional[str] = Field(None, description="会议室位置")
    campus: str = Field(..., description="校区")


class TimeSlot(BaseModel):
    """时间段"""
    start_time: str
    end_time: str
    is_booked: bool = False
    teacher_name: Optional[str] = None


# ==================== 通用响应 ====================

class Message(BaseModel):
    """通用消息响应"""
    message: str


class CampusInfo(BaseModel):
    """校区信息"""
    code: str
    name: str
