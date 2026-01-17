@echo off
echo Staging all changes...
git add -A

echo Committing changes...
git commit -m "revert to client-side upload, add search to event posters, CORS configured"

echo Pushing to GitHub...
git push origin main

echo.
echo Done! Changes pushed to GitHub.
echo Vercel will auto-deploy in 2-3 minutes.
pause
