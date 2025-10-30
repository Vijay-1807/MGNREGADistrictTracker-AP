# MGNREGA District Performance Tracker

## Project Overview

## Features

- **District Selection**: Easy district selection with visual interface
- **Performance Tracking**: Current and historical MGNREGA performance data
- **Comparative Analysis**: Compare districts and track trends
- **Accessibility**: Designed for low-literacy users with visual indicators
- **Auto-location**: Automatic district detection using geolocation
- **Offline Support**: Cached data for reliability
- **Multi-language**: Telugu and English support

## Technical Architecture

### Backend (Node.js/Express)
- RESTful API with caching layer
- SQLite database for data persistence
- Scheduled data fetching from data.gov.in API
- Rate limiting and error handling
- Production-ready with compression and security headers

### Frontend (React)
- Responsive design for mobile-first approach
- Progressive Web App (PWA) capabilities
- Intuitive UI with icons and visual indicators
- Accessibility features for rural users

### Data Management
- Automated data fetching every 6 hours
- Fallback mechanisms for API downtime
- Data validation and error handling
- Historical data storage for trend analysis

## Installation

```bash
npm install
npm run install-client
npm run build
npm start
```

## Environment Variables

Create a `.env` file:
```
PORT=3000
NODE_ENV=production
API_BASE_URL=https://api.data.gov.in/resource
```

## Deployment

The application is designed for deployment on VPS/cloud platforms with:
- Process management (PM2)
- Reverse proxy (Nginx)
- SSL certificates
- Database backups

## Author

Vijay Bontha - Student Project
