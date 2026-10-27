import base64
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .db import Session, User

SECRET = os.getenv('JWT_SECRET') or secrets.token_urlsafe(48)
bearer = HTTPBearer(auto_error=False)

def hash_password(password):
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=16384, r=8, p=1)
    return base64.b64encode(salt + digest).decode()

def verify_password(password, encoded):
    raw = base64.b64decode(encoded)
    digest = hashlib.scrypt(password.encode(), salt=raw[:16], n=16384, r=8, p=1)
    return hmac.compare_digest(raw[16:], digest)

def token(user):
    return jwt.encode({'sub': str(user.id), 'exp': datetime.now(timezone.utc) + timedelta(hours=8)}, SECRET, algorithm='HS256')

def current_user(auth: HTTPAuthorizationCredentials | None = Depends(bearer)):
    try:
        if not auth:
            raise ValueError()
        payload = jwt.decode(auth.credentials, SECRET, algorithms=['HS256'])
        with Session() as db:
            user = db.get(User, int(payload['sub']))
            if not user or not user.active:
                raise ValueError()
            return user
    except (ValueError, KeyError, jwt.PyJWTError):
        raise HTTPException(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn')

def staff(user):
    if user.role not in ('ADMIN', 'RECEPTIONIST'):
        raise HTTPException(403, 'Bạn không có quyền thực hiện thao tác này')

def admin(user):
    if user.role != 'ADMIN':
        raise HTTPException(403, 'Chức năng dành cho quản lý')
