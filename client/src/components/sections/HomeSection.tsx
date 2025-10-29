import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { MapPin, Users, Calendar, DollarSign, TrendingUp, Globe, Languages, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import moment from 'moment';

interface District {
  id: number;
  district_code: string;
  district_name: string;
  state_name: string;
  latitude: number;
  longitude: number;
}

interface PerformanceData {
  district_code: string;
  district_name: string;
  month_year: string;
  total_households: number;
  total_person_days: number;
  total_amount_spent: number;
  avg_days_per_household: number;
  avg_amount_per_household: number;
  performance_score?: number;
}

const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000';

export const HomeSection: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(moment().format('YYYY-MM'));
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [dataSource, setDataSource] = useState<any>(null);

  const fetchDistricts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/districts`);
      setDistricts(response.data);
    } catch (err) {
      setError('Failed to load districts');
    }
  };

  const fetchDataSource = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/data-source`);
      setDataSource(response.data);
    } catch (err) {
      console.warn('Failed to fetch data source info');
    }
  };

  const fetchPerformanceData = useCallback(async (districtCode: string, monthYear?: string) => {
    setLoading(true);
    setError(null);
    try {
      const month = monthYear || selectedMonth;
      const response = await axios.get(`${API_BASE_URL}/api/district/${districtCode}/performance?month=${month}`);
      setPerformanceData(response.data);
    } catch (err) {
      setError('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  const generateMonthOptions = () => {
    const options = [];
    const currentDate = moment();
    
    // Generate last 24 months
    for (let i = 0; i < 24; i++) {
      const date = currentDate.clone().subtract(i, 'months');
      options.push({
        value: date.format('YYYY-MM'),
        label: date.format('MMMM YYYY'),
        telugu: date.format('MMMM YYYY') // You can add Telugu month names here
      });
    }
    return options;
  };

  const detectLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await axios.post(`${API_BASE_URL}/api/detect-district`, {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
            if (response.data) {
              setSelectedDistrict(response.data);
              fetchPerformanceData(response.data.district_code);
            }
            setLocationPermission(true);
          } catch (err) {
            setLocationPermission(false);
          }
        },
        () => {
          setLocationPermission(false);
        }
      );
    } else {
      setLocationPermission(false);
    }
  }, [fetchPerformanceData]);

  useEffect(() => {
    fetchDistricts();
    detectLocation();
    fetchDataSource();
  }, [detectLocation]);

  const handleMonthChange = (monthValue: string) => {
    setSelectedMonth(monthValue);
    setShowMonthSelector(false);
    if (selectedDistrict) {
      fetchPerformanceData(selectedDistrict.district_code, monthValue);
    }
  };

  const handleDistrictSelect = (district: District) => {
    setSelectedDistrict(district);
    fetchPerformanceData(district.district_code);
  };

  const formatNumber = (num: number) => {
    if (num === null || num === undefined || isNaN(num)) {
      return '0';
    }
    
    if (num >= 10000000) {
      return (num / 10000000).toFixed(1) + ' Cr';
    } else if (num >= 100000) {
      return (num / 100000).toFixed(1) + ' L';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + ' K';
    }
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '₹0';
    }
    
    // Handle amounts that are already in crores (from real API data)
    if (amount < 1000000 && amount > 100) {
      return '₹' + amount.toFixed(1) + ' Cr';
    }
    
    // Handle amounts in full format (from mock data)
    if (amount >= 10000000) {
      return '₹' + (amount / 10000000).toFixed(1) + ' Cr';
    } else if (amount >= 100000) {
      return '₹' + (amount / 100000).toFixed(1) + ' L';
    } else if (amount >= 1000) {
      return '₹' + (amount / 1000).toFixed(1) + ' K';
    }
    return '₹' + amount.toString();
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return '#10B981'; // Green
    if (score >= 60) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };

  return (
    <div className="home-section page">
      <header className="header">
        <div className="container">
          <div className="header-content">
            <div className="header-text">
              <h1 className="title">
                <img
                  className="title-icon"
                  src={`${process.env.PUBLIC_URL}/android-chrome-192x192.png`}
                  alt="App logo"
                />
                {t('title')}
              </h1>
              <p className="subtitle">{t('subtitle')}</p>
            </div>
            <div className="language-toggle">
              <button 
                className={`lang-btn ${language === 'en' ? 'active' : ''}`}
                onClick={() => setLanguage('en')}
              >
                English
              </button>
              <button 
                className={`lang-btn ${language === 'te' ? 'active' : ''}`}
                onClick={() => setLanguage('te')}
              >
                తెలుగు
              </button>
              <Languages className="lang-icon" />
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          {locationPermission === null && (
            <div className="location-prompt">
              <MapPin className="location-icon" />
              <p>{t('detectingLocation')}</p>
            </div>
          )}

          {locationPermission === false && (
            <div className="location-fallback">
              <MapPin className="location-icon" />
              <p>{t('selectDistrictManually')}</p>
            </div>
          )}

          <div className="district-selector">
            <h2>{t('selectDistrict')}</h2>
            <div className="district-grid">
              {districts.map((district) => (
                <button
                  key={district.id}
                  className={`district-card ${selectedDistrict?.district_code === district.district_code ? 'selected' : ''}`}
                  onClick={() => handleDistrictSelect(district)}
                >
                  <div className="district-name">{district.district_name}</div>
                  <div className="district-code">{district.district_code}</div>
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="loading">
              <div className="spinner"></div>
              <p>{t('loadingPerformanceData')}</p>
            </div>
          )}

          {error && (
            <div className="error">
              <p>{error}</p>
              <button onClick={() => selectedDistrict && fetchPerformanceData(selectedDistrict.district_code)}>
                {t('tryAgain')}
              </button>
            </div>
          )}

          {performanceData && (
            <div className="performance-dashboard">
              <div className="dashboard-header">
                <h2>{performanceData.district_name} District Performance</h2>
                <div className="month-selector-container">
                  <button 
                    className="month-selector-btn"
                    onClick={() => setShowMonthSelector(!showMonthSelector)}
                  >
                    {moment(selectedMonth).format('MMMM YYYY')}
                    {showMonthSelector ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {showMonthSelector && (
                    <div className="month-dropdown">
                      {generateMonthOptions().map(option => (
                        <button
                          key={option.value}
                          className={`month-option ${selectedMonth === option.value ? 'selected' : ''}`}
                          onClick={() => handleMonthChange(option.value)}
                        >
                          {language === 'te' ? option.telugu : option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-icon">
                    <Users />
                  </div>
                  <div className="metric-content">
                    <div className="metric-value">{formatNumber(performanceData.total_households)}</div>
                    <div className="metric-label">{t('totalHouseholds')}</div>
                    <div className="metric-description">{t('familiesBenefited')}</div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon">
                    <Calendar />
                  </div>
                  <div className="metric-content">
                    <div className="metric-value">{formatNumber(performanceData.total_person_days)}</div>
                    <div className="metric-label">{t('personDays')}</div>
                    <div className="metric-description">{t('workDaysCreated')}</div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon">
                    <DollarSign />
                  </div>
                  <div className="metric-content">
                    <div className="metric-value">{formatCurrency(performanceData.total_amount_spent)}</div>
                    <div className="metric-label">{t('amountSpent')}</div>
                    <div className="metric-description">{t('totalExpenditure')}</div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon">
                    <TrendingUp />
                  </div>
                  <div className="metric-content">
                    <div className="metric-value">{performanceData.avg_days_per_household}</div>
                    <div className="metric-label">{t('avgDaysPerHousehold')}</div>
                    <div className="metric-description">{t('workDaysPerFamily')}</div>
                  </div>
                </div>
              </div>

              <div className="performance-summary">
                <h3>{t('performanceSummary')}</h3>
                <div className="summary-cards">
                  <div className="summary-card">
                    <div className="summary-title">{t('avgAmountPerHousehold')}</div>
                    <div className="summary-value">{formatCurrency(performanceData.avg_amount_per_household)}</div>
                  </div>
                  
                  <div className="summary-card">
                    <div className="summary-title">{t('performanceScore')}</div>
                    <div 
                      className="summary-value performance-score"
                      style={{ color: getPerformanceColor(performanceData.performance_score || 75) }}
                    >
                      {performanceData.performance_score || 75}/100
                    </div>
                  </div>
                </div>
              </div>

              {dataSource && (
                <div className="data-source-info">
                  <h3>{t('dataSource')}</h3>
                  <div className="source-card">
                    <div className="source-header">
                      <span className="source-name">{dataSource.source}</span>
                      <span className="source-badge">{t('officialGovernmentData')}</span>
                    </div>
                    <div className="source-details">
                      <p><strong>{t('ministry')}:</strong> {dataSource.ministry}</p>
                      <p><strong>{t('department')}:</strong> {dataSource.department}</p>
                      <p><strong>{t('description')}:</strong> {dataSource.description}</p>
                      <p><strong>{t('lastUpdated')}:</strong> {new Date(dataSource.last_updated).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
