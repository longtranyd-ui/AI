from datetime import datetime, date
import re
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Literal

class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)

class Login(Strict):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=200)

class UserInput(Strict):
    username: str = Field(min_length=3, max_length=80)
    full_name: str = Field(min_length=1, max_length=120)
    role: Literal['ADMIN', 'RECEPTIONIST', 'TECHNICIAN']
    active: bool = True
    password: str = Field(default='', max_length=200)

class CustomerInput(Strict):
    full_name: str = Field(min_length=1, max_length=120)
    phone: str = Field(default='', max_length=20)
    email: str = Field(default='', max_length=150)
    date_of_birth: str = ''
    note: str = Field(default='', max_length=2000)

    @field_validator('phone')
    @classmethod
    def phone_ok(cls, value):
        if value and not re.fullmatch(r'\+?[0-9]{9,15}', value):
            raise ValueError('Số điện thoại phải có 9–15 chữ số')
        return value

    @field_validator('email')
    @classmethod
    def email_ok(cls, value):
        if value and not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', value):
            raise ValueError('Email không hợp lệ')
        return value

    @field_validator('date_of_birth')
    @classmethod
    def birthday_ok(cls, value):
        if value and date.fromisoformat(value) > date.today():
            raise ValueError('Ngày sinh không được ở tương lai')
        return value

class ServiceInput(Strict):
    name: str = Field(min_length=1, max_length=150)
    description: str = Field(default='', max_length=2000)
    duration: int = Field(gt=0, le=480)
    price: int = Field(ge=0, le=100000000)
    active: bool = True

class ProductInput(Strict):
    name: str = Field(min_length=1, max_length=150)
    code: str = Field(min_length=1, max_length=40)
    price: int = Field(ge=0, le=100000000)
    stock: int = Field(ge=0, le=1000000)
    active: bool = True

class PackageLine(Strict):
    service_id: int
    quantity: int = Field(gt=0, le=100)

class PackageInput(Strict):
    name: str = Field(min_length=1, max_length=150)
    price: int = Field(ge=0, le=100000000)
    valid_days: int = Field(gt=0, le=3650)
    active: bool = True
    items: list[PackageLine] = Field(min_length=1, max_length=30)

class PlanInput(Strict):
    customer_id: int
    name: str = Field(min_length=1, max_length=150)
    start_date: date
    note: str = Field(default='', max_length=2000)
    service_ids: list[int] = Field(min_length=1, max_length=50)

class BookingLine(Strict):
    service_id: int
    technician_id: int
    treatment_session_id: int | None = None
    customer_package_item_id: int | None = None

class BookingInput(Strict):
    customer_id: int
    start_time: datetime
    note: str = Field(default='', max_length=2000)
    items: list[BookingLine] = Field(min_length=1, max_length=15)

    @field_validator('start_time')
    @classmethod
    def aware(cls, value):
        if value.tzinfo is None:
            raise ValueError('Thời gian cần kèm múi giờ')
        return value

class StatusInput(Strict):
    status: Literal['CONFIRMED', 'CANCELLED']

class CompleteInput(Strict):
    care_note: str = Field(default='', max_length=2000)

class InvoiceLine(Strict):
    kind: Literal['SERVICE', 'PRODUCT', 'PACKAGE']
    reference_id: int
    quantity: int = Field(default=1, gt=0, le=100)

class InvoiceInput(Strict):
    customer_id: int
    discount: int = Field(default=0, ge=0)
    items: list[InvoiceLine] = Field(min_length=1, max_length=50)

class PaymentInput(Strict):
    method: Literal['CASH', 'TRANSFER']

class AIInput(Strict):
    customer_id: int
    kind: Literal['recommend', 'summary', 'reminder', 'aftercare']
    need: str = Field(default='', max_length=1500)
    appointment_id: int | None = None

class Recommendation(Strict):
    service_id: int
    reason: str = Field(min_length=1, max_length=400)

class RecommendationResult(Strict):
    recommendations: list[Recommendation] = Field(max_length=2)
    message: str = Field(max_length=1200)

class TextResult(Strict):
    text: str = Field(min_length=1, max_length=3000)
