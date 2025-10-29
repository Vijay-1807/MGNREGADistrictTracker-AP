# MGNREGA District Tracker - Deployment Guide

## Submission

- **Hosted URL**: [Your VPS/VM URL here - e.g., http://your-server-ip:3000]
- **Loom Walkthrough**: [Your Loom video link here - <2 minutes]

## Project Overview

This is a production-ready web application for tracking MGNREGA district performance in Andhra Pradesh. The application is designed for rural citizens with low literacy levels and provides:

- **Easy-to-understand visualizations** with icons and simple language
- **Automatic district detection** using geolocation
- **Offline support** with cached data
- **Mobile-first responsive design**
- **Multi-language support** (Telugu and English)
- **Production-ready architecture** with caching, rate limiting, and error handling

## Technical Architecture

### Backend (Node.js/Express)
- **Database**: SQLite for data persistence
- **Caching**: In-memory caching with TTL
- **API**: RESTful endpoints with rate limiting
- **Security**: Helmet.js for security headers
- **Performance**: Compression and clustering support
- **Monitoring**: PM2 process management

### Frontend (React)
- **Framework**: React with TypeScript
- **Styling**: CSS with mobile-first approach
- **Icons**: Lucide React for accessibility
- **PWA**: Progressive Web App capabilities
- **Responsive**: Works on all device sizes

### Production Features
- **Auto-data fetching**: Scheduled every 6 hours
- **Fallback mechanisms**: Works even if external API is down
- **Error handling**: Graceful degradation
- **Rate limiting**: Prevents abuse
- **Security headers**: Production-ready security

## Deployment Instructions

### Prerequisites
- Ubuntu 20.04+ or CentOS 8+
- Node.js 18+ 
- Nginx
- PM2 (will be installed automatically)
- SSL certificate (Let's Encrypt recommended)

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx
sudo apt install nginx -y

# Install PM2 globally
sudo npm install -g pm2
```

### Step 2: Application Deployment

```bash
# Clone or upload your application
git clone <your-repo> /var/www/mgnrega-tracker
cd /var/www/mgnrega-tracker

# Install dependencies
npm install
cd client && npm install && npm run build && cd ..

# Set permissions
sudo chown -R www-data:www-data /var/www/mgnrega-tracker
sudo chmod -R 755 /var/www/mgnrega-tracker

# Create logs directory
mkdir -p logs

# Make deployment script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

### Step 3: Nginx Configuration

```bash
# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/mgnrega-tracker

# Update server name and SSL paths in the config
sudo nano /etc/nginx/sites-available/mgnrega-tracker

# Enable the site
sudo ln -s /etc/nginx/sites-available/mgnrega-tracker /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Step 4: SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### Step 5: Firewall Configuration

```bash
# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Allow SSH (if needed)
sudo ufw allow ssh

# Enable firewall
sudo ufw enable
```

## Monitoring and Maintenance

### PM2 Commands
```bash
# View status
pm2 status

# View logs
pm2 logs mgnrega-tracker

# Restart application
pm2 restart mgnrega-tracker

# Monitor in real-time
pm2 monit

# Save PM2 configuration
pm2 save
```

### Database Backup
```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp /var/www/mgnrega-tracker/data/mgnrega.db /var/www/mgnrega-tracker/backups/mgnrega_$DATE.db
find /var/www/mgnrega-tracker/backups -name "*.db" -mtime +7 -delete
EOF

chmod +x backup.sh

# Add to crontab for daily backups
echo "0 2 * * * /var/www/mgnrega-tracker/backup.sh" | sudo crontab -
```

### Log Rotation
```bash
# Configure logrotate
sudo cat > /etc/logrotate.d/mgnrega-tracker << 'EOF'
/var/www/mgnrega-tracker/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

## Performance Optimization

### Database Optimization
- SQLite database is automatically optimized
- Indexes are created for frequently queried fields
- Data is cached to reduce database load

### Caching Strategy
- API responses cached for 6 hours
- Static assets cached for 1 year
- HTML pages cached for 1 hour

### Monitoring
- PM2 provides process monitoring
- Nginx access logs for traffic analysis
- Application logs for error tracking

## Security Features

### Application Security
- Helmet.js for security headers
- Rate limiting (100 requests per 15 minutes)
- Input validation and sanitization
- CORS protection
- SQL injection prevention

### Server Security
- SSL/TLS encryption
- Security headers via Nginx
- Firewall configuration
- Regular security updates

## Troubleshooting

### Common Issues

1. **Application won't start**
   ```bash
   pm2 logs mgnrega-tracker
   # Check for port conflicts or missing dependencies
   ```

2. **Database errors**
   ```bash
   # Check database file permissions
   ls -la /var/www/mgnrega-tracker/data/
   # Recreate database if needed
   rm /var/www/mgnrega-tracker/data/mgnrega.db
   pm2 restart mgnrega-tracker
   ```

3. **Nginx 502 errors**
   ```bash
   # Check if Node.js is running
   pm2 status
   # Check Nginx error logs
   sudo tail -f /var/log/nginx/error.log
   ```

### Performance Issues
- Monitor PM2 dashboard: `pm2 monit`
- Check Nginx access logs for slow requests
- Monitor database size and query performance

## Scaling Considerations

### Horizontal Scaling
- Use load balancer (HAProxy or Nginx)
- Multiple PM2 instances
- Database replication (PostgreSQL migration)

### Vertical Scaling
- Increase server resources
- Optimize database queries
- Implement Redis for caching

## Support and Maintenance

### Regular Tasks
- Monitor application logs
- Check SSL certificate expiration
- Update dependencies monthly
- Backup database weekly
- Monitor server resources

### Updates
```bash
# Update application
cd /var/www/mgnrega-tracker
git pull origin main
npm install
cd client && npm install && npm run build && cd ..
pm2 restart mgnrega-tracker
```

## Contact Information

**Developer**: Vijay Bontha  
**Project**: MGNREGA District Tracker  
**State**: Andhra Pradesh  
**Purpose**: Student Project - Government Data Accessibility

---

*This application is designed to make government data accessible to rural citizens with low literacy levels, promoting transparency and citizen engagement in the MGNREGA program.*
