#!/bin/bash

# MGNREGA Tracker Deployment Script
# Author: Vijay Bontha

echo "🚀 Starting MGNREGA Tracker Deployment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Create logs directory
mkdir -p logs

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install client dependencies and build
echo "🏗️ Building React application..."
cd client
npm install
npm run build
cd ..

# Create data directory if it doesn't exist
mkdir -p data

# Set environment variables
export NODE_ENV=production
export PORT=3000

# Stop existing PM2 processes
echo "🛑 Stopping existing processes..."
pm2 stop mgnrega-tracker 2>/dev/null || true
pm2 delete mgnrega-tracker 2>/dev/null || true

# Start the application with PM2
echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup

echo "✅ Deployment completed successfully!"
echo "🌐 Application is running on port 3000"
echo "📊 Monitor with: pm2 monit"
echo "📝 View logs with: pm2 logs mgnrega-tracker"
echo "🔄 Restart with: pm2 restart mgnrega-tracker"
