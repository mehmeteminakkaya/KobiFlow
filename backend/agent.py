"""
Nexus — Hızlı AI Agent
Strateji: keyword tespiti → DB'den veri çek → tek API çağrısıyla yanıt üret.
Tool calling yerine pre-fetch: 1 API çağrısı, daha hızlı, daha güvenilir.
"""
import os
import json
from openai import OpenAI
from sqlalchemy.orm import Session
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.getenv("NVIDIA_API_KEY"),
)
MODEL = "meta/llama-3.1-8b-instruct"
MODEL_FALLBACK = "meta/llama-3.3-70b-instruct"

SYSTEM_PROMPT = """Sen Nexus'un operasyon asistanısın. Fincan Kahve adlı İstanbul merkezli 3 şubeli (Kadıköy, Beşiktaş, Şişli) bir kafenin verilerini yönetiyorsun.

DİL KURALI — EN ÖNEMLİ KURAL:
- Yanıtların %100 Türkçe olmalı. İngilizce kelime ASLA kullanma.
- "necessary", "still", "more" gibi İngilizce kelimeler yerine Türkçe karşılıklarını kullan.
- Yazım yanlışı yapma: "normaldur" değil "normaldir", "moretlemek" diye bir kelime yok.
- Cümleler akıcı ve doğal Türkçe olsun; robotik, tekrarlayan ifadelerden kaçın.

KESINLIKLE YASAK:
- get_orders(), fetch_data() gibi fonksiyon adları ASLA yazma.
- Kod bloğu, Python/SQL sözdizimi ASLA yazma.
- "Şu fonksiyonu çalıştır", "API çağrısı yap" gibi teknik cümleler ASLA.
- Aynı bilgiyi tekrar tekrar yazma — her cümle yeni bir şey söylesin.

DOĞRU Aksiyon Önerisi örnekleri:
✅ "Bekleyen siparişleri kargoya ver."
✅ "Grand Hotel ile iletişime geç, teslimatı onayla."
✅ "Espresso Roast Beans için tedarikçiye sipariş aç."

FORMAT KURALLARI:
- Sıcak ve kısa konuş, iş arkadaşı gibi.
- 1-2 kayıt → kısa paragraf. 3+ kayıt → Markdown tablosu.
- Para birimi ₺. Emoji kullanma — sadece çok kritik durumlarda tek bir uyarı işareti yeterli.
- Analiz sorularında yanıtın sonuna **Aksiyon Önerisi:** ekle.
- Selamlaşmada veri listeleme, sadece sohbet et.

YORUM VE İÇGÖRÜ:
- Veriyi sadece listeleme, yorumla. "Bu dönem X çok satılmış, stok yenilemek gerekir." gibi.
- Stok verisinde kritik ürünleri öne çıkar, neden kritik olduğunu 1 cümleyle açıkla.
- Satış verisinde hangi ürün/kategori öne çıkmış, trendin nereye gittiğini söyle.
- Müşteri verisinde en çok harcayan ve kayıp riski taşıyan müşterileri yorumla.
"""


def _is_greeting(msg: str) -> bool:
    """Mesajın sadece bir selamlama olup olmadığını kontrol eder."""
    greetings = ['selam', 'merhaba', 'naber', 'günaydın', 'iyi akşamlar',
                 'iyi günler', 'hey', 'hi', 'hello', 'sa', 'selamlar',
                 'nasılsın', 'ne haber', 'hola', 'merba', 'slm', 'mrb',
                 'hayırlı günler', 'iyi geceler', 'günaydınlar', 'nbr']
    cleaned = msg.strip().rstrip('!?.,:;').strip().lower()
    # Eğer mesaj sadece bir selamlamaysa (ve başka iş kelimesi yoksa)
    if cleaned in greetings:
        return True
    # Çok kısa mesajlar (1-3 kelime) ve selamlama içeriyorsa
    words = cleaned.split()
    if len(words) <= 3 and any(g in cleaned for g in greetings):
        return True
    return False


def _fetch_context(user_message: str, db: Session) -> str:
    """
    Kullanıcı mesajındaki anahtar kelimelere göre DB'den ilgili veriyi çeker.
    Sonucu tek bir context string olarak döner.
    Selamlama mesajlarında veri çekmez — sohbet doğal aksın.
    """
    from tool_executor import (get_orders, get_stock_status, get_daily_summary,
                                get_sales_analysis, get_insights,
                                get_stock_predictions, get_customers,
                                get_shipping_status)

    msg = user_message.lower()

    # Selamlama mesajlarında veri çekme — doğal karşılık ver
    if _is_greeting(msg):
        return ""

    parts = []

    # Günlük özet / genel soru
    if any(w in msg for w in ['özet', 'durum', 'genel', 'günlük', 'bugün']):
        parts.append(("GÜNLÜK ÖZET", get_daily_summary(db)))

    # Sipariş sorguları
    if any(w in msg for w in ['sipariş', 'order', 'teslim', 'bekle']):
        if 'bekle' in msg or 'pending' in msg:
            parts.append(("BEKLEYEN SİPARİŞLER", get_orders(db, status='pending')))
        elif 'teslim' in msg or 'delivered' in msg:
            parts.append(("TESLİM EDİLEN SİPARİŞLER", get_orders(db, status='delivered')))
        else:
            parts.append(("SON SİPARİŞLER", get_orders(db)))

    # Kargo sorguları
    if any(w in msg for w in ['kargo', 'teslimat', 'gönderi', 'gecik', 'takip', 'shipping']):
        is_delayed = any(w in msg for w in ['gecik', 'geç', 'sorun', 'problem'])
        parts.append(("KARGO DURUMU", get_shipping_status(db, only_delayed=is_delayed)))
        # Kargo sorulduğunda kargodaki siparişleri de göster
        if not any(t[0].startswith("KARGO") for t in parts if t[0] == "KARGODAKI SİPARİŞLER"):
            parts.append(("KARGODAKI SİPARİŞLER", get_orders(db, status='shipped')))

    # Stok sorguları
    if any(w in msg for w in ['stok', 'ürün', 'stock', 'envanter', 'kritik', 'bitecek', 'azaldı']):
        if any(w in msg for w in ['kritik', 'azald', 'bit', 'acil']):
            parts.append(("KRİTİK STOKLAR", get_stock_status(db, only_critical=True)))
        else:
            parts.append(("STOK DURUMU", get_stock_status(db)))

    # Satış analizi
    if any(w in msg for w in ['satış', 'analiz', 'ciro', 'gelir', 'para', 'kazanç', 'performans']):
        period = 'this_week' if 'hafta' in msg else 'this_month'
        parts.append(("SATIŞ ANALİZİ", get_sales_analysis(db, period=period)))

    # Müşteri sorguları
    if any(w in msg for w in ['müşteri', 'customer', 'alıcı', 'sadık', 'vip']):
        top = any(w in msg for w in ['en iyi', 'top', 'sadık', 'çok'])
        parts.append(("MÜŞTERİLER", get_customers(db, top_by_spending=top)))

    # İçgörüler / tahminler
    if any(w in msg for w in ['içgörü', 'insight', 'öneri', 'uyarı', 'tahmin']):
        parts.append(("AI İÇGÖRÜLERİ", get_insights(db)))
        parts.append(("STOK TAHMİNLERİ", get_stock_predictions(db)))

    # Hiç eşleşme yoksa günlük özet ver (ama selamlama değilse)
    if not parts:
        parts.append(("GÜNLÜK ÖZET", get_daily_summary(db)))

    # Context'i birleştir — veriyi sıkıştır, büyük listeler truncate et
    context_lines = []
    for title, data in parts:
        # Liste tipinde veri gelirse max 8 kayıtla sınırla
        if isinstance(data, list) and len(data) > 8:
            data = data[:8]
        elif isinstance(data, dict):
            # İç listeler varsa truncate et
            for k, v in data.items():
                if isinstance(v, list) and len(v) > 8:
                    data[k] = v[:8]
        compact = json.dumps(data, ensure_ascii=False, default=str, separators=(',', ':'))
        # Tek bir alan çok uzunsa kırp
        if len(compact) > 1800:
            compact = compact[:1800] + '...'
        context_lines.append(f"\n[{title}]: {compact}")

    return "\n".join(context_lines)


def chat_with_agent(user_message: str, history: list, db: Session) -> dict:
    """
    Ana chat fonksiyonu.
    1. DB'den ilgili veriyi çek (keyword bazlı, anında)
    2. Tek bir API çağrısıyla yanıt üret
    """
    # Veriyi çek
    try:
        context = _fetch_context(user_message, db)
    except Exception as e:
        print(f"[agent] Context fetch hatası: {e}")
        context = ""

    # Mesajları hazırla
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Kısa geçmiş (son 4 mesaj)
    for msg in history[-4:]:
        messages.append({"role": msg["role"], "content": msg["content"]})

    # Kullanıcı mesajı + veri context'i
    user_content = user_message
    if context:
        user_content += f"\n\n[Güncel İşletme Verileri:{context}]"

    messages.append({"role": "user", "content": user_content})

    # Tek API çağrısı
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=0.6,
            top_p=0.85,
            max_tokens=500,
        )
        answer = response.choices[0].message.content or ""
    except Exception as e:
        print(f"[agent] API hatası: {e}")
        answer = "Şu an yanıt veremiyorum, lütfen tekrar deneyin."

    return {"response": answer.strip(), "tool_calls": []}


_GREETING_REPLIES = [
    "Selam! ☕ Bugün ne bakıyoruz?",
    "Merhaba! Hangi şubeyle başlıyoruz?",
    "Günaydın! Fincan Kahve'de bugün neler var?",
    "Selam! Stok mu, sipariş mi, analiz mi?",
    "Hey! Kadıköy, Beşiktaş ve Şişli sizi bekliyor. Ne yapalım?",
]

def chat_with_agent_stream(user_message: str, history: list, db: Session):
    """
    Streaming versiyonu — aynı pre-fetch yaklaşımıyla ama token token.
    Selamlama mesajları API'ye gitmez, anında yanıtlanır.
    """
    import json as _json
    import random

    # Selamlama → API'ye gitme, anında yanıtla
    if _is_greeting(user_message):
        reply = random.choice(_GREETING_REPLIES)
        yield f"data: {_json.dumps({'type': 'token', 'text': reply}, ensure_ascii=False)}\n\n"
        yield f"data: {_json.dumps({'type': 'done'})}\n\n"
        return

    try:
        context = _fetch_context(user_message, db)
    except Exception as e:
        print(f"[agent] Context fetch hatası: {e}")
        context = ""

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in history[-4:]:
        messages.append({"role": msg["role"], "content": msg["content"]})

    user_content = user_message
    if context:
        user_content += f"\n\n[Güncel İşletme Verileri:{context}]"
    messages.append({"role": "user", "content": user_content})

    for attempt_model in [MODEL, MODEL_FALLBACK]:
        try:
            stream = client.chat.completions.create(
                model=attempt_model,
                messages=messages,
                temperature=0.7,
                top_p=0.9,
                max_tokens=900,
                stream=True,
            )
            for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta
                if delta and delta.content:
                    yield f"data: {_json.dumps({'type': 'token', 'text': delta.content}, ensure_ascii=False)}\n\n"
            break  # başarılı, döngüden çık
        except Exception as e:
            print(f"[agent] Stream hatası ({attempt_model}): {e}")
            if attempt_model == MODEL_FALLBACK:
                yield f"data: {_json.dumps({'type': 'token', 'text': 'Bağlantı hatası. Lütfen tekrar deneyin.'}, ensure_ascii=False)}\n\n"

    yield f"data: {_json.dumps({'type': 'done'})}\n\n"
