import json
import os
import re
import time
from collections import defaultdict, deque
from pathlib import Path
import httpx
from fastapi import HTTPException
from pydantic import ValidationError
from ..schemas import RecommendationResult, TextResult

PROMPTS = Path(__file__).parent / 'prompts'
calls = defaultdict(deque)

def validate_result(kind, payload, context):
    if kind == 'recommend':
        result = RecommendationResult.model_validate(payload).model_dump()
        ids = [x['service_id'] for x in result['recommendations']]
        allowed = {s['id'] for s in context['services']}
        if len(ids) != len(set(ids)) or not set(ids).issubset(allowed):
            raise ValueError('Mã dịch vụ ngoài danh sách hoặc bị trùng')
        return result
    return TextResult.model_validate(payload).model_dump()

def mock(kind, c):
    name = c['customer_name']
    if kind == 'recommend':
        if any(w in c['need'].lower() for w in ['chẩn đoán', 'chữa bệnh', 'điều trị bệnh', 'ung thư', 'kê thuốc']):
            return {'recommendations': [], 'message': 'Yêu cầu vượt phạm vi trợ lý spa. Vui lòng trao đổi với người có chuyên môn y tế.'}
        words = set(re.findall(r'\w+', c['need'].lower()))
        ranked = sorted(c['services'], key=lambda s: (-len(words & set(re.findall(r'\w+', (s['name']+' '+s['description']).lower()))), s['id']))
        return {'recommendations': [{'service_id': s['id'], 'reason': 'Lựa chọn minh họa từ danh mục hiện có; nhân viên cần xác nhận nhu cầu.'} for s in ranked[:2]], 'message': 'Đây là gợi ý theo quy tắc giả lập, không phải đánh giá của mô hình AI.'}
    if kind == 'summary':
        lines = [f"{h['date'][:10]}: {h['service']}" + (f" — {h['note']}" if h['note'] else '') for h in c['history'][:8]]
        return {'text': f"Hồ sơ {name}. Có {len(c['history'])} lượt hoàn thành trong dữ liệu được cung cấp.\n" + '\n'.join(lines)}
    a = c['appointment']
    if kind == 'reminder':
        return {'text': f"Chào {name}, An Nhiên Spa xin nhắc lịch {', '.join(a['services'])} lúc {a['time']}. Bạn vui lòng liên hệ spa nếu cần đổi lịch. Hẹn gặp bạn!"}
    return {'text': f"Chào {name}, cảm ơn bạn đã sử dụng {', '.join(a['services'])} tại An Nhiên Spa. Bạn có muốn chia sẻ trải nghiệm sau buổi chăm sóc không? Spa luôn sẵn sàng tiếp nhận phản hồi của bạn."}

async def gemini(kind, context):
    key, model = os.getenv('GEMINI_API_KEY'), os.getenv('AI_MODEL', '')
    if not key or not model or not re.fullmatch(r'[A-Za-z0-9._-]+', model):
        raise HTTPException(503, 'Chưa cấu hình GEMINI_API_KEY và AI_MODEL hợp lệ tại Backend')
    system = (PROMPTS / 'system.txt').read_text(encoding='utf-8')
    task = (PROMPTS / f'{kind}.txt').read_text(encoding='utf-8')
    try:
        async with httpx.AsyncClient(timeout=float(os.getenv('AI_TIMEOUT_SECONDS', '25'))) as client:
            response = await client.post(f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent', headers={'x-goog-api-key': key}, json={'systemInstruction': {'parts': [{'text': system}]}, 'contents': [{'role': 'user', 'parts': [{'text': task + '\nDữ liệu JSON:\n' + json.dumps(context, ensure_ascii=False)}]}], 'generationConfig': {'responseMimeType': 'application/json', 'temperature': 0.2, 'maxOutputTokens': 1600}})
        if response.status_code == 429:
            raise HTTPException(429, 'AI đang giới hạn lượt gọi; vui lòng thử lại sau')
        if response.status_code >= 400:
            raise HTTPException(502, 'Không gọi được Gemini. Kiểm tra cấu hình mô hình và quyền API tại Backend.')
        parts = response.json()['candidates'][0]['content']['parts']
        text = ''.join(x.get('text','') for x in parts if not x.get('thought'))
        return json.loads(text)
    except httpx.TimeoutException:
        raise HTTPException(504, 'AI phản hồi quá thời gian cho phép')
    except (httpx.HTTPError, KeyError, IndexError, json.JSONDecodeError):
        raise HTTPException(502, 'AI không trả kết quả hợp lệ; bạn có thể tiếp tục dùng nghiệp vụ quản lý')

async def generate(kind, context, user_id):
    queue = calls[user_id]
    moment = time.monotonic()
    while queue and queue[0] < moment - 60:
        queue.popleft()
    if len(queue) >= 10:
        raise HTTPException(429, 'Tối đa 10 yêu cầu AI mỗi phút cho mỗi tài khoản')
    queue.append(moment)
    provider = os.getenv('AI_PROVIDER', 'mock')
    if provider not in ('mock','gemini'):
        raise HTTPException(503, 'AI_PROVIDER không hợp lệ')
    payload = mock(kind, context) if provider == 'mock' else await gemini(kind, context)
    try:
        result = validate_result(kind, payload, context)
    except (ValidationError, ValueError, TypeError):
        raise HTTPException(502, 'Kết quả AI sai cấu trúc hoặc dịch vụ không hợp lệ; không sử dụng kết quả này')
    return {'provider': provider, 'simulated': provider == 'mock', 'result': result}
