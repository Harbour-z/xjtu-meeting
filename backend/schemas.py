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
    subject: Optional[str] = Field(None, description="会议主题")
    purpose: Optional[str] = Field(None, description="预约用途")


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


# ==================== 教职工相关 ====================

class TeacherBase(BaseModel):
    """教职工基础模型"""
    employee_id: str = Field(..., description="工号")
    name: str = Field(..., description="姓名")
    phone: Optional[str] = Field(None, description="联系电话")
    department: Optional[str] = Field(None, description="部门")


class TeacherCreate(TeacherBase):
    """创建教职工"""
    pass


class TeacherUpdate(BaseModel):
    """更新教职工"""
    employee_id: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None


class TeacherResponse(TeacherBase):
    """教职工响应"""
    id: int
    is_active: bool = True
    created_at: datetime

    class Config:
        from_attributes = True


class TeacherWithBind(TeacherResponse):
    """带绑定状态的教职工响应"""
    is_bound: bool = Field(default=False, description="是否已绑定微信")
    bound_at: Optional[datetime] = Field(None, description="绑定时间")


# ==================== 认证相关 ====================

class WxLoginRequest(BaseModel):
    """微信登录请求"""
    code: str = Field(..., description="微信登录code")


class WxLoginResponse(BaseModel):
    """微信登录响应"""
    openid: str = Field(..., description="用户OpenID")
    is_bound: bool = Field(..., description="是否已绑定")


class BindRequest(BaseModel):
    """绑定请求"""
    openid: str = Field(..., description="用户OpenID")
    employee_id: str = Field(..., description="工号")
    name: str = Field(..., description="姓名")


class BindResponse(BaseModel):
    """绑定响应"""
    success: bool
    message: str
    teacher_name: Optional[str] = None


class AuthStatus(BaseModel):
    """认证状态"""
    is_bound: bool = Field(..., description="是否已绑定")
    teacher_name: Optional[str] = Field(None, description="教师姓名")
    employee_id: Optional[str] = Field(None, description="工号")


class UserInfo(BaseModel):
    """用户信息"""
    openid: str
    employee_id: str
    name: str
    phone: Optional[str] = None
    department: Optional[str] = None
    bound_at: datetime


# ==================== 通用响应 ====================

class Message(BaseModel):
    """通用消息响应"""
    message: str


class CampusInfo(BaseModel):
    """校区信息"""
    code: str
    name: str
