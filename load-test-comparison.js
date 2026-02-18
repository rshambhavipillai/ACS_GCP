#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Configuration - Test multiple instances
const testConfigs = [
  {
    name: 'GAE (Local)',
    url: 'http://localhost:8080',
    duration: 30,
    rps: 50
  },
  {
    name: 'GKE (Local)',
    url: 'http://localhost:8081',
    duration: 30,
    rps: 50
  }
];

// Optional: Add cloud URL test if available
const cloudUrl = 'https://acs-stuttgart-2026-semester.ey.r.appspot.com';
testConfigs.push({
  name: 'Cloud (GAE)',
  url: cloudUrl,
  duration: 30,
  rps: 50
});

let currentTestIndex = 0;
const allResults = [];

function runTest(config) {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Starting: ${config.name}`);
    console.log(`URL: ${config.url}`);
    console.log('='.repeat(60) + '\n');

    const loadTestPath = path.join(__dirname, 'load-test.js');
    const args = [
      loadTestPath,
      config.url,
      `--duration=${config.duration}`,
      `--rps=${config.rps}`
    ];

    const process = spawn('node', args, {
      cwd: __dirname,
      stdio: 'inherit'
    });

    process.on('close', (code) => {
      allResults.push({
        name: config.name,
        url: config.url,
        status: code === 0 ? 'PASSED' : 'FAILED'
      });
      resolve();
    });

    process.on('error', (error) => {
      console.error(`Error running test: ${error.message}`);
      allResults.push({
        name: config.name,
        url: config.url,
        status: 'ERROR'
      });
      resolve();
    });
  });
}

async function runAllTests() {
  console.log('\n' + '🔥'.repeat(30));
  console.log('LOAD TEST COMPARISON: GAE vs GKE vs Cloud');
  console.log('🔥'.repeat(30));

  for (const config of testConfigs) {
    try {
      await runTest(config);
    } catch (error) {
      console.error(`Failed to run test for ${config.name}: ${error.message}`);
      allResults.push({
        name: config.name,
        url: config.url,
        status: 'ERROR'
      });
    }
  }

  // Display summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(60));
  allResults.forEach((result, index) => {
    const icon = result.status === 'PASSED' ? '✅' : result.status === 'FAILED' ? '❌' : '⚠️';
    console.log(`${index + 1}. ${result.name} - ${icon} ${result.status}`);
  });
  console.log('='.repeat(60) + '\n');
}

runAllTests().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
