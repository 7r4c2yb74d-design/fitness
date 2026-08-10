@echo off
title FORGE - Serveur
cd /d "%~dp0"

echo.
echo ============================================
echo   FORGE - Ouverture sur telephone
echo ============================================
echo.

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set IP=%%a
)
set IP=%IP: =%

echo Sur ton TELEPHONE (connecte au MEME Wi-Fi que ce PC) :
echo.
echo   1. Ouvre ton navigateur internet
echo   2. Tape cette adresse exactement :
echo.
echo      http://%IP%:8000
echo.
echo ============================================
echo Laisse cette fenetre ouverte tant que tu utilises l'app.
echo Pour arreter : ferme simplement cette fenetre.
echo ============================================
echo.

python -m http.server 8000

pause
