import os
import tempfile
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

test_directory = tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parent)
os.environ['DATABASE_URL'] = 'sqlite:///' + (Path(test_directory.name) / 'test.db').as_posix()
os.environ['AI_PROVIDER'] = 'mock'
os.environ['JWT_SECRET'] = 'test-secret-for-isolated-demo-test-suite-only'

from app.db import Base, engine, Session, User, Customer, Service, Product, Package, PackageService
from app.security import hash_password, token
from app.main import app
from app.ai.service import calls

@pytest.fixture(autouse=True)
def reset_database():
    # SQLite cannot topologically drop the intentional billing/package cycle.
    with engine.connect() as connection:
        connection.exec_driver_sql('PRAGMA foreign_keys=OFF')
        for table in Base.metadata.tables.values():
            connection.exec_driver_sql(f'DROP TABLE IF EXISTS "{table.name}"')
        connection.commit()
        connection.exec_driver_sql('PRAGMA foreign_keys=ON')
    Base.metadata.create_all(engine)
    calls.clear()
    with Session.begin() as db:
        password = hash_password('SpaDemo@123')
        db.add_all([User(id=1, username='admin', full_name='Admin', role='ADMIN', password_hash=password),User(id=2, username='letan', full_name='Lễ tân', role='RECEPTIONIST', password_hash=password),User(id=3, username='ktv1', full_name='KTV 1', role='TECHNICIAN', password_hash=password),User(id=4, username='ktv2', full_name='KTV 2', role='TECHNICIAN', password_hash=password)])
        db.add_all([Customer(id=i, full_name=f'Khách {i}') for i in range(1,5)])
        db.add_all([Service(id=1, name='Massage thư giãn', duration=60, price=300000),Service(id=2,name='Chăm sóc da',duration=30,price=200000),Service(id=3,name='Dịch vụ ngừng',duration=30,price=100000,active=False)])
        db.add_all([Product(id=1,name='Kem dưỡng',code='P1',price=150000,stock=5),Product(id=2,name='Mặt nạ',code='P2',price=50000,stock=1)])
        db.add(Package(id=1,name='Gói mẫu',price=500000,valid_days=90))
        db.flush()
        db.add(PackageService(package_id=1,service_id=1,quantity=1))
    yield

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture
def headers():
    with Session() as db:
        return {str(u.id): {'Authorization':'Bearer '+token(u)} for u in db.query(User).all()}

def pytest_sessionfinish(session, exitstatus):
    engine.dispose()
    test_directory.cleanup()
