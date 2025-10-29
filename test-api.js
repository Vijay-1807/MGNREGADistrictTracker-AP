const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

async function testAPI() {
  console.log('🧪 Testing MGNREGA Tracker API...\n');

  try {
    // Test districts endpoint
    console.log('1. Testing districts endpoint...');
    const districtsResponse = await axios.get(`${API_BASE_URL}/api/districts`);
    console.log(`✅ Found ${districtsResponse.data.length} districts`);
    console.log(`   First district: ${districtsResponse.data[0].district_name}\n`);

    // Test performance data endpoint
    console.log('2. Testing performance data endpoint...');
    const performanceResponse = await axios.get(`${API_BASE_URL}/api/district/AP001/performance`);
    console.log(`✅ Performance data for ${performanceResponse.data.district_name}:`);
    console.log(`   Households: ${performanceResponse.data.total_households.toLocaleString()}`);
    console.log(`   Person Days: ${performanceResponse.data.total_person_days.toLocaleString()}`);
    console.log(`   Amount Spent: ₹${performanceResponse.data.total_amount_spent.toLocaleString()}\n`);

    // Test location detection
    console.log('3. Testing location detection...');
    const locationResponse = await axios.post(`${API_BASE_URL}/api/detect-district`, {
      latitude: 16.1667,
      longitude: 81.1333
    });
    console.log(`✅ Detected district: ${locationResponse.data.district_name} (${locationResponse.data.district_code})\n`);

    // Test comparison endpoint
    console.log('4. Testing comparison endpoint...');
    const comparisonResponse = await axios.get(`${API_BASE_URL}/api/comparison?districts=AP001,AP002,AP003`);
    console.log(`✅ Comparison data for ${comparisonResponse.data.length} districts\n`);

    console.log('🎉 All API tests passed successfully!');
    console.log('\n📱 Frontend is ready to be served from: client/build/');
    console.log('🚀 Server is ready for production deployment!');

  } catch (error) {
    console.error('❌ API test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Run tests
testAPI();
