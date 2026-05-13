"""
OCR Service — Vision LLM + optional Tesseract fallback.
Strateji: görüntüyü base64'e çevir → vision modeline gönder → yapılandırılmış JSON al.
Tesseract kurulu değilse de çalışır.
"""
import os
import re
import json
import base64
from typing import Optional
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Tesseract path — opsiyonel, varsa kullanılır
TESSERACT_CMD = os.getenv("TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe")

# NVIDIA/Llama client
client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.getenv("NVIDIA_API_KEY"),
)

# Vision model — görüntüyü doğrudan okur, Tesseract gerekmez
VISION_MODEL = "meta/llama-3.2-11b-vision-instruct"
# Metin tabanlı fallback (Tesseract çıktısı varsa kullanılır)
TEXT_MODEL = "mistralai/mistral-nemo-12b-instruct"

UPLOAD_DIR = Path("uploads/invoices")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _optimize_for_vision(image_bytes: bytes, max_dim: int = 768) -> bytes | None:
    """
    Görüntüyü vision model için optimize eder.
    Hız odaklı: 768px, JPEG %78 → base64 boyutu ~5x küçülür, model yanıtı çok hızlanır.
    Fatura metni için 768px fazlasıyla yeterlidir.
    """
    try:
        import io
        from PIL import Image, ImageEnhance

        img = Image.open(io.BytesIO(image_bytes))

        # RGBA veya palette → RGB
        if img.mode in ("RGBA", "P", "LA"):
            bg = Image.new("RGB", img.size, (255, 255, 255))
            bg.paste(img, mask=img.split()[-1] if img.mode in ("RGBA", "LA") else None)
            img = bg
        elif img.mode != "RGB":
            img = img.convert("RGB")

        # Boyut sınırla — 768px yeterli, daha büyük = daha yavaş
        w, h = img.size
        if max(w, h) > max_dim:
            scale = max_dim / max(w, h)
            img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

        # Kontrast artır — fatura yazıları daha net
        img = ImageEnhance.Contrast(img).enhance(1.5)
        img = ImageEnhance.Sharpness(img).enhance(1.4)

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=78)  # 78 kalite → küçük dosya, okunabilir metin
        optimized = buf.getvalue()
        print(f"[ocr] Görüntü optimize: {len(image_bytes)//1024}KB → {len(optimized)//1024}KB")
        return optimized

    except Exception as e:
        print(f"[ocr] Görüntü optimize hatası (devam ediliyor): {e}")
        return None


def _preprocess_image(image_path: str):
    """Görüntüyü OCR için optimize et."""
    try:
        from PIL import Image, ImageFilter, ImageEnhance
        import numpy as np

        img = Image.open(image_path)

        # Griye çevir
        if img.mode != "L":
            img = img.convert("L")

        # Kontrast arttır
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(2.0)

        # Keskinleştir
        img = img.filter(ImageFilter.SHARPEN)

        # Boyut standardize (min 1000px genişlik)
        w, h = img.size
        if w < 1000:
            scale = 1000 / w
            img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

        processed_path = image_path + "_processed.png"
        img.save(processed_path, "PNG")
        return processed_path

    except Exception as e:
        print(f"[ocr] Preprocessing hatası: {e}")
        return image_path


def extract_text_from_image(image_path: str) -> str:
    """Tesseract ile görüntüden metin çıkar."""
    try:
        import pytesseract
        from PIL import Image

        # Windows'ta Tesseract path'i ayarla
        if os.name == "nt" and os.path.exists(TESSERACT_CMD):
            pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

        # Görüntüyü preprocess et
        processed = _preprocess_image(image_path)
        img = Image.open(processed)

        # Türkçe + İngilizce dil desteği ile OCR
        custom_config = r"--oem 3 --psm 6 -l tur+eng"
        text = pytesseract.image_to_string(img, config=custom_config)

        # Geçici dosyayı temizle
        if processed != image_path and os.path.exists(processed):
            os.remove(processed)

        return text.strip()

    except ImportError:
        print("[ocr] pytesseract yüklü değil, AI-only mod kullanılıyor.")
        return ""
    except Exception as e:
        print(f"[ocr] OCR hatası: {e}")
        return ""


VISION_PROMPT = """Sen bir fatura okuma asistanısın. Bu fatura/fiş görselini analiz et.

SADECE bir JSON objesi döndür. Önce veya sonra hiçbir açıklama yazma. { ile başla.

{
  "supplier": "firma/tedarikçi adı Türkçe veya null",
  "invoice_number": "fatura no veya null",
  "date": "DD.MM.YYYY formatında tarih veya null",
  "due_date": "DD.MM.YYYY formatında vade tarihi veya null",
  "items": [{"name": "ürün/hizmet adı Türkçe", "quantity": sayı, "unit_price": sayı, "total_price": sayı}],
  "subtotal": sayı veya null,
  "tax_rate": KDV % sayı veya null,
  "tax_amount": KDV tutarı sayı veya null,
  "total": genel toplam sayı veya null,
  "currency": "TRY",
  "notes": "varsa önemli not veya null"
}

Kurallar:
- İngilizce ürün/hizmet adlarını Türkçeye çevir (Coffee→Kahve, Tea→Çay, vb.)
- Sayılarda ondalık nokta kullan: 12.50 (virgül değil)
- Para birimi sembolü yazma, sadece rakam
- Bilinmeyen alanlar için null"""


def _extract_json(raw: str) -> dict | None:
    """JSON'u çeşitli yöntemlerle metinden çıkarmaya çalışır."""
    raw = raw.strip()

    # 1. Markdown kod bloklarını temizle
    raw = re.sub(r"```json\s*", "", raw)
    raw = re.sub(r"```\s*", "", raw)
    raw = raw.strip()

    # 2. Direkt parse dene
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # 3. { ... } bloğunu bul (en dıştaki)
    try:
        start = raw.index('{')
        end = raw.rindex('}') + 1
        return json.loads(raw[start:end])
    except (ValueError, json.JSONDecodeError):
        pass

    # 4. Virgüllü sayıları düzelt (Türkçe format: 1.234,56 → 1234.56)
    try:
        fixed = re.sub(r'(\d)\.(\d{3})', r'\1\2', raw)   # binlik ayracı kaldır
        fixed = re.sub(r'(\d),(\d{2})\b', r'\1.\2', fixed)  # ondalık virgülü noktaya çevir
        start = fixed.index('{')
        end = fixed.rindex('}') + 1
        return json.loads(fixed[start:end])
    except (ValueError, json.JSONDecodeError):
        pass

    return None


def parse_invoice_with_vision(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    """
    Vision modeli ile fatura görselini doğrudan analiz et.
    2 deneme yapar: önce tam prompt, sonra sadeleştirilmiş.
    """
    b64 = base64.standard_b64encode(image_bytes).decode("utf-8")
    data_url = f"data:{mime_type};base64,{b64}"

    raw = ""
    try:
        response = client.chat.completions.create(
            model=VISION_MODEL,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": data_url}},
                    {"type": "text", "text": VISION_PROMPT},
                ]
            }],
            temperature=0.01,
            max_tokens=650,
        )

        raw = response.choices[0].message.content or ""
        print(f"[ocr] Vision yanıtı ({len(raw)} chars): {raw[:200]}")

        parsed = _extract_json(raw)
        if parsed and isinstance(parsed, dict):
            parsed["ai_parsed"] = True
            parsed["method"] = "vision"
            return parsed

        print(f"[ocr] JSON parse başarısız, ham yanıt: {raw[:300]}")

    except Exception as e:
        print(f"[ocr] Vision model hatası: {e}")

    return _fallback_response(f"Görsel okunamadı. Lütfen daha net bir fotoğraf çek.")


def parse_invoice_with_ai(ocr_text: str, image_base64: Optional[str] = None) -> dict:
    """
    Metin tabanlı AI parse — Tesseract çıktısı mevcutsa kullanılır.
    """
    system_prompt = (
        "Sen bir fatura ayrıştırma asistanısın. Verilen metinden fatura verilerini çıkar ve "
        "SADECE geçerli bir JSON objesi döndür (açıklama yok, markdown yok). { ile başla.\n"
        "Alanlar: supplier, invoice_number, date (DD.MM.YYYY), due_date (DD.MM.YYYY), "
        "items (dizi: name/quantity/unit_price/total_price), subtotal, tax_rate, tax_amount, "
        "total, currency (TRY), notes. Bulunamayan alanlar null. Sayılarda sembol yok.\n"
        "ÖNEMLİ: İngilizce ürün/hizmet adlarını Türkçeye çevir."
    )

    if not ocr_text or len(ocr_text) < 20:
        return _fallback_response("OCR metni çok kısa.")

    try:
        response = client.chat.completions.create(
            model=TEXT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": f"Invoice text:\n\n{ocr_text[:3000]}"}
            ],
            temperature=0.01,
            max_tokens=1000,
        )

        raw = response.choices[0].message.content or ""
        parsed = _extract_json(raw)
        if parsed:
            parsed["ai_parsed"] = True
            parsed["method"] = "ocr+text"
            return parsed

        return _fallback_response("Metin modeli JSON döndürmedi.")

    except Exception as e:
        print(f"[ocr] Text AI parse hatası: {e}")
        return _fallback_response(str(e))


def _fallback_response(error: str) -> dict:
    """AI başarısız olduğunda temel yapı döndür."""
    return {
        "supplier": None,
        "invoice_number": None,
        "date": None,
        "due_date": None,
        "items": [],
        "subtotal": 0.0,
        "tax_rate": 18.0,
        "tax_amount": 0.0,
        "total": 0.0,
        "currency": "TRY",
        "notes": None,
        "ai_parsed": False,
        "method": "failed",
        "error": error
    }


async def process_invoice(file_content: bytes, filename: str) -> dict:
    """
    Ana işlem — Vision-first strateji:
      1. Görüntü dosyası → doğrudan vision modele gönder (Tesseract gerekmez)
      2. Tesseract kuruluysa OCR metni de al, vision başarısız olursa metin modeli kullan
      3. PDF → metin çıkar → metin modeli
    """
    # Dosyayı kaydet
    file_path = UPLOAD_DIR / filename
    with open(file_path, "wb") as f:
        f.write(file_content)

    ext = filename.lower().split(".")[-1]
    result = None

    if ext in ("jpg", "jpeg", "png", "bmp", "tiff", "webp"):
        mime_map = {
            "jpg": "image/jpeg", "jpeg": "image/jpeg",
            "png": "image/png",  "bmp": "image/bmp",
            "tiff": "image/tiff", "webp": "image/webp",
        }
        mime = "image/jpeg"  # Vision model JPEG'i en iyi işler

        # Görüntüyü optimize et: max 1280px, JPEG'e dönüştür, kontrast artır
        optimized_bytes = _optimize_for_vision(file_content)
        send_bytes = optimized_bytes if optimized_bytes else file_content

        print(f"[ocr] Vision model ile analiz ediliyor: {filename} ({len(send_bytes)//1024}KB)")
        result = parse_invoice_with_vision(send_bytes, mime)

        # Vision başarısız olduysa Tesseract + metin modeline düş
        if not result.get("ai_parsed"):
            print("[ocr] Vision başarısız, Tesseract fallback deneniyor...")
            ocr_text = extract_text_from_image(str(file_path))
            if ocr_text and len(ocr_text) > 20:
                result = parse_invoice_with_ai(ocr_text)

    elif ext == "pdf":
        ocr_text = _extract_pdf_text(str(file_path))
        result = parse_invoice_with_ai(ocr_text)

    else:
        result = _fallback_response(f"Desteklenmeyen dosya formatı: {ext}")

    if result is None:
        result = _fallback_response("İşlem tamamlanamadı.")

    result["filename"] = filename
    result["file_path"] = str(file_path)
    return result


def _extract_pdf_text(pdf_path: str) -> str:
    """PDF'den metin çıkar — önce PyMuPDF dene, sonra OCR."""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        if len(text.strip()) > 100:
            return text.strip()
    except ImportError:
        pass

    # PyMuPDF yoksa veya metin çıkmadıysa — pdf2image + tesseract
    try:
        from pdf2image import convert_from_path
        pages = convert_from_path(pdf_path, dpi=200)
        all_text = ""
        for i, page in enumerate(pages[:3]):  # Max 3 sayfa
            temp_path = f"{pdf_path}_page_{i}.png"
            page.save(temp_path, "PNG")
            all_text += extract_text_from_image(temp_path) + "\n"
            os.remove(temp_path)
        return all_text.strip()
    except Exception as e:
        print(f"[ocr] PDF metin çıkarma hatası: {e}")
        return ""
