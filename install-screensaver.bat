@echo off
echo ========================================
echo Earth Screensaver Installation
echo ========================================
echo.

REM Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo This script requires administrator privileges.
    echo Please right-click and select "Run as administrator"
    pause
    exit /b 1
)

REM Check if .scr file exists
if not exist "dist\EarthScreensaver.scr" (
    echo Error: EarthScreensaver.scr not found in dist folder
    echo Please run "npm run build:win:scr" first
    pause
    exit /b 1
)

echo Installing screensaver to System32...
copy /Y "dist\EarthScreensaver.scr" "%SystemRoot%\System32\EarthScreensaver.scr"

if %errorLevel% equ 0 (
    echo.
    echo ========================================
    echo Installation successful!
    echo ========================================
    echo.
    echo To activate the screensaver:
    echo 1. Press Win + I to open Settings
    echo 2. Go to: Personalization ^> Lock screen
    echo 3. Click "Screen saver settings"
    echo 4. Select "EarthScreensaver" from dropdown
    echo 5. Click "Apply" and "OK"
    echo.
    echo To configure settings, click "Settings" button
    echo in the screensaver dialog.
    echo.
) else (
    echo.
    echo Installation failed!
    echo Please check permissions and try again.
    echo.
)

pause
