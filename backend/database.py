"""数据库连接配置"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import sqlite3

# 数据库文件路径
# 本地开发：使用当前目录
# 云托管：使用环境变量 DATA_PATH 指定持久化目录
DATA_DIR = os.environ.get("DATA_PATH", os.path.dirname(__file__))
DB_PATH = os.path.join(DATA_DIR, "reserve.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def migrate_db():
    """数据库迁移 - 添加缺失的列"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # 获取 bookings 表的所有列名
        cursor.execute("PRAGMA table_info(bookings)")
        columns = [col[1] for col in cursor.fetchall()]

        # 检查并添加 subject 列
        if 'subject' not in columns:
            print("[迁移] 添加 bookings.subject 列...")
            cursor.execute(
                "ALTER TABLE bookings ADD COLUMN subject VARCHAR(200)")
            conn.commit()
            print("[迁移] 完成")

        conn.close()
    except Exception as e:
        print(f"[迁移] 跳过: {e}")


def init_db():
    """初始化数据库"""
    from models import Room, Booking, Teacher, UserBind
    Base.metadata.create_all(bind=engine)

    # 执行迁移
    migrate_db()
