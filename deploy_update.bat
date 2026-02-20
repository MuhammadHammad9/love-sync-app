@echo off
echo ==========================================
echo   LoveSync - Auto Deploy to Vercel (GitHub)
echo ==========================================
echo.

:: Get commit message from first argument or use default
set "commit_msg=%~1"
if "%commit_msg%"=="" set "commit_msg=Update code to trigger Vercel deployment"

echo 1. Adding changed files...
"C:\Program Files\Git\cmd\git.exe" add .

echo 2. Committing changes...
"C:\Program Files\Git\cmd\git.exe" commit -m "%commit_msg%"

echo 3. Pushing to GitHub (This will trigger Vercel to update!)...
"C:\Program Files\Git\cmd\git.exe" push origin master

echo.
echo ==========================================
echo Done! Vercel is now building your changes.
echo The live site will update in ~1 minute.
echo ==========================================
pause
