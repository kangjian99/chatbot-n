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
    expiration_time = (datetime.now(timezone.utc) + timedelta(hours=ExpiryHour)).isoformat()
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
    if session:
        print("#Session info:")
        print(f"Data: {session.data}")
        print(f"Uploaded filename: {session.uploaded_filename}")
        print(f"Selected template: {session.selected_template}")
        print(f"Expires at: {session.expires_at}")
    else:
        print("\n#No valid session found")