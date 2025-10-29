import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { BarChart3, Download, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area, Legend } from 'recharts';
import moment from 'moment';
import { BorderBeam } from '../ui/border-beam';
import { Footer } from '../Footer';

// Custom hook for responsive chart height with debouncing
const useChartHeight = () => {
  const [height, setHeight] = useState(400);
  
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const updateHeight = () => {
      // Clear previous timeout
      clearTimeout(timeoutId);
      
      // Debounce the resize event
      timeoutId = setTimeout(() => {
        const width = window.innerWidth;
        let newHeight = 400;
        
        // Mobile-first responsive heights
        if (width < 480) newHeight = 300; // Very small mobile
        else if (width < 640) newHeight = 350; // Small mobile
        else if (width < 768) newHeight = 380; // Tablet portrait
        else if (width >= 2560) newHeight = 600;
        else if (width >= 1920) newHeight = 500;
        else if (width >= 1400) newHeight = 450;
        else newHeight = 400;
        
        // Only update if height actually changed to prevent unnecessary re-renders
        setHeight(prevHeight => prevHeight !== newHeight ? newHeight : prevHeight);
      }, 150); // 150ms debounce
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight, { passive: true });
    return () => {
      window.removeEventListener('resize', updateHeight);
      clearTimeout(timeoutId);
    };
  }, []);
  
  return height;
};

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

export const HistoricalPerformanceSection: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historicalMetric, setHistoricalMetric] = useState<'all' | 'total_households' | 'total_person_days' | 'total_amount_spent'>('all');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line');
  const [showTrendAnalysis, setShowTrendAnalysis] = useState(false);
  const [showMetricSelector, setShowMetricSelector] = useState(false);
  const [showChartTypeSelector, setShowChartTypeSelector] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const chartHeight = useChartHeight();

  const fetchDistricts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/districts`);
      setDistricts(response.data);
    } catch (err) {
      setError('Failed to load districts');
    }
  };

  const fetchHistoricalData = async (districtCode: string) => {
    // Preserve scroll position before loading
    setScrollPosition(window.pageYOffset);
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/district/${districtCode}/history?months=12`);
      
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid data format received');
      }
      
      // Sort data chronologically (oldest to newest) for proper trend visualization
      const sortedData = response.data.sort((a: any, b: any) => {
        return moment(a.month_year, 'YYYY-MM').valueOf() - moment(b.month_year, 'YYYY-MM').valueOf();
      });
      
      // Process data to handle missing values and ensure data integrity
      const processedData = processHistoricalData(sortedData);
      
      if (processedData.length === 0) {
        setError('No historical data available for this district');
      } else {
        setHistoricalData(processedData);
      }
    } catch (err: any) {
      console.error('Error fetching historical data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch historical data');
    } finally {
      setLoading(false);
      // Restore scroll position after loading
      setTimeout(() => {
        window.scrollTo(0, scrollPosition);
      }, 100);
    }
  };

  useEffect(() => {
    fetchDistricts();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.month-selector-container')) {
        setShowMetricSelector(false);
        setShowChartTypeSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleDistrictSelect = (district: District) => {
    setSelectedDistrict(district);
    fetchHistoricalData(district.district_code);
  };

  const handleMetricChange = (metricValue: string) => {
    setHistoricalMetric(metricValue as any);
    setShowMetricSelector(false);
  };

  const handleChartTypeChange = (chartTypeValue: string) => {
    setChartType(chartTypeValue as any);
    setShowChartTypeSelector(false);
  };

  const formatNumber = (num: number) => {
    // Handle null, undefined, or invalid numbers
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
    // Handle null, undefined, or invalid numbers
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

  // Process historical data to handle missing values and ensure data integrity
  const processHistoricalData = (data: any[]) => {
    return data.map(item => ({
      ...item,
      total_households: Number(item.total_households) || 0,
      total_person_days: Number(item.total_person_days) || 0,
      total_amount_spent: Number(item.total_amount_spent) || 0,
      avg_days_per_household: Number(item.avg_days_per_household) || 0,
      avg_amount_per_household: Number(item.avg_amount_per_household) || 0,
      // Ensure month_year is properly formatted
      month_year: item.month_year || moment().format('YYYY-MM')
    }));
  };

  // Memoize processed historical data to prevent unnecessary re-renders
  const processedHistoricalData = useMemo(() => {
    return processHistoricalData(historicalData);
  }, [historicalData]);

  const calculateTrendAnalysis = (data: any[]) => {
    if (data.length < 2) return null;
    
    const latest = data[data.length - 1];
    const previous = data[data.length - 2];
    
    const trends = {
      households: {
        current: latest.total_households || 0,
        previous: previous.total_households || 0,
        change: ((latest.total_households || 0) - (previous.total_households || 0)),
        percentage: previous.total_households ? 
          (((latest.total_households || 0) - (previous.total_households || 0)) / previous.total_households) * 100 : 0
      },
      personDays: {
        current: latest.total_person_days || 0,
        previous: previous.total_person_days || 0,
        change: ((latest.total_person_days || 0) - (previous.total_person_days || 0)),
        percentage: previous.total_person_days ? 
          (((latest.total_person_days || 0) - (previous.total_person_days || 0)) / previous.total_person_days) * 100 : 0
      },
      amountSpent: {
        current: latest.total_amount_spent || 0,
        previous: previous.total_amount_spent || 0,
        change: ((latest.total_amount_spent || 0) - (previous.total_amount_spent || 0)),
        percentage: previous.total_amount_spent ? 
          (((latest.total_amount_spent || 0) - (previous.total_amount_spent || 0)) / previous.total_amount_spent) * 100 : 0
      }
    };
    
    return trends;
  };

  const exportHistoricalData = () => {
    if (processedHistoricalData.length === 0) return;
    
    const csvContent = [
      ['Month/Year', 'Total Households', 'Total Person Days', 'Total Amount Spent', 'Avg Days per Household', 'Avg Amount per Household'],
      ...processedHistoricalData.map(d => [
        d.month_year,
        d.total_households || 0,
        d.total_person_days || 0,
        d.total_amount_spent || 0,
        d.avg_days_per_household || 0,
        d.avg_amount_per_household || 0
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDistrict?.district_name || 'district'}_historical_data.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="historical-section page">
      <div className="container">
        <div className="section-header text-center">
          <h1 className="section-title text-xl md:text-2xl lg:text-3xl font-medium text-gray-800 mb-1">
            <BarChart3 className="section-icon inline-block mr-3" />
            Historical Performance Analysis
          </h1>
        </div>

        {/* Enhanced controls with modern UI */}
        <div className="toolbar glass-card mb-2">
          <div className="historical-controls flex flex-wrap gap-6 justify-center items-center p-4">
            <div className="control-group flex flex-col items-center">
              <label className="text-sm font-medium text-gray-700 mb-2">Metric</label>
              <div className="month-selector-container">
                <button 
                  className="month-selector-btn"
                  onClick={() => {
                    setShowMetricSelector(!showMetricSelector);
                    setShowChartTypeSelector(false); // Close other dropdown
                  }}
                >
                  {historicalMetric === 'all' ? 'All Metrics' : 
                   historicalMetric === 'total_households' ? 'Households' : 
                   historicalMetric === 'total_person_days' ? 'Person Days' : 
                   'Amount Spent'}
                  {showMetricSelector ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showMetricSelector && (
                  <div className="month-dropdown">
                    <button
                      className={`month-option ${historicalMetric === 'all' ? 'selected' : ''}`}
                      onClick={() => handleMetricChange('all')}
                    >
                      All Metrics
                    </button>
                    <button
                      className={`month-option ${historicalMetric === 'total_households' ? 'selected' : ''}`}
                      onClick={() => handleMetricChange('total_households')}
                    >
                      Households
                    </button>
                    <button
                      className={`month-option ${historicalMetric === 'total_person_days' ? 'selected' : ''}`}
                      onClick={() => handleMetricChange('total_person_days')}
                    >
                      Person Days
                    </button>
                    <button
                      className={`month-option ${historicalMetric === 'total_amount_spent' ? 'selected' : ''}`}
                      onClick={() => handleMetricChange('total_amount_spent')}
                    >
                      Amount Spent
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="control-group flex flex-col items-center">
              <label className="text-sm font-medium text-gray-700 mb-2">Chart Type</label>
              <div className="month-selector-container">
                <button 
                  className="month-selector-btn"
                  onClick={() => {
                    setShowChartTypeSelector(!showChartTypeSelector);
                    setShowMetricSelector(false); // Close other dropdown
                  }}
                >
                  {chartType === 'line' ? 'Line Chart' : 
                   chartType === 'bar' ? 'Bar Chart' : 
                   'Area Chart'}
                  {showChartTypeSelector ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showChartTypeSelector && (
                  <div className="month-dropdown">
                    <button
                      className={`month-option ${chartType === 'line' ? 'selected' : ''}`}
                      onClick={() => handleChartTypeChange('line')}
                    >
                      Line Chart
                    </button>
                    <button
                      className={`month-option ${chartType === 'bar' ? 'selected' : ''}`}
                      onClick={() => handleChartTypeChange('bar')}
                    >
                      Bar Chart
                    </button>
                    <button
                      className={`month-option ${chartType === 'area' ? 'selected' : ''}`}
                      onClick={() => handleChartTypeChange('area')}
                    >
                      Area Chart
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="district-selector glass-card" style={{padding:'1rem'}}>
          <h2>Select District for Historical Analysis</h2>
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
            <p>Loading historical data...</p>
          </div>
        )}

        {error && (
          <div className="error">
            <p>{error}</p>
            <button onClick={() => selectedDistrict && fetchHistoricalData(selectedDistrict.district_code)}>
              Try Again
            </button>
          </div>
        )}

        {processedHistoricalData.length > 0 && selectedDistrict && (
          <div className="historical-charts">
            <div className="historical-header">
              <h3>Historical Performance Trends - {selectedDistrict.district_name}</h3>
              <div className="historical-controls">
                <div className="control-group">
                  <button 
                    className={`action-btn ${showTrendAnalysis ? 'active' : ''}`}
                    onClick={() => setShowTrendAnalysis(!showTrendAnalysis)}
                    title={showTrendAnalysis ? 'Hide trend analysis' : 'Show trend analysis'}
                  >
                    <TrendingUp size={16} />
                    <span>{showTrendAnalysis ? 'Hide' : 'Show'} Trend Analysis</span>
                  </button>
                  <button 
                    className="action-btn export"
                    onClick={exportHistoricalData}
                    title="Export historical data as CSV"
                    disabled={processedHistoricalData.length === 0}
                  >
                    <Download size={16} />
                    <span>Export Data</span>
                  </button>
                </div>
              </div>
            </div>

            {showTrendAnalysis && calculateTrendAnalysis(processedHistoricalData) && (
              <div className="trend-analysis">
                <h4>Month-over-Month Analysis</h4>
                <div className="trend-cards">
                  <div className="trend-card">
                    <div className="trend-title">Households</div>
                    <div className="trend-value">
                      {formatNumber(calculateTrendAnalysis(processedHistoricalData)!.households.current)}
                      <span className={`trend-change ${calculateTrendAnalysis(processedHistoricalData)!.households.change >= 0 ? 'positive' : 'negative'}`}>
                        {calculateTrendAnalysis(processedHistoricalData)!.households.change >= 0 ? '↗' : '↘'} 
                        {Math.abs(calculateTrendAnalysis(processedHistoricalData)!.households.percentage).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="trend-card">
                    <div className="trend-title">Person Days</div>
                    <div className="trend-value">
                      {formatNumber(calculateTrendAnalysis(processedHistoricalData)!.personDays.current)}
                      <span className={`trend-change ${calculateTrendAnalysis(processedHistoricalData)!.personDays.change >= 0 ? 'positive' : 'negative'}`}>
                        {calculateTrendAnalysis(processedHistoricalData)!.personDays.change >= 0 ? '↗' : '↘'} 
                        {Math.abs(calculateTrendAnalysis(processedHistoricalData)!.personDays.percentage).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="trend-card">
                    <div className="trend-title">Amount Spent</div>
                    <div className="trend-value">
                      {formatCurrency(calculateTrendAnalysis(processedHistoricalData)!.amountSpent.current)}
                      <span className={`trend-change ${calculateTrendAnalysis(processedHistoricalData)!.amountSpent.change >= 0 ? 'positive' : 'negative'}`}>
                        {calculateTrendAnalysis(processedHistoricalData)!.amountSpent.change >= 0 ? '↗' : '↘'} 
                        {Math.abs(calculateTrendAnalysis(processedHistoricalData)!.amountSpent.percentage).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="chart-container relative">
              <ResponsiveContainer width="100%" height={chartHeight}>
                {chartType === 'line' && (
                <LineChart 
                  data={processedHistoricalData}
                  style={{ willChange: 'transform' }}
                  margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month_year" 
                    tick={{ fontSize: window.innerWidth < 768 ? 10 : 12 }}
                    angle={window.innerWidth < 768 ? -60 : -45}
                    textAnchor="end"
                    height={window.innerWidth < 768 ? 80 : 60}
                    interval={window.innerWidth < 480 ? "preserveStartEnd" : 0}
                  />
                  <YAxis 
                    tick={{ fontSize: window.innerWidth < 768 ? 10 : 12 }}
                    width={window.innerWidth < 768 ? 50 : 60}
                  />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'total_households' ? formatNumber(Number(value)) : 
                      name === 'total_person_days' ? formatNumber(Number(value)) :
                      name === 'total_amount_spent' ? formatCurrency(Number(value)) : value,
                      name === 'total_households' ? 'Households' :
                      name === 'total_person_days' ? 'Person Days' :
                      name === 'total_amount_spent' ? 'Amount Spent' : name
                    ]}
                    labelFormatter={(label) => {
                      const formattedDate = moment(label, 'YYYY-MM').format('MMMM YYYY');
                      return `Period: ${formattedDate}`;
                    }}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      fontSize: window.innerWidth < 768 ? '12px' : '14px',
                      padding: window.innerWidth < 768 ? '8px' : '12px'
                    }}
                  />
                    <Legend 
                      wrapperStyle={{ fontSize: window.innerWidth < 768 ? '11px' : '14px' }}
                      iconSize={window.innerWidth < 768 ? 12 : 14}
                    />
                    {historicalMetric === 'all' && (
                      <>
                  <Line 
                    type="monotone" 
                    dataKey="total_households" 
                    stroke="#10B981" 
                          strokeWidth={3}
                    name="Households"
                          dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total_person_days" 
                    stroke="#3B82F6" 
                          strokeWidth={3}
                          name="Person Days"
                          dot={{ r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="total_amount_spent" 
                          stroke="#F59E0B" 
                          strokeWidth={3}
                          name="Amount Spent"
                          dot={{ r: 4 }}
                        />
                      </>
                    )}
                    {historicalMetric !== 'all' && (
                      <Line 
                        type="monotone" 
                        dataKey={historicalMetric} 
                        stroke={historicalMetric === 'total_households' ? '#10B981' : historicalMetric === 'total_person_days' ? '#3B82F6' : '#F59E0B'} 
                        strokeWidth={3}
                        name={historicalMetric === 'total_households' ? 'Households' : historicalMetric === 'total_person_days' ? 'Person Days' : 'Amount Spent'}
                        dot={{ r: 4 }}
                      />
                    )}
                </LineChart>
              )}

              {chartType === 'bar' && (
                <BarChart 
                  data={processedHistoricalData}
                  style={{ willChange: 'transform' }}
                  margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month_year" 
                    tick={{ fontSize: window.innerWidth < 768 ? 10 : 12 }}
                    angle={window.innerWidth < 768 ? -60 : -45}
                    textAnchor="end"
                    height={window.innerWidth < 768 ? 80 : 60}
                    interval={window.innerWidth < 480 ? "preserveStartEnd" : 0}
                  />
                  <YAxis 
                    tick={{ fontSize: window.innerWidth < 768 ? 10 : 12 }}
                    width={window.innerWidth < 768 ? 50 : 60}
                  />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'total_households' ? formatNumber(Number(value)) : 
                      name === 'total_person_days' ? formatNumber(Number(value)) :
                      name === 'total_amount_spent' ? formatCurrency(Number(value)) : value,
                      name === 'total_households' ? 'Households' :
                      name === 'total_person_days' ? 'Person Days' :
                      name === 'total_amount_spent' ? 'Amount Spent' : name
                    ]}
                    labelFormatter={(label) => {
                      const formattedDate = moment(label, 'YYYY-MM').format('MMMM YYYY');
                      return `Period: ${formattedDate}`;
                    }}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      fontSize: window.innerWidth < 768 ? '12px' : '14px',
                      padding: window.innerWidth < 768 ? '8px' : '12px'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: window.innerWidth < 768 ? '11px' : '14px' }}
                    iconSize={window.innerWidth < 768 ? 12 : 14}
                  />
                  {historicalMetric === 'all' && (
                    <>
                      <Bar dataKey="total_households" fill="#10B981" name="Households" />
                      <Bar dataKey="total_person_days" fill="#3B82F6" name="Person Days" />
                      <Bar dataKey="total_amount_spent" fill="#F59E0B" name="Amount Spent" />
                    </>
                  )}
                  {historicalMetric !== 'all' && (
                    <Bar 
                      dataKey={historicalMetric} 
                      fill={historicalMetric === 'total_households' ? '#10B981' : historicalMetric === 'total_person_days' ? '#3B82F6' : '#F59E0B'} 
                      name={historicalMetric === 'total_households' ? 'Households' : historicalMetric === 'total_person_days' ? 'Person Days' : 'Amount Spent'}
                    />
                  )}
                </BarChart>
              )}

              {chartType === 'area' && (
                <AreaChart 
                  data={processedHistoricalData}
                  style={{ willChange: 'transform' }}
                  margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month_year" 
                    tick={{ fontSize: window.innerWidth < 768 ? 10 : 12 }}
                    angle={window.innerWidth < 768 ? -60 : -45}
                    textAnchor="end"
                    height={window.innerWidth < 768 ? 80 : 60}
                    interval={window.innerWidth < 480 ? "preserveStartEnd" : 0}
                  />
                  <YAxis 
                    tick={{ fontSize: window.innerWidth < 768 ? 10 : 12 }}
                    width={window.innerWidth < 768 ? 50 : 60}
                  />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'total_households' ? formatNumber(Number(value)) : 
                      name === 'total_person_days' ? formatNumber(Number(value)) :
                      name === 'total_amount_spent' ? formatCurrency(Number(value)) : value,
                      name === 'total_households' ? 'Households' :
                      name === 'total_person_days' ? 'Person Days' :
                      name === 'total_amount_spent' ? 'Amount Spent' : name
                    ]}
                    labelFormatter={(label) => {
                      const formattedDate = moment(label, 'YYYY-MM').format('MMMM YYYY');
                      return `Period: ${formattedDate}`;
                    }}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      fontSize: window.innerWidth < 768 ? '12px' : '14px',
                      padding: window.innerWidth < 768 ? '8px' : '12px'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: window.innerWidth < 768 ? '11px' : '14px' }}
                    iconSize={window.innerWidth < 768 ? 12 : 14}
                  />
                  {historicalMetric === 'all' && (
                    <>
                      <Area 
                        type="monotone" 
                        dataKey="total_households" 
                        stackId="1"
                        stroke="#10B981" 
                        fill="#10B981" 
                        fillOpacity={0.6}
                        name="Households"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="total_person_days" 
                        stackId="1"
                        stroke="#3B82F6" 
                        fill="#3B82F6" 
                        fillOpacity={0.6}
                  name="Person Days"
                />
                      <Area 
                        type="monotone" 
                        dataKey="total_amount_spent" 
                        stackId="1"
                        stroke="#F59E0B" 
                        fill="#F59E0B" 
                        fillOpacity={0.6}
                        name="Amount Spent"
                      />
                    </>
                  )}
                  {historicalMetric !== 'all' && (
                    <Area 
                      type="monotone" 
                      dataKey={historicalMetric} 
                      stroke={historicalMetric === 'total_households' ? '#10B981' : historicalMetric === 'total_person_days' ? '#3B82F6' : '#F59E0B'} 
                      fill={historicalMetric === 'total_households' ? '#10B981' : historicalMetric === 'total_person_days' ? '#3B82F6' : '#F59E0B'} 
                      fillOpacity={0.6}
                      name={historicalMetric === 'total_households' ? 'Households' : historicalMetric === 'total_person_days' ? 'Person Days' : 'Amount Spent'}
                    />
                  )}
                </AreaChart>
              )}
            </ResponsiveContainer>
            <BorderBeam 
              size={350} 
              duration={15} 
              delay={2}
              colorFrom="#3B82F6"
              colorTo="#F59E0B"
              borderWidth={2}
            />
          </div>
        </div>
        )}
      </div>
      <Footer />
    </div>
  );
};
