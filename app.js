const express = require('express');
const path = require('path');
const os = require('os');
const app = express();

// Simple metrics collection
const metrics = {
  requestCount: 0,
  totalResponseTime: 0,
  errorCount: 0,
  healthChecks: 0,
  startTime: Date.now(),
  instanceRequests: {}
};

// Get instance information
function getInstanceInfo() {
  const hostname = os.hostname();
  const networkInterfaces = os.networkInterfaces();
  let ipAddress = 'localhost';
  
  // Get the first non-loopback IPv4 address
  for (const [name, addrs] of Object.entries(networkInterfaces)) {
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        ipAddress = addr.address;
        break;
      }
    }
    if (ipAddress !== 'localhost') break;
  }
  
  return {
    hostname,
    ipAddress,
    instanceId: `${hostname}-${ipAddress}`,
    podName: process.env.POD_NAME || hostname,
    namespace: process.env.POD_NAMESPACE || 'default'
  };
}

const instanceInfo = getInstanceInfo();

// Request tracking middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    metrics.requestCount++;
    metrics.totalResponseTime += Date.now() - startTime;
    if (res.statusCode >= 400) {
      metrics.errorCount++;
    }
    
    // Track which instance handled the request
    const instanceId = instanceInfo.instanceId;
    if (!metrics.instanceRequests[instanceId]) {
      metrics.instanceRequests[instanceId] = 0;
    }
    metrics.instanceRequests[instanceId]++;
  });
  
  next();
});

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Application info
const appInfo = {
  name: 'GCP Compare Project',
  version: '1.0.0',
  platform: process.env.PLATFORM || 'unknown',
  environment: process.env.NODE_ENV || 'development',
  deployment: process.env.DEPLOYMENT_TYPE || 'unknown'
};

// Endpoints

// Health check
app.get('/health', (req, res) => {
  metrics.healthChecks++;
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Prometheus metrics endpoint
app.get('/metrics', (req, res) => {
  const uptime = (Date.now() - metrics.startTime) / 1000;
  const avgResponseTime = metrics.requestCount > 0 
    ? metrics.totalResponseTime / metrics.requestCount 
    : 0;
  const memory = process.memoryUsage();
  const cpus = os.cpus().length;

  // Generate Prometheus format metrics
  const prometheusMetrics = `# HELP app_info Application information
# TYPE app_info gauge
app_info{platform="${appInfo.platform}",deployment="${appInfo.deployment}"} 1

# HELP app_requests_total Total requests
# TYPE app_requests_total counter
app_requests_total ${metrics.requestCount}

# HELP app_errors_total Total errors
# TYPE app_errors_total counter
app_errors_total ${metrics.errorCount}

# HELP app_response_time_ms Average response time
# TYPE app_response_time_ms gauge
app_response_time_ms ${avgResponseTime.toFixed(2)}

# HELP app_uptime_seconds Application uptime
# TYPE app_uptime_seconds gauge
app_uptime_seconds ${uptime.toFixed(2)}

# HELP process_uptime_seconds Process uptime
# TYPE process_uptime_seconds gauge
process_uptime_seconds ${process.uptime()}

# HELP memory_heap_used_bytes Heap memory used
# TYPE memory_heap_used_bytes gauge
memory_heap_used_bytes ${memory.heapUsed}

# HELP memory_heap_total_bytes Heap memory total
# TYPE memory_heap_total_bytes gauge
memory_heap_total_bytes ${memory.heapTotal}

# HELP memory_rss_bytes RSS memory
# TYPE memory_rss_bytes gauge
memory_rss_bytes ${memory.rss}

# HELP cpu_cores Available CPU cores
# TYPE cpu_cores gauge
cpu_cores ${cpus}

# HELP health_checks_total Total health checks
# TYPE health_checks_total counter
health_checks_total ${metrics.healthChecks}
`;

  res.set('Content-Type', 'text/plain');
  res.send(prometheusMetrics);
});

// Root endpoint - serves the static index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Instance info endpoint
app.get('/api/instance', (req, res) => {
  res.json({
    instance: instanceInfo,
    metrics: {
      requestsHandled: metrics.requestCount,
      errorsHandled: metrics.errorCount,
      avgResponseTime: metrics.requestCount > 0 
        ? (metrics.totalResponseTime / metrics.requestCount).toFixed(2) 
        : 0
    },
    deployment: {
      platform: appInfo.platform,
      environment: appInfo.environment,
      type: appInfo.deployment
    },
    timestamp: new Date().toISOString()
  });
});

// App info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    ...appInfo,
    instance: instanceInfo,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpus: os.cpus().length
  });
});

// Comparison endpoint
app.get('/api/comparison', (req, res) => {
  res.json({
    comparison: {
      "Google App Engine": {
        "Fully Managed": true,
        "Serverless": true,
        "Auto-scaling": true,
        "Custom Runtime": false,
        "Container Support": true,
        "Stateful Apps": false,
        "Cost Effective": true,
        "Low Operations": true,
        "Multi-region": false,
        "HIPAA Compliant": true,
        "PCI-DSS Compliant": true,
        "SOC 2 Compliant": true,
        "Easy Deployment": true,
        "Version Control": true,
        "Traffic Splitting": true
      },
      "Google Kubernetes Engine": {
        "Fully Managed": true,
        "Serverless": false,
        "Auto-scaling": true,
        "Custom Runtime": true,
        "Container Support": true,
        "Stateful Apps": true,
        "Cost Effective": false,
        "Low Operations": false,
        "Multi-region": true,
        "HIPAA Compliant": true,
        "PCI-DSS Compliant": true,
        "SOC 2 Compliant": true,
        "Easy Deployment": false,
        "Version Control": true,
        "Traffic Splitting": true
      }
    }
  });
});

// System metrics endpoint
app.get('/api/metrics', (req, res) => {
  const mem = process.memoryUsage();
  const cpus = os.cpus();
  
  res.json({
    instance: instanceInfo,
    memory: {
      rss: mem.rss,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external
    },
    uptime: process.uptime(),
    cpu: {
      cores: cpus.length,
      model: cpus[0].model
    },
    system: {
      uptime: os.uptime(),
      loadAverage: os.loadavg(),
      platform: os.platform(),
      arch: os.arch()
    },
    node: {
      version: process.version,
      uptime: process.uptime()
    },
    loadDistribution: metrics.instanceRequests,
    totalRequests: metrics.requestCount
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path
  });
});

// Start server
const port = process.env.PORT || 8080;
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`[${new Date().toISOString()}] Server started on port ${port}`);
  console.log(`Platform: ${appInfo.platform}`);
  console.log(`Environment: ${appInfo.environment}`);
  console.log(`Deployment: ${appInfo.deployment}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;
