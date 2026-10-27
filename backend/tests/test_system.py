from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import select, func
from app.main import app
from app.db import Session, Product, Invoice, CustomerPackage, PackageUsage, User, Service
from app.ai.service import validate_result
import pytest

def future(hour=9):
    return (datetime.now(timezone.utc)+timedelta(days=3)).replace(hour=hour,minute=0,second=0,microsecond=0).isoformat()

def book(client, headers, customer=1, tech=3, start=None, **extra):
    return client.post('/api/appointments',headers=headers['1'],json={'customer_id':customer,'start_time':start or future(),'items':[{'service_id':1,'technician_id':tech,**extra}]})

def invoice(client, headers, lines=None, customer=1, discount=0):
    return client.post('/api/invoices',headers=headers['2'],json={'customer_id':customer,'discount':discount,'items':lines or [{'kind':'PRODUCT','reference_id':1,'quantity':2}]})

def buy_package(client, headers):
    inv=invoice(client,headers,[{'kind':'PACKAGE','reference_id':1}]).json()
    assert client.get('/api/customers/1/packages',headers=headers['2']).json()==[]
    assert client.post(f"/api/invoices/{inv['id']}/pay",headers=headers['2'],json={'method':'CASH'}).status_code==200
    return client.get('/api/customers/1/packages',headers=headers['2']).json()[0]['items'][0]['id']

def test_auth_and_locked_account(client,headers):
    assert client.post('/api/auth/login',json={'username':'admin','password':'wrong'}).status_code==401
    assert client.post('/api/auth/login',json={'username':'admin','password':'SpaDemo@123'}).status_code==200
    assert client.get('/api/customers').status_code==401
    with Session.begin() as db: db.get(User,3).active=False
    assert client.get('/api/auth/me',headers=headers['3']).status_code==401

def test_roles_and_last_admin(client,headers):
    assert client.get('/api/reports',headers=headers['2']).status_code==403
    assert client.get('/api/customers',headers=headers['3']).status_code==403
    assert client.post('/api/services',headers=headers['2'],json={'name':'A','duration':10,'price':0}).status_code==403
    r=client.put('/api/users/1',headers=headers['1'],json={'username':'admin','full_name':'Admin','role':'TECHNICIAN','active':True})
    assert r.status_code==409

def test_customer_validation_and_persistence(client,headers):
    assert client.post('/api/customers',headers=headers['2'],json={'full_name':'Test','email':'broken'}).status_code==422
    r=client.post('/api/customers',headers=headers['2'],json={'full_name':'Ngọc','phone':'0901234567'})
    assert r.status_code==200
    assert client.get('/api/customers?q=0901234567',headers=headers['2']).json()['total']==1

def test_booking_overlap_and_adjacent(client,headers):
    a=book(client,headers).json()
    start=datetime.fromisoformat(a['start_time'])
    assert book(client,headers,customer=2,start=(start+timedelta(minutes=30)).isoformat()).status_code==409
    assert book(client,headers,customer=2,start=a['end_time']).status_code==200
    assert book(client,headers,customer=1,tech=4).status_code==409

def test_cancel_releases_schedule(client,headers):
    a=book(client,headers).json()
    assert client.post(f"/api/appointments/{a['id']}/status",headers=headers['2'],json={'status':'CANCELLED'}).status_code==200
    assert book(client,headers,customer=2).status_code==200
    assert client.post(f"/api/appointment-services/{a['items'][0]['id']}/complete",headers=headers['1'],json={}).status_code==409

def test_invalid_booking(client,headers):
    payload={'customer_id':1,'start_time':future(),'items':[{'service_id':3,'technician_id':3}]}
    assert client.post('/api/appointments',headers=headers['1'],json=payload).status_code==422
    payload['items'][0]={'service_id':1,'technician_id':2}
    assert client.post('/api/appointments',headers=headers['1'],json=payload).status_code==422
    payload['start_time']='2030-01-01T09:00:00'
    assert client.post('/api/appointments',headers=headers['1'],json=payload).status_code==422

def test_multi_service_and_edit_rollback(client,headers):
    a=book(client,headers,customer=1).json()
    b=book(client,headers,customer=2,tech=4).json()
    r=client.put(f"/api/appointments/{a['id']}",headers=headers['2'],json={'customer_id':1,'start_time':a['start_time'],'items':[{'service_id':1,'technician_id':4}]})
    assert r.status_code==409
    current=client.get('/api/appointments',headers=headers['1']).json()
    assert next(x for x in current if x['id']==a['id'])['items'][0]['technician_id']==3
    assert b['id']!=a['id']
    payload={'customer_id':3,'start_time':future(13),'items':[{'service_id':1,'technician_id':3},{'service_id':2,'technician_id':4}]}
    multi=client.post('/api/appointments',headers=headers['1'],json=payload).json()
    assert multi['items'][0]['end_time']==multi['items'][1]['start_time']

def test_booking_concurrent(headers):
    def send(customer):
        with TestClient(app) as c: return book(c,headers,customer=customer).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        statuses=list(pool.map(send,[1,2]))
    assert sorted(statuses)==[200,409]

def test_scope_and_completion(client,headers):
    a=book(client,headers).json()
    assert client.get('/api/customers/2',headers=headers['3']).status_code==403
    assert client.get('/api/customers/1',headers=headers['3']).status_code==200
    line=a['items'][0]['id']
    assert client.post(f'/api/appointment-services/{line}/complete',headers=headers['4'],json={}).status_code==403
    assert client.post(f'/api/appointment-services/{line}/complete',headers=headers['2'],json={}).status_code==403
    assert client.post(f'/api/appointment-services/{line}/complete',headers=headers['3'],json={'care_note':'Đã thực hiện'}).status_code==200
    assert client.get('/api/appointments',headers=headers['1']).json()[0]['status']=='COMPLETED'

def test_plan_lifecycle(client,headers):
    plan=client.post('/api/plans',headers=headers['2'],json={'customer_id':1,'name':'Một buổi','start_date':'2026-10-27','service_ids':[1]}).json()
    ts=plan['sessions'][0]['id']
    a=book(client,headers,treatment_session_id=ts).json()
    client.post(f"/api/appointment-services/{a['items'][0]['id']}/complete",headers=headers['3'],json={'care_note':'Hoàn thành'})
    p=client.get('/api/plans',headers=headers['2']).json()[0]
    assert p['completed']==1 and p['status']=='COMPLETED'
    assert book(client,headers,start=future(13),treatment_session_id=ts).status_code==409

def test_package_reserve_cancel_complete_once(client,headers):
    eid=buy_package(client,headers)
    a=book(client,headers,customer_package_item_id=eid).json()
    assert book(client,headers,start=future(13),customer_package_item_id=eid).status_code==409
    client.post(f"/api/appointments/{a['id']}/status",headers=headers['2'],json={'status':'CANCELLED'})
    b=book(client,headers,customer_package_item_id=eid).json()
    line=b['items'][0]['id']
    for _ in range(2): assert client.post(f'/api/appointment-services/{line}/complete',headers=headers['3'],json={}).status_code==200
    with Session() as db: assert db.scalar(select(func.count()).select_from(PackageUsage))==1
    assert client.get('/api/customers/1/packages',headers=headers['2']).json()[0]['items'][0]['remaining']==0
    assert client.get('/api/customers/1/billable',headers=headers['2']).json()==[]

def test_package_wrong_owner_and_expired(client,headers):
    eid=buy_package(client,headers)
    assert book(client,headers,customer=2,customer_package_item_id=eid).status_code==409
    with Session.begin() as db: db.get(CustomerPackage,1).expires_at='2020-01-01T00:00:00+00:00'
    assert book(client,headers,customer_package_item_id=eid).status_code==409

def test_money_is_server_side_and_validation(client,headers):
    assert invoice(client,headers,discount=999999999).status_code==422
    assert invoice(client,headers,[{'kind':'PRODUCT','reference_id':1,'quantity':0}]).status_code==422
    inv=invoice(client,headers).json()
    assert inv['total']==300000
    r=client.post('/api/invoices',headers=headers['2'],json={'customer_id':1,'total':1,'items':[{'kind':'PRODUCT','reference_id':1}]})
    assert r.status_code==422

def test_payment_idempotent_and_stock(client,headers):
    inv=invoice(client,headers).json()
    for _ in range(2): assert client.post(f"/api/invoices/{inv['id']}/pay",headers=headers['2'],json={'method':'CASH'}).status_code==200
    with Session() as db: assert db.get(Product,1).stock==3

def test_payment_rollback(client,headers):
    inv=invoice(client,headers,[{'kind':'PRODUCT','reference_id':1,'quantity':2},{'kind':'PRODUCT','reference_id':2,'quantity':2}]).json()
    assert client.post(f"/api/invoices/{inv['id']}/pay",headers=headers['2'],json={'method':'CASH'}).status_code==409
    with Session() as db:
        assert db.get(Product,1).stock==5
        assert db.get(Invoice,inv['id']).status=='DRAFT'

def test_payment_concurrent(client,headers):
    inv=invoice(client,headers).json()
    def pay(_):
        with TestClient(app) as c: return c.post(f"/api/invoices/{inv['id']}/pay",headers=headers['2'],json={'method':'CASH'}).status_code
    with ThreadPoolExecutor(max_workers=2) as pool: assert list(pool.map(pay,[1,2]))==[200,200]
    with Session() as db: assert db.get(Product,1).stock==3

def test_service_invoice_no_double_bill(client,headers):
    a=book(client,headers).json(); sid=a['items'][0]['id']
    assert invoice(client,headers,[{'kind':'SERVICE','reference_id':sid}]).status_code==409
    client.post(f'/api/appointment-services/{sid}/complete',headers=headers['3'],json={})
    assert invoice(client,headers,[{'kind':'SERVICE','reference_id':sid}]).status_code==200
    assert invoice(client,headers,[{'kind':'SERVICE','reference_id':sid}]).status_code==409

def test_reports_paid_only(client,headers):
    invoice(client,headers)
    inv=invoice(client,headers,[{'kind':'PRODUCT','reference_id':1,'quantity':1}]).json()
    client.post(f"/api/invoices/{inv['id']}/pay",headers=headers['2'],json={'method':'TRANSFER'})
    r=client.get('/api/reports',headers=headers['1']).json()
    assert r['revenue']==150000 and r['paid_invoices']==1

def test_ai_mock_limits_and_medical(client,headers):
    r=client.post('/api/ai/generate',headers=headers['2'],json={'customer_id':1,'kind':'recommend','need':'thư giãn'}).json()
    assert r['simulated'] and len(r['result']['recommendations'])==2
    r=client.post('/api/ai/generate',headers=headers['2'],json={'customer_id':1,'kind':'recommend','need':'chẩn đoán bệnh'}).json()
    assert r['result']['recommendations']==[]
    assert client.post('/api/ai/generate',headers=headers['2'],json={'customer_id':1,'kind':'summary'}).status_code==422

@pytest.mark.parametrize('payload',[{'recommendations':[{'service_id':999,'reason':'x'}],'message':''},{'recommendations':[{'service_id':1,'reason':'x'}]*2,'message':''},{'recommendations':[{'service_id':1,'reason':'x'}]*3,'message':''}])
def test_ai_rejects_invalid_results(payload):
    with pytest.raises(ValueError): validate_result('recommend',payload,{'services':[{'id':1}]})

def test_ai_failure_does_not_break_crud(client,headers):
    with patch.dict('os.environ',{'AI_PROVIDER':'gemini','GEMINI_API_KEY':'','AI_MODEL':''}):
        assert client.post('/api/ai/generate',headers=headers['2'],json={'customer_id':1,'kind':'recommend'}).status_code==503
    assert client.get('/api/customers',headers=headers['2']).status_code==200

def test_ai_rate_limit(client,headers):
    for _ in range(10): assert client.post('/api/ai/generate',headers=headers['2'],json={'customer_id':1,'kind':'recommend'}).status_code==200
    assert client.post('/api/ai/generate',headers=headers['2'],json={'customer_id':1,'kind':'recommend'}).status_code==429

def test_reminder_and_summary_scopes(client,headers):
    a=book(client,headers).json()
    r=client.post('/api/ai/generate',headers=headers['2'],json={'customer_id':1,'kind':'reminder','appointment_id':a['id']})
    assert r.status_code==200 and 'Khách 1' in r.json()['result']['text']
    assert client.post('/api/ai/generate',headers=headers['4'],json={'customer_id':1,'kind':'summary'}).status_code==403
    client.post(f"/api/appointment-services/{a['items'][0]['id']}/complete",headers=headers['3'],json={})
    assert client.post('/api/ai/generate',headers=headers['3'],json={'customer_id':1,'kind':'summary'}).status_code==200
