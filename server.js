const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const moment = require('moment');
require('dotenv').config();

const app = express();
// Behind Render's proxy; enables correct client IP detection for rate limiting
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
const READ_ONLY_DB = process.env.READ_ONLY_DB === '1';

// Security and performance middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));

app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database setup
const dbPath = path.join(__dirname, 'data', 'mgnrega.db');
const db = new sqlite3.Database(
  dbPath,
  READ_ONLY_DB ? sqlite3.OPEN_READONLY : (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE)
);

// Initialize database tables (skip when read-only)
if (!READ_ONLY_DB) {
  db.serialize(() => {
    // Districts table
    db.run(`CREATE TABLE IF NOT EXISTS districts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      district_code TEXT UNIQUE,
      district_name TEXT,
      state_name TEXT,
      latitude REAL,
      longitude REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Performance data table
    db.run(`CREATE TABLE IF NOT EXISTS performance_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      district_code TEXT,
      month_year TEXT,
      total_households INTEGER,
      total_person_days INTEGER,
      total_amount_spent REAL,
      avg_days_per_household REAL,
      avg_amount_per_household REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(district_code, month_year)
    )`);

    // API cache table
    db.run(`CREATE TABLE IF NOT EXISTS api_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cache_key TEXT UNIQUE,
      data TEXT,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  });
}

// Andhra Pradesh districts data
const andhraPradeshDistricts = [
  { code: 'AP001', name: 'Anantapur', lat: 14.6819, lng: 77.6006 },
  { code: 'AP002', name: 'Chittoor', lat: 13.2156, lng: 79.1004 },
  { code: 'AP003', name: 'East Godavari', lat: 16.9454, lng: 82.2382 },
  { code: 'AP004', name: 'Guntur', lat: 16.3067, lng: 80.4365 },
  { code: 'AP005', name: 'Krishna', lat: 16.1667, lng: 81.1333 },
  { code: 'AP006', name: 'Kurnool', lat: 15.8300, lng: 78.0500 },
  { code: 'AP007', name: 'Nellore', lat: 14.4415, lng: 79.9864 },
  { code: 'AP008', name: 'Prakasam', lat: 15.5067, lng: 79.3200 },
  { code: 'AP009', name: 'Srikakulam', lat: 18.2989, lng: 83.8975 },
  { code: 'AP010', name: 'Visakhapatnam', lat: 17.6868, lng: 83.2185 },
  { code: 'AP011', name: 'Vizianagaram', lat: 18.1167, lng: 83.4167 },
  { code: 'AP012', name: 'West Godavari', lat: 16.9454, lng: 81.2382 },
  { code: 'AP013', name: 'YSR Kadapa', lat: 14.4667, lng: 78.8167 }
];

// Insert districts if not exists (skip when read-only)
if (!READ_ONLY_DB) {
  db.serialize(() => {
    const stmt = db.prepare(`INSERT OR IGNORE INTO districts 
      (district_code, district_name, state_name, latitude, longitude) 
      VALUES (?, ?, ?, ?, ?)`);
    
    andhraPradeshDistricts.forEach(district => {
      stmt.run(district.code, district.name, 'Andhra Pradesh', district.lat, district.lng);
    });
    stmt.finalize();
  });
}

// API service for data.gov.in
class MGNREGAService {
  constructor() {
    this.baseURL = 'https://api.data.gov.in/resource';
    this.apiKey = process.env.DATA_GOV_API_KEY || '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';
  }

  async fetchDistrictData(districtCode, monthYear) {
    try {
      const cacheKey = `district_${districtCode}_${monthYear}`;
      const cachedData = await this.getCachedData(cacheKey);
      
      if (cachedData) {
        return cachedData;
      }

      // Try to fetch real data from data.gov.in API
      let realData = null;
      try {
        realData = await this.fetchRealAPIData(districtCode, monthYear);
      } catch (apiError) {
        console.warn('API fetch failed, using mock data:', apiError.message);
      }

      // Use real data if available, otherwise fall back to mock data
      const data = realData || this.generateMockData(districtCode, monthYear);
      
      // Cache the data
      await this.setCachedData(cacheKey, data, 6 * 60 * 60 * 1000); // 6 hours
      
      return data;
    } catch (error) {
      console.error('Error fetching district data:', error);
      throw new Error('Failed to fetch district data');
    }
  }

  async fetchRealAPIData(districtCode, monthYear) {
    const apiUrl = 'https://api.data.gov.in/resource/ee03643a-ee4c-48c2-ac30-9f2ff26ab722';
    
    // Parse monthYear to extract year and month
    const [year, month] = monthYear.split('-');
    const finYear = `${year}-${parseInt(year) + 1}`;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[parseInt(month) - 1];
    
    const params = {
      'api-key': this.apiKey,
      'format': 'json',
      'limit': 1000,
      'filters[state_name]': 'ANDHRA PRADESH',
      'filters[fin_year]': finYear,
      'filters[month]': monthName
    };

    console.log(`Fetching real MGNREGA data for ${monthYear} (${finYear}, ${monthName})...`);
    const response = await axios.get(apiUrl, { params });
    
    if (response.data && response.data.records) {
      return this.processAPIData(response.data.records, districtCode, monthYear);
    }
    
    throw new Error('No data received from API');
  }

  processAPIData(records, districtCode, monthYear) {
    // Find records for the specific district with improved matching
    const districtRecords = records.filter(record => {
      const districtName = record.district_name?.toLowerCase();
      const targetDistrict = andhraPradeshDistricts.find(d => d.code === districtCode);
      
      if (!targetDistrict || !districtName) return false;
      
      // Create multiple possible matches for district names
      const possibleNames = [
        targetDistrict.name.toLowerCase(),
        targetDistrict.name.toLowerCase().replace(/\s+/g, ''),
        targetDistrict.name.toLowerCase().replace(/\s+/g, '.')
      ];
      
      // Special cases for known API variations
      if (targetDistrict.code === 'AP013') {
        possibleNames.push('y.s.r', 'ysr', 'kadapa', 'y s r');
      }
      if (targetDistrict.code === 'AP004') {
        possibleNames.push('ntr', 'guntur');
      }
      if (targetDistrict.code === 'AP012') {
        possibleNames.push('west godavari', 'westgodavari');
      }
      if (targetDistrict.code === 'AP003') {
        possibleNames.push('east godavari', 'eastgodavari');
      }
      
      return possibleNames.some(name => districtName.includes(name));
    });

    if (districtRecords.length === 0) {
      // Log available districts for debugging
      const availableDistricts = records.map(r => r.district_name).join(', ');
      console.log(`Available districts in API: ${availableDistricts}`);
      throw new Error(`No data found for district ${districtCode} (${andhraPradeshDistricts.find(d => d.code === districtCode)?.name})`);
    }

    // Use the most recent record for the district
    const latestRecord = districtRecords[0];
    const district = andhraPradeshDistricts.find(d => d.code === districtCode);
    
    // Calculate person days from the API data
    const totalPersonDays = parseInt(latestRecord.Persondays_of_Central_Liability_so_far) || 0;
    const totalHouseholds = parseInt(latestRecord.Total_Households_Worked) || 0;
    const totalAmountSpent = parseFloat(latestRecord.Total_Exp) || 0;
    
    return {
      district_code: districtCode,
      district_name: district?.name || latestRecord.district_name || 'Unknown',
      month_year: monthYear,
      total_households: totalHouseholds,
      total_person_days: totalPersonDays,
      total_amount_spent: totalAmountSpent,
      avg_days_per_household: parseFloat(latestRecord.Average_days_of_employment_provided_per_Household) || 0,
      avg_amount_per_household: totalHouseholds > 0 ? 
        Math.round((totalAmountSpent / totalHouseholds) * 100) / 100 : 0,
      performance_score: this.calculatePerformanceScore({
        total_households: totalHouseholds,
        total_person_days: totalPersonDays,
        total_amount_spent: totalAmountSpent,
        avg_days: parseFloat(latestRecord.Average_days_of_employment_provided_per_Household) || 0,
        wage_rate: parseFloat(latestRecord.Average_Wage_rate_per_day_per_person) || 0,
        women_persondays: parseInt(latestRecord.Women_Persondays) || 0,
        sc_persondays: parseInt(latestRecord.SC_persondays) || 0,
        st_persondays: parseInt(latestRecord.ST_persondays) || 0,
        completed_works: parseInt(latestRecord.Number_of_Completed_Works) || 0,
        ongoing_works: parseInt(latestRecord.Number_of_Ongoing_Works) || 0
      }),
      data_source: 'data.gov.in',
      last_updated: new Date().toISOString(),
      // Additional real data fields
      financial_year: latestRecord.fin_year,
      month: latestRecord.month,
      average_wage_rate: parseFloat(latestRecord.Average_Wage_rate_per_day_per_person) || 0,
      women_persondays: parseInt(latestRecord.Women_Persondays) || 0,
      sc_persondays: parseInt(latestRecord.SC_persondays) || 0,
      st_persondays: parseInt(latestRecord.ST_persondays) || 0,
      completed_works: parseInt(latestRecord.Number_of_Completed_Works) || 0,
      ongoing_works: parseInt(latestRecord.Number_of_Ongoing_Works) || 0,
      total_individuals_worked: parseInt(latestRecord.Total_Individuals_Worked) || 0,
      total_job_cards: parseInt(latestRecord.Total_No_of_JobCards_issued) || 0,
      households_100_days: parseInt(latestRecord.Total_No_of_HHs_completed_100_Days_of_Wage_Employment) || 0,
      differently_abled_worked: parseInt(latestRecord.Differently_abled_persons_worked) || 0,
      payment_within_15_days: parseFloat(latestRecord.percentage_payments_gererated_within_15_days) || 0
    };
  }

  calculatePerformanceScore(data) {
    // Calculate performance score based on MGNREGA metrics
    let score = 60; // Base score
    
    // Household coverage score (0-20 points)
    if (data.total_households > 30000) score += 20;
    else if (data.total_households > 20000) score += 15;
    else if (data.total_households > 10000) score += 10;
    else if (data.total_households > 5000) score += 5;
    
    // Person days efficiency (0-20 points)
    const avgDays = data.total_households > 0 ? data.total_person_days / data.total_households : 0;
    if (avgDays > 25) score += 20;
    else if (avgDays > 20) score += 15;
    else if (avgDays > 15) score += 10;
    else if (avgDays > 10) score += 5;
    
    return Math.min(score, 100);
  }

  generateMockData(districtCode, monthYear) {
    const district = andhraPradeshDistricts.find(d => d.code === districtCode);
    
    // Use deterministic seed based on district code and month for consistent mock data
    const seed = districtCode.charCodeAt(2) + monthYear.charCodeAt(5) + monthYear.charCodeAt(6);
    const seededRandom = (min, max) => {
      const x = Math.sin(seed) * 10000;
      return min + Math.floor((x - Math.floor(x)) * (max - min + 1));
    };
    
    const baseHouseholds = seededRandom(15000, 45000);
    const avgDaysPerHousehold = seededRandom(18, 28);
    const totalPersonDays = Math.floor(baseHouseholds * avgDaysPerHousehold);
    const wageRate = seededRandom(200, 250);
    const totalAmount = totalPersonDays * wageRate;
    
    // Convert to crores to match real API data format
    const totalAmountCrores = totalAmount / 10000000;
    
    return {
      district_code: districtCode,
      district_name: district?.name || 'Unknown',
      month_year: monthYear,
      total_households: baseHouseholds,
      total_person_days: totalPersonDays,
      total_amount_spent: totalAmountCrores, // Now in crores like real data
      avg_days_per_household: Math.round(avgDaysPerHousehold * 100) / 100,
      avg_amount_per_household: Math.round((totalAmountCrores / baseHouseholds) * 100) / 100,
      performance_score: seededRandom(75, 95), // More realistic range, closer to real data
      data_source: 'mock_data',
      last_updated: new Date().toISOString(),
      // Additional mock fields for consistency
      financial_year: `${monthYear.split('-')[0]}-${parseInt(monthYear.split('-')[0]) + 1}`,
      month: monthYear.split('-')[1],
      average_wage_rate: wageRate,
      women_persondays: Math.floor(totalPersonDays * 0.4),
      sc_persondays: Math.floor(totalPersonDays * 0.15),
      st_persondays: Math.floor(totalPersonDays * 0.08),
      completed_works: seededRandom(50, 200),
      ongoing_works: seededRandom(100, 300),
      total_individuals_worked: Math.floor(baseHouseholds * 1.2),
      total_job_cards: Math.floor(baseHouseholds * 1.1),
      households_100_days: Math.floor(baseHouseholds * 0.15),
      differently_abled_worked: Math.floor(baseHouseholds * 0.02),
      payment_within_15_days: seededRandom(75, 95)
    };
  }

  async getCachedData(key) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT data FROM api_cache WHERE cache_key = ? AND expires_at > datetime("now")',
        [key],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? JSON.parse(row.data) : null);
        }
      );
    });
  }

  async setCachedData(key, data, ttl) {
    if (READ_ONLY_DB) return; // no-op in read-only mode
    return new Promise((resolve, reject) => {
      const expiresAt = new Date(Date.now() + ttl).toISOString();
      db.run(
        'INSERT OR REPLACE INTO api_cache (cache_key, data, expires_at) VALUES (?, ?, ?)',
        [key, JSON.stringify(data), expiresAt],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async getDataSourceInfo() {
    return {
      name: 'data.gov.in',
      description: 'Official Government Data Portal',
      ministry: 'Ministry of Rural Development',
      department: 'Department of Rural Development',
      last_updated: new Date().toISOString(),
      api_endpoint: 'https://api.data.gov.in/resource/ee03643a-ee4c-48c2-ac30-9f2ff26ab722'
    };
  }

  async getDistrictHistory(districtCode, months = 12) {
    try {
      const history = [];
      const currentDate = moment();
      let apiDataCount = 0;
      let mockDataCount = 0;
      
      for (let i = 0; i < months; i++) {
        const monthYear = currentDate.clone().subtract(i, 'months').format('YYYY-MM');
        
        try {
          const data = await this.fetchDistrictData(districtCode, monthYear);
          if (data) {
            history.push({
              month_year: monthYear,
              total_households: data.total_households,
              total_person_days: data.total_person_days,
              total_amount_spent: data.total_amount_spent,
              avg_days_per_household: data.avg_days_per_household,
              avg_amount_per_household: data.avg_amount_per_household,
              performance_score: data.performance_score,
              data_source: data.data_source || 'api'
            });
            apiDataCount++;
          }
        } catch (error) {
          console.warn(`Failed to fetch API data for ${monthYear}:`, error.message);
          // Generate mock data for missing months to ensure we have complete historical data
          const mockData = this.generateMockData(districtCode, monthYear);
          history.push({
            month_year: monthYear,
            total_households: mockData.total_households,
            total_person_days: mockData.total_person_days,
            total_amount_spent: mockData.total_amount_spent,
            avg_days_per_household: mockData.avg_days_per_household,
            avg_amount_per_household: mockData.avg_amount_per_household,
            performance_score: mockData.performance_score,
            data_source: 'mock'
          });
          mockDataCount++;
        }
      }
      
      console.log(`Historical data for ${districtCode}: ${apiDataCount} API records, ${mockDataCount} mock records`);
      return history.reverse(); // Return in chronological order
    } catch (error) {
      console.error('Error fetching district history:', error);
      throw new Error('Failed to fetch district history');
    }
  }

  async getDistrictComparison(districtCodes, monthYear) {
    try {
      const comparison = [];
      
      for (const code of districtCodes) {
        try {
          const data = await this.fetchDistrictData(code, monthYear);
          if (data) {
            comparison.push({
              district_code: code,
              district_name: data.district_name,
              total_households: data.total_households,
              total_person_days: data.total_person_days,
              total_amount_spent: data.total_amount_spent,
              avg_days_per_household: data.avg_days_per_household,
              performance_score: data.performance_score
            });
          }
        } catch (error) {
          console.warn(`Failed to fetch comparison data for district ${code}:`, error.message);
        }
      }
      
      return comparison;
    } catch (error) {
      console.error('Error fetching district comparison:', error);
      throw new Error('Failed to fetch district comparison');
    }
  }
}

const mgnregaService = new MGNREGAService();

// API Routes
// Block write methods when read-only
if (READ_ONLY_DB) {
  app.use('/api', (req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return res.status(405).json({ error: 'Read-only API' });
    }
    next();
  });
}
app.get('/api/districts', (req, res) => {
  db.all('SELECT * FROM districts ORDER BY district_name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/district/:code/performance', async (req, res) => {
  try {
    const { code } = req.params;
    const { month } = req.query;
    
    const monthYear = month || moment().format('YYYY-MM');
    
    const data = await mgnregaService.fetchDistrictData(code, monthYear);
    
    // Store in database (skip when read-only)
    if (!READ_ONLY_DB) {
      db.run(
        `INSERT OR REPLACE INTO performance_data 
         (district_code, month_year, total_households, total_person_days, 
          total_amount_spent, avg_days_per_household, avg_amount_per_household)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.district_code,
          data.month_year,
          data.total_households,
          data.total_person_days,
          data.total_amount_spent,
          data.avg_days_per_household,
          data.avg_amount_per_household
        ]
      );
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/district/:code/history', async (req, res) => {
  try {
    const { code } = req.params;
    const { months = 12 } = req.query;
    
    // First try to get data from database
    db.all(
      `SELECT * FROM performance_data 
       WHERE district_code = ? 
       ORDER BY month_year DESC 
       LIMIT ?`,
      [code, months],
      async (err, rows) => {
        if (err) {
          console.error('Database error:', err);
          res.status(500).json({ error: 'Database error' });
          return;
        }
        
        // Always try to fetch fresh data to ensure we have complete historical data
        try {
          console.log(`Fetching fresh historical data for district ${code} (${months} months)`);
          const history = await mgnregaService.getDistrictHistory(code, parseInt(months));
          
          // Store the fresh data in database (skip when read-only)
          if (!READ_ONLY_DB && history && history.length > 0) {
            const stmt = db.prepare(`INSERT OR REPLACE INTO performance_data 
              (district_code, month_year, total_households, total_person_days, 
               total_amount_spent, avg_days_per_household, avg_amount_per_household)
              VALUES (?, ?, ?, ?, ?, ?, ?)`);
            
            history.forEach(data => {
              stmt.run(
                data.district_code,
                data.month_year,
                data.total_households,
                data.total_person_days,
                data.total_amount_spent,
                data.avg_days_per_household,
                data.avg_amount_per_household
              );
            });
            stmt.finalize();
          }
          
          res.json(history);
        } catch (apiError) {
          console.error('API error:', apiError);
          // Fallback to database data if available, otherwise return empty array
          res.json(rows || []);
        }
      }
    );
  } catch (error) {
    console.error('Historical data API error:', error);
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
});

app.get('/api/comparison', async (req, res) => {
  try {
    const { districts, month } = req.query;
    
    if (!districts) {
      res.status(400).json({ error: 'Districts parameter required' });
      return;
    }
    
    const districtList = districts.split(',');
    const monthYear = month || moment().format('YYYY-MM');
    
    // Try to get data from database first
    const placeholders = districtList.map(() => '?').join(',');
    
    db.all(
      `SELECT * FROM performance_data 
       WHERE district_code IN (${placeholders}) 
       AND month_year = ?`,
      [...districtList, monthYear],
      async (err, rows) => {
        if (err) {
          console.error('Database error:', err);
          res.status(500).json({ error: 'Database error' });
          return;
        }
        
        // If we have data in database, return it
        if (rows && rows.length > 0) {
          res.json(rows);
          return;
        }
        
        // If no data in database, fetch from API service
        try {
          const comparison = await mgnregaService.getDistrictComparison(districtList, monthYear);
          res.json(comparison);
        } catch (apiError) {
          console.error('API error:', apiError);
          // Fallback to mock data
          const mockData = districtList.map(code => {
            const district = andhraPradeshDistricts.find(d => d.code === code);
            return {
              district_code: code,
              district_name: district?.name || code,
              total_households: Math.floor(Math.random() * 50000) + 10000,
              total_person_days: Math.floor(Math.random() * 1000000) + 200000,
              total_amount_spent: Math.floor(Math.random() * 100000000) + 50000000,
              avg_days_per_household: Math.floor(Math.random() * 20) + 15,
              performance_score: Math.floor(Math.random() * 40) + 60,
              month_year: monthYear
            };
          });
          res.json(mockData);
        }
      }
    );
  } catch (error) {
    console.error('Comparison API error:', error);
    res.status(500).json({ error: 'Failed to fetch comparison data' });
  }
});

// Data source information endpoint
app.get('/api/data-source', (req, res) => {
  res.json({
    source: 'data.gov.in',
    api_endpoint: 'https://api.data.gov.in/resource/ee03643a-ee4c-48c2-ac30-9f2ff26ab722',
    description: 'District-wise MGNREGA Data at a Glance',
    ministry: 'Ministry of Rural Development',
    department: 'Department of Rural Development (DRD)',
    last_updated: new Date().toISOString(),
    features: [
      'Real-time MGNREGA data from Government of India',
      'District-wise performance metrics',
      'Automatic data caching for reliability',
      'Fallback to mock data if API unavailable',
      'Performance scoring based on actual metrics'
    ]
  });
});

// Location-based district detection
app.post('/api/detect-district', (req, res) => {
  const { latitude, longitude } = req.body;
  
  if (!latitude || !longitude) {
    res.status(400).json({ error: 'Latitude and longitude required' });
    return;
  }
  
  // Find nearest district
  let nearestDistrict = null;
  let minDistance = Infinity;
  
  andhraPradeshDistricts.forEach(district => {
    const distance = Math.sqrt(
      Math.pow(district.lat - latitude, 2) + 
      Math.pow(district.lng - longitude, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestDistrict = {
        id: Math.floor(Math.random() * 1000),
        district_code: district.code,
        district_name: district.name,
        state_name: 'Andhra Pradesh',
        latitude: district.lat,
        longitude: district.lng
      };
    }
  });
  
  res.json(nearestDistrict);
});

// Serve static files
app.use(express.static(path.join(__dirname, 'client/build')));

// Catch all handler for React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Scheduled data fetching (skip when read-only)
if (!READ_ONLY_DB) {
  cron.schedule('0 */6 * * *', async () => {
    console.log('Running scheduled data fetch...');
    
    try {
      const currentMonth = moment().format('YYYY-MM');
      
      for (const district of andhraPradeshDistricts) {
        try {
          await mgnregaService.fetchDistrictData(district.code, currentMonth);
          console.log(`Fetched data for ${district.name}`);
        } catch (error) {
          console.error(`Failed to fetch data for ${district.name}:`, error);
        }
      }
    } catch (error) {
      console.error('Scheduled data fetch failed:', error);
    }
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  db.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  db.close();
  process.exit(0);
});
