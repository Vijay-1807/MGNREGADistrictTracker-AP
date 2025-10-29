import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { GitCompare, Search, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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

const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000';

export const CompareSection: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [districts, setDistricts] = useState<District[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [comparisonMetric, setComparisonMetric] = useState<'total_households' | 'total_person_days' | 'total_amount_spent'>('total_households');
  const [districtSearch, setDistrictSearch] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(moment().format('YYYY-MM'));
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [showMetricSelector, setShowMetricSelector] = useState(false);
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

  const fetchComparisonData = async (districtCodes: string[]) => {
    // Preserve scroll position before loading
    setScrollPosition(window.pageYOffset);
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/comparison?districts=${districtCodes.join(',')}&month=${selectedMonth}`);
      setComparisonData(response.data);
    } catch (err) {
      setError('Failed to fetch comparison data');
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
        setShowMonthSelector(false);
        setShowMetricSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleDistrictToggle = (districtCode: string) => {
    const newSelected = selectedDistricts.includes(districtCode)
      ? selectedDistricts.filter(code => code !== districtCode)
      : [...selectedDistricts, districtCode];
    
    setSelectedDistricts(newSelected);
    
    if (newSelected.length > 0) {
      setShowComparison(true);
      fetchComparisonData(newSelected);
    } else {
      setShowComparison(false);
      setComparisonData([]);
    }
  };

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

  const handleMonthChange = (monthValue: string) => {
    setSelectedMonth(monthValue);
    setShowMonthSelector(false);
    if (selectedDistricts.length > 0) {
      fetchComparisonData(selectedDistricts);
    }
  };

  const handleMetricChange = (metricValue: string) => {
    setComparisonMetric(metricValue as any);
    setShowMetricSelector(false);
  };

  const formatNumber = (num: number) => {
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

  // Memoize chart data processing to prevent unnecessary re-renders
  const processedChartData = useMemo(() => {
    if (!showComparison || selectedDistricts.length === 0) return [];

    // Create fallback data for selected districts if API data is missing
    const fallbackData = selectedDistricts.map(districtCode => {
      const district = districts.find(d => d.district_code === districtCode);
      return {
        district_code: districtCode,
        district_name: district?.district_name || districtCode,
        total_households: 0,
        total_person_days: 0,
        total_amount_spent: 0
      };
    });

    // Merge API data with fallback data
    const mergedData = fallbackData.map(fallback => {
      const apiData = comparisonData.find(d => d.district_code === fallback.district_code);
      return {
        ...fallback,
        ...apiData,
        total_households: Number(apiData?.total_households || fallback.total_households) || 0,
        total_person_days: Number(apiData?.total_person_days || fallback.total_person_days) || 0,
        total_amount_spent: Number(apiData?.total_amount_spent || fallback.total_amount_spent) || 0
      };
    });

    // Build display values so zero values still render a thin bar for visibility on chart
    const epsilon = 0.00001;
    const displayKey = `${comparisonMetric}_display` as const;
    return mergedData.map((d: any) => ({
      ...d,
      [`${comparisonMetric}_display`]: d[comparisonMetric] === 0 ? epsilon : d[comparisonMetric]
    }));
  }, [showComparison, selectedDistricts, districts, comparisonData, comparisonMetric]);

  return (
    <div className="compare-section page">
      <div className="container">
        <div className="section-header text-center">
          <h1 className="section-title text-xl md:text-2xl lg:text-3xl font-medium text-gray-800 mb-1">
            <GitCompare className="section-icon inline-block mr-3" />
            District Comparison Tool
          </h1>
        </div>

        {/* Enhanced controls with modern UI */}
        <div className="toolbar glass-card mb-2">
          <div className="comparison-controls flex flex-wrap gap-6 justify-center items-center p-4">
            <div className="control-group flex flex-col items-center">
              <label className="text-sm font-medium text-gray-700 mb-2">Select Month</label>
              <div className="month-selector-container">
                <button 
                  className="month-selector-btn"
                  onClick={() => {
                    setShowMonthSelector(!showMonthSelector);
                    setShowMetricSelector(false); // Close other dropdown
                  }}
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
            
            <div className="control-group flex flex-col items-center">
              <label className="text-sm font-medium text-gray-700 mb-2">Comparison Metric</label>
              <div className="month-selector-container">
                <button 
                  className="month-selector-btn"
                  onClick={() => {
                    setShowMetricSelector(!showMetricSelector);
                    setShowMonthSelector(false); // Close other dropdown
                  }}
                >
                  {comparisonMetric === 'total_households' ? 'Total Households' : 
                   comparisonMetric === 'total_person_days' ? 'Total Person Days' : 
                   'Total Amount Spent'}
                  {showMetricSelector ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showMetricSelector && (
                  <div className="month-dropdown">
                    <button
                      className={`month-option ${comparisonMetric === 'total_households' ? 'selected' : ''}`}
                      onClick={() => handleMetricChange('total_households')}
                    >
                      Total Households
                    </button>
                    <button
                      className={`month-option ${comparisonMetric === 'total_person_days' ? 'selected' : ''}`}
                      onClick={() => handleMetricChange('total_person_days')}
                    >
                      Total Person Days
                    </button>
                    <button
                      className={`month-option ${comparisonMetric === 'total_amount_spent' ? 'selected' : ''}`}
                      onClick={() => handleMetricChange('total_amount_spent')}
                    >
                      Total Amount Spent
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="district-search mb-2">
          <div className="search-container flex items-center justify-center mb-2">
            <div className="relative w-full max-w-md">
               <input
                type="text"
                className="search-input w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 shadow-sm hover:shadow-md"
                placeholder="Search districts..."
                value={districtSearch}
                onChange={(e) => setDistrictSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="selected-info text-center">
            <span className="text-sm text-gray-600 font-medium">{selectedDistricts.length}/6 districts selected</span>
            {selectedDistricts.length > 0 && (
              <button 
                className="clear-btn ml-4 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors duration-200 shadow-sm hover:shadow-md"
                onClick={() => {
                  setSelectedDistricts([]);
                  setShowComparison(false);
                  setComparisonData([]);
                }}
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>

        <div className="district-grid glass-card" style={{padding:'1rem'}}>
          {districts
            .filter(d =>
              districtSearch.trim().length === 0 ||
              d.district_name.toLowerCase().includes(districtSearch.toLowerCase())
            )
            .map((district) => (
            <button
              key={district.id}
              className={`district-card ${selectedDistricts.includes(district.district_code) ? 'selected' : ''}`}
              onClick={() => handleDistrictToggle(district.district_code)}
            >
              <div className="district-name">{district.district_name}</div>
              <div className="district-code">{district.district_code}</div>
              {selectedDistricts.includes(district.district_code) && (
                <div className="selected-badge">Selected</div>
              )}
            </button>
          ))}
        </div>

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading comparison data...</p>
          </div>
        )}

        {error && (
          <div className="error">
            <p>{error}</p>
            <button onClick={() => selectedDistricts.length > 0 && fetchComparisonData(selectedDistricts)}>
              Try Again
            </button>
          </div>
        )}

        {showComparison && processedChartData.length > 0 && (
          <div className="comparison-chart relative">
            <div className="chart-header">
              <h3>
                <BarChart3 className="chart-icon" />
                District Comparison - {moment(selectedMonth).format('MMMM YYYY')}
              </h3>
              <p className="chart-subtitle">
                Comparing {comparisonMetric.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} across selected districts
              </p>
            </div>
            
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart 
                data={processedChartData} 
                barCategoryGap={window.innerWidth < 768 ? 10 : 20} 
                margin={{ 
                  top: 10, 
                  right: window.innerWidth < 768 ? 10 : 20, 
                  left: window.innerWidth < 768 ? -10 : 10, 
                  bottom: window.innerWidth < 768 ? 50 : 0 
                }}
                style={{ willChange: 'transform' }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="district_name" 
                  tick={{ fontSize: window.innerWidth < 768 ? 10 : 12 }}
                  angle={window.innerWidth < 768 ? -60 : -45}
                  textAnchor="end"
                  height={window.innerWidth < 768 ? 80 : 60}
                  interval={window.innerWidth < 480 ? "preserveStartEnd" : 0}
                />
                <YAxis 
                  tick={{ fontSize: window.innerWidth < 768 ? 10 : 12 }}
                  width={window.innerWidth < 768 ? 50 : 60}
                  allowDecimals={false} 
                  tickFormatter={(val) => comparisonMetric === 'total_amount_spent' ? formatNumber(Number(val)) : formatNumber(Number(val))} 
                />
                <Tooltip 
                  formatter={(value: any, _name: any, props: any) => {
                    const original = props?.payload?.[comparisonMetric] ?? value;
                    return [
                      comparisonMetric === 'total_amount_spent' ? formatCurrency(Number(original)) : formatNumber(Number(original)),
                      comparisonMetric === 'total_households' ? 'Households' : comparisonMetric === 'total_person_days' ? 'Person Days' : 'Amount Spent'
                    ];
                  }}
                  labelFormatter={(label) => `${label}`}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    fontSize: window.innerWidth < 768 ? '12px' : '14px',
                    padding: window.innerWidth < 768 ? '8px' : '12px'
                  }}
                />
                <Bar 
                  dataKey={`${comparisonMetric}_display`} 
                  fill={comparisonMetric === 'total_households' ? '#10B981' : comparisonMetric === 'total_person_days' ? '#3B82F6' : '#F59E0B'} 
                  maxBarSize={window.innerWidth < 768 ? 35 : 48} 
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
            <BorderBeam 
              size={300} 
              duration={12} 
              delay={0}
              colorFrom="#10B981"
              colorTo="#3B82F6"
            />
          </div>
        )}

        {selectedDistricts.length === 0 && (
          <div className="empty-state">
            <GitCompare className="empty-icon" />
            <h3>No Districts Selected</h3>
            <p>Select districts from the grid above to start comparing their performance metrics.</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};
