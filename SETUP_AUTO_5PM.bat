@echo off
set "SCRIPT_PATH=%~dp0RUN_UPDATE.bat"
echo.
echo ==========================================
echo      SETTING UP 5PM AUTO-UPDATER
echo ==========================================
echo.
echo This will tell Windows to click the button for you every day at 5:00 PM.
echo Script to run: %SCRIPT_PATH%
echo.

schtasks /create /tn "AI_News_Curator_Daily" /tr "\"%SCRIPT_PATH%\"" /sc daily /st 17:00 /f

echo.
echo ==========================================
echo      SUCCESS! 
echo ==========================================
echo.
echo Your computer will now run the update automatically at 5:00 PM.
echo You just need to check the website.
echo.
pause
