#!/bin/bash

# MGNREGA Tracker - Quick Start Script
# Author: Vijay Bontha

echo "🚀 MGNREGA District Tracker - Quick Start"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Build React app
echo ""
echo "🏗️ Building React application..."
cd client
npm install
npm run build
cd ..

if [ $? -ne 0 ]; then
    echo "❌ Failed to build React application"
    exit 1
fi

# Create necessary directories
echo ""
echo "📁 Creating directories..."
mkdir -p data
mkdir -p logs

# Set environment variables
export NODE_ENV=production
export PORT=3000

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Start the server: npm start"
echo "   2. Open browser: http://localhost:3000"
echo "   3. For production: Follow DEPLOYMENT.md guide"
echo ""
echo "🔧 Available commands:"
echo "   npm start          - Start production server"
echo "   npm run dev        - Start development server"
echo "   pm2 start server.js - Start with PM2 (if installed)"
echo ""
echo "📱 The application is now ready!"
echo "   - Mobile-friendly design"
echo "   - Automatic district detection"
echo "   - Offline support"
echo "   - Accessible for low-literacy users"
echo ""
echo "🌐 Access the application at: http://localhost:3000"
