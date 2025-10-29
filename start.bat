@echo off
echo 🚀 MGNREGA District Tracker - Quick Start
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    echo    Visit: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js detected
node --version

REM Install dependencies
echo.
echo 📦 Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

REM Build React app
echo.
echo 🏗️ Building React application...
cd client
npm install
npm run build
cd ..
if %errorlevel% neq 0 (
    echo ❌ Failed to build React application
    pause
    exit /b 1
)

REM Create necessary directories
echo.
echo 📁 Creating directories...
if not exist data mkdir data
if not exist logs mkdir logs

REM Set environment variables
set NODE_ENV=production
set PORT=3000

echo.
echo 🎉 Setup completed successfully!
echo.
echo 📋 Next steps:
echo    1. Start the server: npm start
echo    2. Open browser: http://localhost:3000
echo    3. For production: Follow DEPLOYMENT.md guide
echo.
echo 🔧 Available commands:
echo    npm start          - Start production server
echo    npm run dev        - Start development server
echo.
echo 📱 The application is now ready!
echo    - Mobile-friendly design
echo    - Automatic district detection
echo    - Offline support
echo    - Accessible for low-literacy users
echo.
echo 🌐 Access the application at: http://localhost:3000
pause
