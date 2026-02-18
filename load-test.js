#!/usr/bin/env node

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');

// Configuration
const defaultConfig = {
  duration: 30,           // Duration in seconds
  rps: 100,              // Requests per second
  timeout: 5000,         // Request timeout
  endpoints: [
    '/health',
    '/api/info',
    '/api/comparison',
    '/api/metrics'
  ]
};

// Parse command line arguments
const args = process.argv.slice(2);
let url = 'http://localhost:8080';
let config = { ...defaultConfig };

if (args.length > 0) {
  url = args[0];
}

args.slice(1).forEach(arg => {
  const [key, value] = arg.split('=');
  if (key === '--duration') config.duration = parseInt(value);
  if (key === '--rps') config.rps = parseInt(value);
  if (key === '--timeout') config.timeout = parseInt(value);
});

// Results tracking
const results = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  errors: {},
  startTime: null,
  endTime: null
};

// Parse URL
function parseUrl(urlString) {
  const parsed = new URL(urlString);
  return {
    protocol: parsed.protocol === 'https:' ? https : http,
    hostname: parsed.hostname,
    port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
    path: parsed.pathname || '/'
  };
}

// Make HTTP request
function makeRequest(endpoint) {
  return new Promise((resolve) => {
    const urlObj = parseUrl(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: endpoint,
      method: 'GET',
      timeout: config.timeout
    };

    const startTime = performance.now();
    
    const req = urlObj.protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        results.responseTime = responseTime;
        results.totalRequests++;
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          results.successfulRequests++;
          results.responseTimes.push(responseTime);
        } else {
          results.failedRequests++;
          results.errors[res.statusCode] = (results.errors[res.statusCode] || 0) + 1;
        }
        
        resolve({ statusCode: res.statusCode, responseTime });
      });
    });

    req.on('error', (error) => {
      results.totalRequests++;
      results.failedRequests++;
      results.errors[error.code] = (results.errors[error.code] || 0) + 1;
      resolve({ error: error.code });
    });

    req.on('timeout', () => {
      results.totalRequests++;
      results.failedRequests++;
      results.errors['TIMEOUT'] = (results.errors['TIMEOUT'] || 0) + 1;
      req.destroy();
      resolve({ error: 'TIMEOUT' });
    });

    req.end();
  });
}

// Run load test
async function runLoadTest() {
  console.log('\n' + '='.repeat(60));
  console.log('🔥 LOAD TEST');
  console.log('='.repeat(60));
  console.log(`URL: ${url}`);
  console.log(`Duration: ${config.duration}s`);
  console.log(`RPS: ${config.rps}`);
  console.log(`Timeout: ${config.timeout}ms`);
  console.log(`Endpoints: ${config.endpoints.join(', ')}`);
  console.log('='.repeat(60) + '\n');

  results.startTime = Date.now();
  const endTime = results.startTime + config.duration * 1000;
  let requestCount = 0;
  let lastDisplayTime = results.startTime;

  const interval = 1000 / config.rps; // Interval between requests in ms

  while (Date.now() < endTime) {
    const endpoint = config.endpoints[Math.floor(Math.random() * config.endpoints.length)];
    makeRequest(endpoint).catch(() => {});
    requestCount++;

    // Display progress every second
    const now = Date.now();
    if (now - lastDisplayTime >= 1000) {
      const elapsed = Math.round((now - results.startTime) / 1000);
      const rate = Math.round(results.totalRequests / elapsed);
      process.stdout.write(`\r⏱️  ${elapsed}s | Requests: ${results.totalRequests} | Rate: ${rate} req/s | Success: ${results.successfulRequests} | Failed: ${results.failedRequests}`);
      lastDisplayTime = now;
    }

    // Wait before next request
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  // Wait for remaining requests to complete
  results.endTime = Date.now();
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Display results
  displayResults();
}

// Display results
function displayResults() {
  const duration = (results.endTime - results.startTime) / 1000;
  const avgResponseTime = results.responseTimes.length > 0 
    ? results.responseTimes.reduce((a, b) => a + b) / results.responseTimes.length 
    : 0;
  
  const sortedTimes = results.responseTimes.sort((a, b) => a - b);
  const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0;
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;

  console.log('\n\n' + '='.repeat(60));
  console.log('📊 RESULTS');
  console.log('='.repeat(60));
  console.log(`Duration: ${duration.toFixed(2)}s`);
  console.log(`Total Requests: ${results.totalRequests}`);
  console.log(`Successful: ${results.successfulRequests} (${((results.successfulRequests / results.totalRequests) * 100).toFixed(2)}%)`);
  console.log(`Failed: ${results.failedRequests} (${((results.failedRequests / results.totalRequests) * 100).toFixed(2)}%)`);
  console.log(`Throughput: ${(results.totalRequests / duration).toFixed(2)} req/s`);
  console.log('');
  console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`Min Response Time: ${(Math.min(...results.responseTimes) || 0).toFixed(2)}ms`);
  console.log(`Max Response Time: ${(Math.max(...results.responseTimes) || 0).toFixed(2)}ms`);
  console.log(`P50 (Median): ${p50.toFixed(2)}ms`);
  console.log(`P95: ${p95.toFixed(2)}ms`);
  console.log(`P99: ${p99.toFixed(2)}ms`);

  if (Object.keys(results.errors).length > 0) {
    console.log('');
    console.log('Errors:');
    Object.entries(results.errors).forEach(([code, count]) => {
      console.log(`  ${code}: ${count}`);
    });
  }

  console.log('='.repeat(60) + '\n');
}

// Run the test
runLoadTest().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
