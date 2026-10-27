from pathlib import Path
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
import os
import json
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, func, or_
from sqlalchemy.exc import IntegrityError, OperationalError
from fastapi.responses import JSONResponse
from .db import *
from .schemas import *
from .security import current_user, staff, admin, token, hash_password, verify_password

app = FastAPI(title='An Nhiên Spa · API', version='1.0.0')
app.add_middleware(CORSMiddleware, allow_origins=os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(','), allow_credentials=False, allow_methods=['*'], allow_headers=['*'])

@app.exception_handler(IntegrityError)
async def integrity_error(request, exc):
    return JSONResponse(status_code=409, content={'detail': 'Dữ liệu bị trùng hoặc vi phạm ràng buộc. Vui lòng tải lại và kiểm tra.'})

@app.exception_handler(OperationalError)
async def operation_error(request, exc):
    return JSONResponse(status_code=503, content={'detail': 'Cơ sở dữ liệu đang bận hoặc chưa khởi tạo. Vui lòng thử lại.'})

def obj(row):
    return {c.name: getattr(row, c.name) for c in row.__table__.columns if c.name != 'password_hash'}

def get(db, model, ident):
    row = db.get(model, ident)
    if not row:
        raise HTTPException(404, 'Không tìm thấy dữ liệu')
    return row

def utc(dt):
    return dt.astimezone(timezone.utc).isoformat()

def access_customer(db, user, customer_id):
    get(db, Customer, customer_id)
    if user.role == 'TECHNICIAN':
        found = db.scalar(select(AppointmentService.id).join(Appointment).where(Appointment.customer_id == customer_id, AppointmentService.technician_id == user.id, Appointment.status != 'CANCELLED'))
        if not found:
            raise HTTPException(403, 'Hồ sơ ngoài phạm vi được phân công')

@app.get('/api/health')
def health():
    return {'status': 'ok', 'ai_provider': os.getenv('AI_PROVIDER', 'mock')}

@app.post('/api/auth/login')
def login(data: Login):
    with Session() as db:
        user = db.scalar(select(User).where(User.username == data.username))
        if not user or not user.active or not verify_password(data.password, user.password_hash):
            raise HTTPException(401, 'Tài khoản hoặc mật khẩu không đúng')
        return {'access_token': token(user), 'user': obj(user)}

@app.get('/api/auth/me')
def me(user=Depends(current_user)):
    return obj(user)

@app.get('/api/users')
def users(user=Depends(current_user)):
    with Session() as db:
        rows = db.scalars(select(User).order_by(User.id)).all()
        if user.role != 'ADMIN':
            return [{'id': u.id, 'full_name': u.full_name, 'role': u.role, 'active': u.active} for u in rows if u.role == 'TECHNICIAN']
        return [obj(u) for u in rows]

@app.post('/api/users')
@app.put('/api/users/{ident}')
def save_user(data: UserInput, ident: int | None = None, user=Depends(current_user)):
    admin(user)
    with transaction() as db:
        row = get(db, User, ident) if ident else User()
        if ident and row.role == 'ADMIN' and row.active and (data.role != 'ADMIN' or not data.active):
            count = db.scalar(select(func.count()).select_from(User).where(User.role == 'ADMIN', User.active == True))
            if count <= 1:
                raise HTTPException(409, 'Phải giữ ít nhất một quản lý hoạt động')
        if not ident and len(data.password) < 8:
            raise HTTPException(422, 'Mật khẩu mới cần ít nhất 8 ký tự')
        for k, v in data.model_dump(exclude={'password'}).items():
            setattr(row, k, v)
        if data.password:
            if len(data.password) < 8:
                raise HTTPException(422, 'Mật khẩu cần ít nhất 8 ký tự')
            row.password_hash = hash_password(data.password)
        db.add(row)
        db.flush()
        return obj(row)

@app.get('/api/customers')
def customers(q: str = Query('', max_length=100), page: int = Query(1, ge=1), size: int = Query(10, ge=1, le=100), user=Depends(current_user)):
    staff(user)
    with Session() as db:
        query = select(Customer).where(or_(Customer.full_name.contains(q), Customer.phone.contains(q)))
        total = db.scalar(select(func.count()).select_from(query.subquery()))
        return {'items': [obj(c) for c in db.scalars(query.order_by(Customer.id.desc()).offset((page-1)*size).limit(size))], 'total': total}

@app.post('/api/customers')
@app.put('/api/customers/{ident}')
def save_customer(data: CustomerInput, ident: int | None = None, user=Depends(current_user)):
    staff(user)
    with transaction() as db:
        row = get(db, Customer, ident) if ident else Customer()
        for k, v in data.model_dump().items():
            setattr(row, k, v)
        db.add(row)
        db.flush()
        return obj(row)

@app.get('/api/customers/{ident}')
def customer_detail(ident: int, user=Depends(current_user)):
    with Session() as db:
        access_customer(db, user, ident)
        row = obj(get(db, Customer, ident))
        history_query = select(AppointmentService).join(Appointment).where(Appointment.customer_id == ident, AppointmentService.status == 'COMPLETED')
        if user.role == 'TECHNICIAN':
            history_query = history_query.where(AppointmentService.technician_id == user.id)
            row.pop('phone', None)
            row.pop('email', None)
        row['history'] = [service_detail(db, s) for s in db.scalars(history_query.order_by(AppointmentService.start_time.desc()))]
        return row

@app.get('/api/services')
def services(user=Depends(current_user)):
    with Session() as db:
        return [obj(x) for x in db.scalars(select(Service).order_by(Service.id))]

@app.post('/api/services')
@app.put('/api/services/{ident}')
def save_service(data: ServiceInput, ident: int | None = None, user=Depends(current_user)):
    return save_catalog(Service, data, ident, user)

def save_catalog(model, data, ident, user):
    admin(user)
    with transaction() as db:
        row = get(db, model, ident) if ident else model()
        for k, v in data.model_dump().items():
            setattr(row, k, v)
        db.add(row)
        db.flush()
        return obj(row)

@app.get('/api/products')
def products(user=Depends(current_user)):
    staff(user)
    with Session() as db:
        return [obj(x) for x in db.scalars(select(Product).order_by(Product.id))]

@app.post('/api/products')
@app.put('/api/products/{ident}')
def save_product(data: ProductInput, ident: int | None = None, user=Depends(current_user)):
    return save_catalog(Product, data, ident, user)

def package_detail(db, p):
    return {**obj(p), 'items': [{**obj(x), 'service_name': get(db, Service, x.service_id).name} for x in db.scalars(select(PackageService).where(PackageService.package_id == p.id))]}

@app.get('/api/packages')
def packages(user=Depends(current_user)):
    with Session() as db:
        return [package_detail(db, x) for x in db.scalars(select(Package).order_by(Package.id))]

@app.post('/api/packages')
@app.put('/api/packages/{ident}')
def save_package(data: PackageInput, ident: int | None = None, user=Depends(current_user)):
    admin(user)
    if len({i.service_id for i in data.items}) != len(data.items):
        raise HTTPException(422, 'Dịch vụ trong gói không được trùng')
    with transaction() as db:
        row = get(db, Package, ident) if ident else Package()
        for item in data.items:
            if not get(db, Service, item.service_id).active:
                raise HTTPException(422, 'Dịch vụ đã ngừng hoạt động')
        for k, v in data.model_dump(exclude={'items'}).items():
            setattr(row, k, v)
        db.add(row)
        db.flush()
        for old in db.scalars(select(PackageService).where(PackageService.package_id == row.id)):
            db.delete(old)
        db.flush()
        for item in data.items:
            db.add(PackageService(package_id=row.id, **item.model_dump()))
        db.flush()
        return package_detail(db, row)

def plan_detail(db, plan):
    sessions = [obj(x) for x in db.scalars(select(TreatmentSession).where(TreatmentSession.plan_id == plan.id).order_by(TreatmentSession.number))]
    for s in sessions:
        s['service_name'] = get(db, Service, s['service_id']).name
    done = sum(x['status'] == 'COMPLETED' for x in sessions)
    return {**obj(plan), 'customer_name': get(db, Customer, plan.customer_id).full_name, 'sessions': sessions, 'completed': done, 'total': len(sessions)}

@app.get('/api/plans')
def plans(customer_id: int | None = None, user=Depends(current_user)):
    staff(user)
    with Session() as db:
        query = select(Plan).order_by(Plan.id.desc())
        if customer_id:
            query = query.where(Plan.customer_id == customer_id)
        return [plan_detail(db, x) for x in db.scalars(query)]

@app.post('/api/plans')
def create_plan(data: PlanInput, user=Depends(current_user)):
    staff(user)
    with transaction() as db:
        get(db, Customer, data.customer_id)
        for sid in data.service_ids:
            if not get(db, Service, sid).active:
                raise HTTPException(422, 'Dịch vụ đã ngừng hoạt động')
        plan = Plan(customer_id=data.customer_id, name=data.name, start_date=data.start_date.isoformat(), note=data.note)
        db.add(plan)
        db.flush()
        for number, sid in enumerate(data.service_ids, 1):
            db.add(TreatmentSession(plan_id=plan.id, number=number, service_id=sid))
        db.flush()
        return plan_detail(db, plan)

def entitlements(db, customer_id):
    result = []
    for p in db.scalars(select(CustomerPackage).where(CustomerPackage.customer_id == customer_id)):
        items = []
        for i in db.scalars(select(CustomerPackageItem).where(CustomerPackageItem.customer_package_id == p.id)):
            used = db.scalar(select(func.count()).select_from(PackageUsage).where(PackageUsage.customer_package_item_id == i.id))
            reserved = db.scalar(select(func.count()).select_from(AppointmentService).where(AppointmentService.customer_package_item_id == i.id, AppointmentService.status.in_(['PENDING','IN_PROGRESS'])))
            items.append({**obj(i), 'service_name': get(db, Service, i.service_id).name, 'used': used, 'reserved': reserved, 'remaining': i.total_quantity-used, 'available': i.total_quantity-used-reserved})
        status = 'EXPIRED' if p.expires_at < now() else ('EXHAUSTED' if all(i['remaining'] == 0 for i in items) else 'ACTIVE')
        result.append({**obj(p), 'status': status, 'items': items})
    return result

@app.get('/api/customers/{ident}/packages')
def owned_packages(ident: int, user=Depends(current_user)):
    staff(user)
    with Session() as db:
        get(db, Customer, ident)
        return entitlements(db, ident)

def service_detail(db, s):
    return {**obj(s), 'service_name': get(db, Service, s.service_id).name, 'technician_name': get(db, User, s.technician_id).full_name}

def appointment_detail(db, a, user):
    query = select(AppointmentService).where(AppointmentService.appointment_id == a.id).order_by(AppointmentService.start_time)
    if user.role == 'TECHNICIAN':
        query = query.where(AppointmentService.technician_id == user.id)
    return {**obj(a), 'customer_name': get(db, Customer, a.customer_id).full_name, 'items': [service_detail(db, s) for s in db.scalars(query)]}

@app.get('/api/appointments')
def appointments(date_from: str = '', date_to: str = '', status: str = '', technician_id: int | None = None, q: str = Query('', max_length=100), user=Depends(current_user)):
    with Session() as db:
        query = select(Appointment).join(Customer).where(Customer.full_name.contains(q)).order_by(Appointment.start_time.desc())
        if status:
            query = query.where(Appointment.status == status)
        tz = timezone(timedelta(hours=7))
        try:
            if date_from:
                query = query.where(Appointment.start_time >= utc(datetime.fromisoformat(date_from).replace(tzinfo=tz)))
            if date_to:
                query = query.where(Appointment.start_time < utc(datetime.fromisoformat(date_to).replace(tzinfo=tz) + timedelta(days=1)))
        except ValueError:
            raise HTTPException(422, 'Ngày không hợp lệ')
        tid = user.id if user.role == 'TECHNICIAN' else technician_id
        if tid:
            query = query.where(Appointment.id.in_(select(AppointmentService.appointment_id).where(AppointmentService.technician_id == tid)))
        return [appointment_detail(db, a, user) for a in db.scalars(query.limit(300))]

def booking(db, data, user, existing=None):
    get(db, Customer, data.customer_id)
    if data.start_time < datetime.now(timezone.utc) - timedelta(minutes=5):
        raise HTTPException(422, 'Không đặt lịch trong quá khứ')
    if existing:
        if existing.status not in ('BOOKED','CONFIRMED'):
            raise HTTPException(409, 'Không thể đổi lịch đã hoàn thành hoặc đã hủy')
        old_lines = db.scalars(select(AppointmentService).where(AppointmentService.appointment_id == existing.id)).all()
        if any(s.status != 'PENDING' for s in old_lines):
            raise HTTPException(409, 'Không thể đổi lịch khi dịch vụ đã bắt đầu')
        for s in old_lines:
            if s.treatment_session_id:
                get(db, TreatmentSession, s.treatment_session_id).status = 'PLANNED'
            db.delete(s)
        db.flush()
    appointment = existing or Appointment(created_by=user.id)
    appointment.customer_id = data.customer_id
    appointment.start_time = utc(data.start_time)
    appointment.note = data.note
    current = data.start_time
    # Exclude edited appointment during overlap checks.
    old_id = existing.id if existing else -1
    rows = []
    for line in data.items:
        service = get(db, Service, line.service_id)
        tech = get(db, User, line.technician_id)
        if not service.active or not tech.active or tech.role != 'TECHNICIAN':
            raise HTTPException(422, 'Dịch vụ hoặc kỹ thuật viên không hoạt động')
        end = current + timedelta(minutes=service.duration)
        conflict = db.scalar(select(AppointmentService.id).join(Appointment).where(Appointment.id != old_id, Appointment.status != 'CANCELLED', AppointmentService.technician_id == tech.id, AppointmentService.start_time < utc(end), AppointmentService.end_time > utc(current)))
        if conflict:
            raise HTTPException(409, f'{tech.full_name} đã có lịch trong khoảng thời gian này')
        if line.treatment_session_id:
            ts = get(db, TreatmentSession, line.treatment_session_id)
            plan = get(db, Plan, ts.plan_id)
            if plan.customer_id != data.customer_id or ts.service_id != service.id or ts.status != 'PLANNED':
                raise HTTPException(409, 'Buổi liệu trình không hợp lệ hoặc đã có lịch')
            ts.status = 'BOOKED'
        if line.customer_package_item_id:
            entitlement = get(db, CustomerPackageItem, line.customer_package_item_id)
            cp = get(db, CustomerPackage, entitlement.customer_package_id)
            if cp.customer_id != data.customer_id or entitlement.service_id != service.id or cp.expires_at < utc(end):
                raise HTTPException(409, 'Gói không phù hợp hoặc hết hạn trước buổi hẹn')
            used = db.scalar(select(func.count()).select_from(PackageUsage).where(PackageUsage.customer_package_item_id == entitlement.id))
            reserved = db.scalar(select(func.count()).select_from(AppointmentService).where(AppointmentService.customer_package_item_id == entitlement.id, AppointmentService.status.in_(['PENDING','IN_PROGRESS'])))
            local = sum(x.customer_package_item_id == entitlement.id for x in rows)
            if used + reserved + local >= entitlement.total_quantity:
                raise HTTPException(409, 'Gói không còn lượt có thể đặt')
        rows.append(AppointmentService(service_id=service.id, technician_id=tech.id, start_time=utc(current), end_time=utc(end), duration=service.duration, price=service.price, treatment_session_id=line.treatment_session_id, customer_package_item_id=line.customer_package_item_id))
        current = end
    appointment.end_time = utc(current)
    conflict = db.scalar(select(Appointment.id).where(Appointment.id != old_id, Appointment.customer_id == data.customer_id, Appointment.status != 'CANCELLED', Appointment.start_time < appointment.end_time, Appointment.end_time > appointment.start_time))
    if conflict:
        raise HTTPException(409, 'Khách hàng đã có lịch trong khoảng thời gian này')
    db.add(appointment)
    db.flush()
    for row in rows:
        row.appointment_id = appointment.id
        db.add(row)
    db.flush()
    return appointment_detail(db, appointment, user)

@app.post('/api/appointments')
def create_booking(data: BookingInput, user=Depends(current_user)):
    staff(user)
    with transaction() as db:
        return booking(db, data, user)

@app.put('/api/appointments/{ident}')
def update_booking(ident: int, data: BookingInput, user=Depends(current_user)):
    staff(user)
    with transaction() as db:
        return booking(db, data, user, get(db, Appointment, ident))

@app.post('/api/appointments/{ident}/status')
def booking_status(ident: int, data: StatusInput, user=Depends(current_user)):
    staff(user)
    with transaction() as db:
        a = get(db, Appointment, ident)
        if a.status not in ('BOOKED','CONFIRMED'):
            raise HTTPException(409, 'Trạng thái lịch không cho phép thao tác')
        lines = db.scalars(select(AppointmentService).where(AppointmentService.appointment_id == a.id)).all()
        if any(x.status != 'PENDING' for x in lines):
            raise HTTPException(409, 'Dịch vụ đã bắt đầu; không thể đổi trạng thái lịch')
        a.status = data.status
        if data.status == 'CANCELLED':
            for line in lines:
                line.status = 'CANCELLED'
                if line.treatment_session_id:
                    get(db, TreatmentSession, line.treatment_session_id).status = 'PLANNED'
        db.flush()
        return appointment_detail(db, a, user)

@app.post('/api/appointment-services/{ident}/complete')
def complete_service(ident: int, data: CompleteInput, user=Depends(current_user)):
    with transaction() as db:
        line = get(db, AppointmentService, ident)
        if user.role != 'ADMIN' and not (user.role == 'TECHNICIAN' and line.technician_id == user.id):
            raise HTTPException(403, 'Chỉ quản lý hoặc kỹ thuật viên được phân công có thể hoàn thành')
        a = get(db, Appointment, line.appointment_id)
        if line.status == 'COMPLETED':
            return service_detail(db, line)
        if a.status not in ('BOOKED','CONFIRMED') or line.status == 'CANCELLED':
            raise HTTPException(409, 'Không thể hoàn thành dịch vụ đã hủy')
        line.status = 'COMPLETED'
        line.care_note = data.care_note
        if line.customer_package_item_id:
            db.add(PackageUsage(customer_package_item_id=line.customer_package_item_id, appointment_service_id=line.id))
        if line.treatment_session_id:
            ts = get(db, TreatmentSession, line.treatment_session_id)
            ts.status, ts.care_note = 'COMPLETED', data.care_note
            db.flush()
            remaining = db.scalar(select(func.count()).select_from(TreatmentSession).where(TreatmentSession.plan_id == ts.plan_id, TreatmentSession.status != 'COMPLETED'))
            if remaining == 0:
                get(db, Plan, ts.plan_id).status = 'COMPLETED'
        db.flush()
        pending = db.scalar(select(func.count()).select_from(AppointmentService).where(AppointmentService.appointment_id == a.id, AppointmentService.status != 'COMPLETED'))
        if pending == 0:
            a.status = 'COMPLETED'
        return service_detail(db, line)

def invoice_detail(db, inv):
    return {**obj(inv), 'customer_name': get(db, Customer, inv.customer_id).full_name, 'items': [obj(x) for x in db.scalars(select(InvoiceItem).where(InvoiceItem.invoice_id == inv.id))]}

@app.get('/api/invoices')
def invoices(customer_id: int | None = None, user=Depends(current_user)):
    staff(user)
    with Session() as db:
        query = select(Invoice).order_by(Invoice.id.desc())
        if customer_id:
            query = query.where(Invoice.customer_id == customer_id)
        return [invoice_detail(db, x) for x in db.scalars(query.limit(300))]

@app.get('/api/customers/{ident}/billable')
def billable(ident: int, user=Depends(current_user)):
    staff(user)
    with Session() as db:
        get(db, Customer, ident)
        query = select(AppointmentService).join(Appointment).where(Appointment.customer_id == ident, AppointmentService.status == 'COMPLETED', AppointmentService.customer_package_item_id == None, ~AppointmentService.id.in_(select(InvoiceItem.appointment_service_id).where(InvoiceItem.appointment_service_id != None)))
        return [service_detail(db, x) for x in db.scalars(query)]

@app.post('/api/invoices')
def create_invoice(data: InvoiceInput, user=Depends(current_user)):
    staff(user)
    with transaction() as db:
        get(db, Customer, data.customer_id)
        if len({(x.kind, x.reference_id) for x in data.items}) != len(data.items):
            raise HTTPException(422, 'Khoản mục trùng; hãy gộp số lượng')
        lines = []
        for item in data.items:
            aid = None
            if item.kind == 'SERVICE':
                s = get(db, AppointmentService, item.reference_id)
                a = get(db, Appointment, s.appointment_id)
                if a.customer_id != data.customer_id or s.status != 'COMPLETED' or s.customer_package_item_id or item.quantity != 1:
                    raise HTTPException(409, 'Dịch vụ chưa hoàn thành, đã dùng gói hoặc không thuộc khách hàng')
                if db.scalar(select(InvoiceItem.id).where(InvoiceItem.appointment_service_id == s.id)):
                    raise HTTPException(409, 'Dịch vụ đã được lập hóa đơn')
                name, price, aid = get(db, Service, s.service_id).name, s.price, s.id
            else:
                source = get(db, Product if item.kind == 'PRODUCT' else Package, item.reference_id)
                if not source.active:
                    raise HTTPException(409, 'Sản phẩm hoặc gói đã ngừng bán')
                if item.kind == 'PACKAGE' and item.quantity != 1:
                    raise HTTPException(422, 'Mỗi khoản mục mua một gói')
                name, price = source.name, source.price
            lines.append(InvoiceItem(kind=item.kind, reference_id=item.reference_id, appointment_service_id=aid, name=name, quantity=item.quantity, unit_price=price))
        subtotal = sum(x.quantity * x.unit_price for x in lines)
        if data.discount > subtotal:
            raise HTTPException(422, 'Giảm giá vượt tổng tiền')
        inv = Invoice(customer_id=data.customer_id, subtotal=subtotal, discount=data.discount, total=subtotal-data.discount, created_by=user.id)
        db.add(inv)
        db.flush()
        for line in lines:
            line.invoice_id = inv.id
            db.add(line)
        db.flush()
        return invoice_detail(db, inv)

@app.post('/api/invoices/{ident}/pay')
def pay_invoice(ident: int, data: PaymentInput, user=Depends(current_user)):
    staff(user)
    with transaction() as db:
        inv = get(db, Invoice, ident)
        if inv.status == 'PAID':
            return invoice_detail(db, inv)
        if inv.status != 'DRAFT':
            raise HTTPException(409, 'Không thể thanh toán hóa đơn này')
        lines = db.scalars(select(InvoiceItem).where(InvoiceItem.invoice_id == inv.id)).all()
        if not lines:
            raise HTTPException(409, 'Hóa đơn không có khoản mục')
        paid_time = datetime.now(timezone.utc)
        for line in lines:
            if line.kind == 'PRODUCT':
                product = get(db, Product, line.reference_id)
                if not product.active or product.stock < line.quantity:
                    raise HTTPException(409, f'{product.name} không đủ tồn kho hoặc đã ngừng bán')
                product.stock -= line.quantity
            elif line.kind == 'PACKAGE':
                p = get(db, Package, line.reference_id)
                if not p.active:
                    raise HTTPException(409, 'Gói đã ngừng bán')
                cp = CustomerPackage(customer_id=inv.customer_id, package_id=p.id, invoice_item_id=line.id, name=line.name, purchased_at=utc(paid_time), expires_at=utc(paid_time + timedelta(days=p.valid_days)))
                db.add(cp)
                db.flush()
                for ps in db.scalars(select(PackageService).where(PackageService.package_id == p.id)):
                    db.add(CustomerPackageItem(customer_package_id=cp.id, service_id=ps.service_id, total_quantity=ps.quantity))
        inv.status, inv.payment_method, inv.paid_at = 'PAID', data.method, utc(paid_time)
        db.flush()
        return invoice_detail(db, inv)

@app.get('/api/reports')
def reports(date_from: str = '', date_to: str = '', user=Depends(current_user)):
    admin(user)
    tz = timezone(timedelta(hours=7))
    try:
        start = datetime.fromisoformat(date_from).replace(tzinfo=tz) if date_from else datetime.now(tz).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end = datetime.fromisoformat(date_to).replace(tzinfo=tz) + timedelta(days=1) if date_to else datetime.now(tz).replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
        if end <= start or (end-start).days > 366:
            raise ValueError()
    except ValueError:
        raise HTTPException(422, 'Khoảng ngày không hợp lệ hoặc vượt 366 ngày')
    with Session() as db:
        paid = db.scalars(select(Invoice).where(Invoice.status == 'PAID', Invoice.paid_at >= utc(start), Invoice.paid_at < utc(end))).all()
        apps = db.scalars(select(Appointment).where(Appointment.start_time >= utc(start), Appointment.start_time < utc(end))).all()
        counts = {}
        for a in apps:
            counts[a.status] = counts.get(a.status, 0) + 1
        popular = db.execute(select(Service.name, func.count(AppointmentService.id)).join(AppointmentService, Service.id == AppointmentService.service_id).where(AppointmentService.status == 'COMPLETED', AppointmentService.start_time >= utc(start), AppointmentService.start_time < utc(end)).group_by(Service.id).order_by(func.count(AppointmentService.id).desc()).limit(5)).all()
        daily = {}
        for invoice in paid:
            day = datetime.fromisoformat(invoice.paid_at).astimezone(tz).date().isoformat()
            daily[day] = daily.get(day, 0) + invoice.total
        return {'revenue': sum(i.total for i in paid), 'paid_invoices': len(paid), 'appointments': len(apps), 'statuses': counts, 'customers': db.scalar(select(func.count()).select_from(Customer)), 'daily': [{'date': (start + timedelta(days=n)).date().isoformat(), 'revenue': daily.get((start+timedelta(days=n)).date().isoformat(), 0)} for n in range((end-start).days)], 'popular': [{'name': x[0], 'count': x[1]} for x in popular]}

from .ai.service import generate

@app.post('/api/ai/generate')
async def ai_generate(data: AIInput, user=Depends(current_user)):
    with Session() as db:
        access_customer(db, user, data.customer_id)
        if user.role == 'TECHNICIAN' and data.kind != 'summary':
            raise HTTPException(403, 'Kỹ thuật viên chỉ được tóm tắt hồ sơ trong phạm vi phân công')
        customer = get(db, Customer, data.customer_id)
        query = select(AppointmentService).join(Appointment).where(Appointment.customer_id == customer.id, AppointmentService.status == 'COMPLETED').order_by(AppointmentService.start_time.desc()).limit(20)
        if user.role == 'TECHNICIAN':
            query = select(AppointmentService).join(Appointment).where(Appointment.customer_id == customer.id, AppointmentService.status == 'COMPLETED', AppointmentService.technician_id == user.id).order_by(AppointmentService.start_time.desc()).limit(20)
        history = [{'service': get(db, Service, x.service_id).name, 'date': x.start_time, 'note': x.care_note[:400]} for x in db.scalars(query)]
        catalog = [{'id': s.id, 'name': s.name, 'description': s.description[:300], 'price': s.price} for s in db.scalars(select(Service).where(Service.active == True).limit(60))]
        context = {'customer_name': customer.full_name, 'history': history, 'services': catalog, 'need': data.need}
        if data.kind in ('reminder','aftercare'):
            if not data.appointment_id:
                raise HTTPException(422, 'Cần chọn lịch hẹn')
            a = get(db, Appointment, data.appointment_id)
            if a.customer_id != customer.id or (data.kind == 'aftercare' and a.status != 'COMPLETED') or (data.kind == 'reminder' and a.status not in ('BOOKED','CONFIRMED')):
                raise HTTPException(422, 'Lịch hẹn không phù hợp với loại tin nhắn')
            detail = appointment_detail(db, a, user)
            context['appointment'] = {'time': datetime.fromisoformat(a.start_time).astimezone(timezone(timedelta(hours=7))).strftime('%H:%M %d/%m/%Y'), 'services': [x['service_name'] for x in detail['items']]}
        if data.kind == 'recommend' and not catalog:
            raise HTTPException(422, 'Chưa có dịch vụ đang hoạt động')
        if data.kind == 'summary' and not history:
            raise HTTPException(422, 'Chưa có lịch sử hoàn thành để tóm tắt')
    return await generate(data.kind, context, user.id)

frontend = Path(__file__).resolve().parents[2] / 'frontend' / 'dist'
if frontend.exists():
    app.mount('/', StaticFiles(directory=frontend, html=True), name='frontend')
