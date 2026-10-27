import os
from contextlib import contextmanager
from datetime import datetime, timezone
from dotenv import load_dotenv
from sqlalchemy import create_engine, event, Column, Integer, String, Text, Boolean, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL', 'sqlite:///./spa.db'), connect_args={'check_same_thread': False, 'timeout': 15})

@event.listens_for(engine, 'connect')
def sqlite_settings(conn, _):
    cursor = conn.cursor()
    cursor.execute('PRAGMA foreign_keys=ON')
    cursor.execute('PRAGMA busy_timeout=15000')
    cursor.close()

Session = sessionmaker(bind=engine, expire_on_commit=False)
Base = declarative_base()

def now():
    return datetime.now(timezone.utc).isoformat()

@contextmanager
def transaction():
    """Serialize validation + writes across processes for this SQLite demo."""
    with Session() as db:
        try:
            db.connection().exec_driver_sql('BEGIN IMMEDIATE')
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    __table_args__ = (CheckConstraint("role IN ('ADMIN','RECEPTIONIST','TECHNICIAN')"),)

class Customer(Base):
    __tablename__ = 'customers'
    id = Column(Integer, primary_key=True)
    full_name = Column(String, nullable=False)
    phone = Column(String, default='')
    email = Column(String, default='')
    date_of_birth = Column(String, default='')
    note = Column(Text, default='')
    created_at = Column(String, default=now)

class Service(Base):
    __tablename__ = 'services'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text, default='')
    duration = Column(Integer, nullable=False)
    price = Column(Integer, nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    __table_args__ = (CheckConstraint('duration > 0 AND price >= 0'),)

class Product(Base):
    __tablename__ = 'products'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    code = Column(String, unique=True, nullable=False)
    price = Column(Integer, nullable=False)
    stock = Column(Integer, nullable=False, default=0)
    active = Column(Boolean, default=True, nullable=False)
    __table_args__ = (CheckConstraint('price >= 0 AND stock >= 0'),)

class Package(Base):
    __tablename__ = 'care_packages'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    price = Column(Integer, nullable=False)
    valid_days = Column(Integer, default=90, nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    __table_args__ = (CheckConstraint('price >= 0 AND valid_days > 0'),)

class PackageService(Base):
    __tablename__ = 'package_services'
    id = Column(Integer, primary_key=True)
    package_id = Column(Integer, ForeignKey('care_packages.id'), nullable=False)
    service_id = Column(Integer, ForeignKey('services.id'), nullable=False)
    quantity = Column(Integer, nullable=False)
    __table_args__ = (UniqueConstraint('package_id', 'service_id'), CheckConstraint('quantity > 0'))

class Plan(Base):
    __tablename__ = 'customer_treatment_plans'
    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey('customers.id'), nullable=False)
    name = Column(String, nullable=False)
    start_date = Column(String, nullable=False)
    note = Column(Text, default='')
    status = Column(String, default='ACTIVE', nullable=False)

class TreatmentSession(Base):
    __tablename__ = 'treatment_sessions'
    id = Column(Integer, primary_key=True)
    plan_id = Column(Integer, ForeignKey('customer_treatment_plans.id'), nullable=False)
    number = Column(Integer, nullable=False)
    service_id = Column(Integer, ForeignKey('services.id'), nullable=False)
    status = Column(String, default='PLANNED', nullable=False)
    care_note = Column(Text, default='')
    __table_args__ = (UniqueConstraint('plan_id', 'number'), CheckConstraint('number > 0'))

class Appointment(Base):
    __tablename__ = 'appointments'
    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey('customers.id'), nullable=False)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    status = Column(String, default='BOOKED', nullable=False)
    note = Column(Text, default='')
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)

class AppointmentService(Base):
    __tablename__ = 'appointment_services'
    id = Column(Integer, primary_key=True)
    appointment_id = Column(Integer, ForeignKey('appointments.id'), nullable=False)
    service_id = Column(Integer, ForeignKey('services.id'), nullable=False)
    technician_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    duration = Column(Integer, nullable=False)
    price = Column(Integer, nullable=False)
    status = Column(String, default='PENDING', nullable=False)
    care_note = Column(Text, default='')
    treatment_session_id = Column(Integer, ForeignKey('treatment_sessions.id'))
    customer_package_item_id = Column(Integer, ForeignKey('customer_package_items.id'))

class Invoice(Base):
    __tablename__ = 'invoices'
    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey('customers.id'), nullable=False)
    subtotal = Column(Integer, nullable=False)
    discount = Column(Integer, nullable=False)
    total = Column(Integer, nullable=False)
    status = Column(String, default='DRAFT', nullable=False)
    payment_method = Column(String)
    paid_at = Column(String)
    created_at = Column(String, default=now)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    __table_args__ = (CheckConstraint('subtotal >= 0 AND discount >= 0 AND discount <= subtotal AND total = subtotal - discount'),)

class InvoiceItem(Base):
    __tablename__ = 'invoice_items'
    id = Column(Integer, primary_key=True)
    invoice_id = Column(Integer, ForeignKey('invoices.id'), nullable=False)
    kind = Column(String, nullable=False)
    reference_id = Column(Integer, nullable=False)
    appointment_service_id = Column(Integer, ForeignKey('appointment_services.id'), unique=True)
    name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Integer, nullable=False)
    __table_args__ = (CheckConstraint('quantity > 0 AND unit_price >= 0'),)

class CustomerPackage(Base):
    __tablename__ = 'customer_packages'
    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey('customers.id'), nullable=False)
    package_id = Column(Integer, ForeignKey('care_packages.id'), nullable=False)
    invoice_item_id = Column(Integer, ForeignKey('invoice_items.id'), unique=True, nullable=False)
    name = Column(String, nullable=False)
    purchased_at = Column(String, nullable=False)
    expires_at = Column(String, nullable=False)

class CustomerPackageItem(Base):
    __tablename__ = 'customer_package_items'
    id = Column(Integer, primary_key=True)
    customer_package_id = Column(Integer, ForeignKey('customer_packages.id'), nullable=False)
    service_id = Column(Integer, ForeignKey('services.id'), nullable=False)
    total_quantity = Column(Integer, nullable=False)
    __table_args__ = (CheckConstraint('total_quantity > 0'),)

class PackageUsage(Base):
    __tablename__ = 'package_usages'
    id = Column(Integer, primary_key=True)
    customer_package_item_id = Column(Integer, ForeignKey('customer_package_items.id'), nullable=False)
    appointment_service_id = Column(Integer, ForeignKey('appointment_services.id'), unique=True, nullable=False)
    used_at = Column(String, default=now)
