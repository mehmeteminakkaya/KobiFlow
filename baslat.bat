@echo off
title Nexus - Baslatiliyor...

set ROOT=%~dp0
set BACKEND=%ROOT%backend
set FRONTEND=%ROOT%frontend

echo.
echo ==========================================
echo   Nexus v2.0 - Baslatiliyor...
echo ==========================================
echo.

:: ─── PYTHON CHECK ──────────────────────────
echo [1/4] Python kontrol ediliyor...
python --version >nul 2>&1
if errorlevel 1 (
    echo HATA: Python bulunamadi! python.org'dan indirin.
    pause
    exit /b 1
)
echo      Python OK

:: ─── VENV KURULUM ──────────────────────────
echo [2/4] Venv ve paketler kuruluyor...

if not exist "%BACKEND%\venv2\Scripts\python.exe" (
    echo      Yeni venv olusturuluyor...
    python -m venv "%BACKEND%\venv2"
)

echo      Paketler yukleniyor (ilk seferde 2-3 dk surer)...
"%BACKEND%\venv2\Scripts\pip.exe" install fastapi==0.111.0 "uvicorn[standard]==0.29.0" sqlalchemy==2.0.30 pydantic==2.7.1 python-dotenv "openai>=1.30.0" "python-jose[cryptography]" "passlib[bcrypt]" APScheduler python-multipart Pillow -q
echo      Paketler OK

:: ─── .env KONTROL ──────────────────────────
if not exist "%BACKEND%\.env" (
    echo.
    echo [!] .env dosyasi bulunamadi!
    echo     .env.example kopyalaniyor...
    copy "%ROOT%.env.example" "%BACKEND%\.env" >nul
    echo     Lutfen NVIDIA_API_KEY degiskenini doldurun.
    echo     Notepad aciliyor...
    notepad "%BACKEND%\.env"
    echo     Devam ediliyor...
    timeout /t 2 >nul
)

:: ─── FRONTEND KONTROL ──────────────────────
echo [3/4] Frontend kontrol ediliyor...

if not exist "%FRONTEND%\node_modules\recharts" (
    echo      recharts yukleniyor...
    cd /d "%FRONTEND%"
    call npm install recharts --silent 2>nul
    echo      Frontend OK
) else (
    echo      Frontend OK (zaten yuklu)
)

:: ─── BASLATMA ──────────────────────────────
echo [4/4] Sunucular baslatiliyor...
echo.

start "Backend (FastAPI :8000)" cmd /k "cd /d "%BACKEND%" && venv2\Scripts\activate && python main.py"
timeout /t 4 /nobreak >nul

start "Frontend (Vite :5173)" cmd /k "cd /d "%FRONTEND%" && npm run dev"
timeout /t 5 /nobreak >nul

start "" "http://localhost:5173"

echo.
echo ==========================================
echo   Hazir!
echo   Site  : http://localhost:5173
echo   API   : http://localhost:8000
echo   Giris : admin / admin123
echo ==========================================
echo.
echo Sunuculari durdurmak icin acilan
echo siyah pencereleri kapatin.
echo.
pause
