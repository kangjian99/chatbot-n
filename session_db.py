from sqlalchemy import create_engine, Column, String, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy_utils import database_exists, create_database
from datetime import datetime, timedelta, timezone
import os

# 选择数据库模式
# 对于硬盘存储，使用：
DATABASE_URL = "sqlite:///./sessions.db"
# 对于内存存储，使用：
# DATABASE_URL = "sqlite:///:memory:"

ExpiryHour = os.getenv("EXPIRY_HOUR") or 36
                    
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class SessionModel(Base):
    __tablename__ = "sessions"

    user_id = Column(String, primary_key=True)
    uploaded_filename = Column(String)
    selected_template = Column(String)
    data = Column(JSON)
    expires_at = Column(String)

def init_db():
    if not database_exists(engine.url):
        create_database(engine.url)
    Base.metadata.create_all(bind=engine)

init_db()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_session(db: Session, user_id: str):
    session = db.query(SessionModel).filter(SessionModel.user_id == user_id).first()
    if session:
        expires_at = datetime.fromisoformat(session.expires_at)
        if expires_at > datetime.now(timezone.utc):
            # 如果会话未过期，刷新有效期
            session.expires_at = (datetime.now(timezone.utc) + timedelta(hours=ExpiryHour)).isoformat()
            db.commit()
            return session
    return None

def create_session(db: Session, user_id: str, data: dict):
    try:
        expiration_time = (datetime.now(timezone.utc) + timedelta(hours=ExpiryHour)).isoformat()  # 设置多少小时后过期
        session = db.query(SessionModel).filter(SessionModel.user_id == user_id).first()
        if session:
            # 如果会话已经存在，则更新会话
            session.data = data
            session.expires_at = expiration_time
        else:
            # 如果会话不存在，则创建新的会话
            session = SessionModel(user_id=user_id, data=data, expires_at=expiration_time)
            db.add(session)
        db.commit()
        return session
    except Exception:
        db.rollback()
        return None

def update_session(db: Session, user_id: str, **kwargs):
    db_session = get_session(db, user_id)
    if db_session:
        for key, value in kwargs.items():
            setattr(db_session, key, value)
        db.commit()
        db.refresh(db_session)
    else:
        db_session = create_session(db, user_id, kwargs.get('data', {}))
    return db_session

def print_session_info(db: Session, user_id: str):
    session = get_session(db, user_id)
    info = ""
    if session:
        info += "#会话信息:\n"
        info += f"数据: {session.data}\n"
        info += f"上传的文件名: {session.uploaded_filename}\n"
        info += f"选择的模板: {session.selected_template}\n"
        info += f"过期时间: {session.expires_at}\n"
    else:
        info = "\n#未找到有效会话"
    
    print(info)
    return info