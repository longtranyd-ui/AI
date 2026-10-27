"""Idempotent synthetic demo data; never clears an existing database."""
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from .db import *
from .security import hash_password

def seed():
    with transaction() as db:
        if db.scalar(select(User.id).limit(1)):
            print('Demo data already exists; no changes made.')
            return
        shared_hash = hash_password('SpaDemo@123')
        people = [('admin','Trần Minh An','ADMIN'), ('letan','Nguyễn Hoài Thương','RECEPTIONIST'), ('letan2','Lê Khánh Linh','RECEPTIONIST'), ('ktv1','Phạm Ngọc Mai','TECHNICIAN'), ('ktv2','Vũ Thanh Hà','TECHNICIAN'), ('ktv3','Đỗ Bảo Ngọc','TECHNICIAN'), ('ktv4','Hoàng Thu Thảo','TECHNICIAN')]
        db.add_all([User(username=u, full_name=n, role=r, password_hash=shared_hash) for u,n,r in people])
        names = ['Nguyễn Hà Anh','Trần Ngọc Lan','Lê Minh Châu','Phạm Thu Hương','Vũ Thảo Nhi','Đỗ Quỳnh Anh','Hoàng Bảo Trân','Bùi Ngọc Ánh','Đặng Mai Phương','Ngô Thanh Tâm','Dương Khánh Vy','Lý Thu Trang','Đinh Bảo Hân','Tạ Minh Thư','Võ Ngọc Diệp','Cao Thanh Trúc','Lâm Hải Yến','Hồ Gia Linh','Mai Tú Anh','Phan Cẩm Tú']
        db.add_all([Customer(full_name=n, phone=f'090000{i:04d}', email=f'khach{i}@example.com', note='Hồ sơ hư cấu dùng cho demo.') for i,n in enumerate(names,1)])
        menu = [('Chăm sóc da cơ bản',45,250000,'Làm sạch và chăm sóc da cơ bản'),('Dưỡng ẩm thư giãn',60,380000,'Chăm sóc dưỡng ẩm'),('Massage cổ vai gáy',30,220000,'Thư giãn cổ vai gáy'),('Massage toàn thân',75,550000,'Thư giãn toàn thân'),('Chăm sóc da chuyên sâu',90,650000,'Chăm sóc da nhiều bước'),('Gội đầu dưỡng sinh',45,180000,'Gội đầu và thư giãn'),('Chăm sóc tay',30,150000,'Chăm sóc da tay'),('Chăm sóc chân',40,200000,'Chăm sóc và thư giãn chân'),('Tẩy tế bào chết cơ thể',45,320000,'Chăm sóc cơ thể'),('Mặt nạ thư giãn',30,160000,'Chăm sóc và thư giãn da mặt')]
        db.add_all([Service(name=n, duration=d, price=p, description=desc) for n,d,p,desc in menu])
        db.add_all([Product(name=n, code=f'SP{i:03d}', price=p, stock=20+i) for i,(n,p) in enumerate([('Sữa rửa mặt dịu nhẹ',180000),('Toner dưỡng ẩm',210000),('Kem dưỡng da',320000),('Mặt nạ dưỡng ẩm',45000),('Dầu massage',250000),('Dầu gội thảo mộc',190000),('Kem dưỡng tay',95000),('Muối ngâm chân',85000)],1)])
        db.flush()
        for name, price, items in [('Gói Da Mềm',1600000,[(1,4),(2,2)]),('Gói Thư Giãn',1900000,[(3,3),(4,3)]),('Gói An Nhiên',1200000,[(6,4),(10,4)])]:
            p = Package(name=name, price=price, valid_days=90)
            db.add(p); db.flush()
            db.add_all([PackageService(package_id=p.id, service_id=s, quantity=q) for s,q in items])
        local = datetime.now(timezone(timedelta(hours=7))).replace(hour=9,minute=0,second=0,microsecond=0)
        for i in range(1,25):
            start = local + timedelta(days=i-18, hours=i%3*2)
            past = start < datetime.now(start.tzinfo)
            status = 'CANCELLED' if i%7 == 0 else ('COMPLETED' if past else 'BOOKED')
            sid = (i%10)+1
            s = db.get(Service,sid)
            a = Appointment(customer_id=(i%20)+1, start_time=start.astimezone(timezone.utc).isoformat(), end_time=(start+timedelta(minutes=s.duration)).astimezone(timezone.utc).isoformat(), status=status, created_by=2, note='Lịch mẫu')
            db.add(a); db.flush()
            line = AppointmentService(appointment_id=a.id,service_id=sid,technician_id=4+i%4,start_time=a.start_time,end_time=a.end_time,duration=s.duration,price=s.price,status='COMPLETED' if status=='COMPLETED' else ('CANCELLED' if status=='CANCELLED' else 'PENDING'),care_note='Khách đã hoàn thành buổi chăm sóc.' if status=='COMPLETED' else '')
            db.add(line); db.flush()
            if status == 'COMPLETED':
                inv = Invoice(customer_id=a.customer_id, subtotal=s.price, discount=0,total=s.price,status='PAID',payment_method='CASH',paid_at=a.end_time,created_by=2)
                db.add(inv); db.flush()
                db.add(InvoiceItem(invoice_id=inv.id,kind='SERVICE',reference_id=line.id,appointment_service_id=line.id,name=s.name,quantity=1,unit_price=s.price))
        p = db.get(Package,1)
        inv = Invoice(customer_id=1,subtotal=p.price,discount=0,total=p.price,status='PAID',payment_method='TRANSFER',paid_at=now(),created_by=2)
        db.add(inv); db.flush()
        item = InvoiceItem(invoice_id=inv.id,kind='PACKAGE',reference_id=p.id,name=p.name,quantity=1,unit_price=p.price)
        db.add(item); db.flush()
        cp = CustomerPackage(customer_id=1,package_id=1,invoice_item_id=item.id,name=p.name,purchased_at=now(),expires_at=(datetime.now(timezone.utc)+timedelta(days=90)).isoformat())
        db.add(cp); db.flush()
        db.add_all([CustomerPackageItem(customer_package_id=cp.id,service_id=s, total_quantity=q) for s,q in [(1,4),(2,2)]])
        for c in [1,2,3]:
            plan = Plan(customer_id=c,name='Chăm sóc định kỳ',start_date=local.date().isoformat(),note='4 buổi chăm sóc cơ bản')
            db.add(plan); db.flush()
            db.add_all([TreatmentSession(plan_id=plan.id,number=n,service_id=1) for n in range(1,5)])
    print('Demo data created. Shared demo password: SpaDemo@123')

if __name__ == '__main__':
    seed()
