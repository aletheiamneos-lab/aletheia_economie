@echo off
chcp 65001 >nul
title Economia - Aplicatie interactiva
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js nu este instalat sau nu este disponibil in PATH.
  echo Instaleaza Node.js, apoi deschide din nou acest fisier.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\vite\bin\vite.js" (
  echo Pregatesc aplicatia pentru prima pornire...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo Instalarea nu a reusit. Verifica accesul la internet si incearca din nou.
    pause
    exit /b 1
  )
)

where python >nul 2>nul
if errorlevel 1 (
  echo.
  echo Python nu este instalat. Sectiunea Jocuri are nevoie de Python 3.
  echo Instaleaza Python, apoi deschide din nou acest fisier.
  echo.
  pause
  exit /b 1
)

python -c "import fastapi, uvicorn, pydantic, httpx" >nul 2>nul
if errorlevel 1 (
  echo Pregatesc motorul jocurilor...
  python -m pip install -r "source-materials\economy-games-pack\requirements.txt"
  if errorlevel 1 (
    echo.
    echo Instalarea motorului jocurilor nu a reusit.
    pause
    exit /b 1
  )
)

echo.
echo Aplicatia porneste la adresa http://localhost:4173
echo Pastreaza aceasta fereastra deschisa cat timp folosesti aplicatia.
echo Pentru oprire, inchide fereastra sau apasa Ctrl+C.
echo.

start "Economia - motor jocuri" /min /d "%~dp0" cmd /c "npm run games:api"

call npm run dev -- --open

if errorlevel 1 (
  echo.
  echo Aplicatia s-a oprit cu o eroare.
  pause
)
