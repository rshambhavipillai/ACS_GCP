// ===========================
// Utility Functions
// ===========================

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatTime(seconds) {
  if (seconds < 60) return Math.round(seconds) + 's';
  if (seconds < 3600) return Math.round(seconds / 60) + 'm';
  if (seconds < 86400) return Math.round(seconds / 3600) + 'h';
  return Math.round(seconds / 86400) + 'd';
}

function formatJSON(obj) {
  return JSON.stringify(obj, null, 2);
}

// ===========================
// API Calls
// ===========================

async function fetchAppInfo() {
  try {
    const response = await fetch('/api/info');
    const data = await response.json();

    // Update app info section
    document.getElementById('platform').textContent = data.platform || 'Unknown';
    document.getElementById('environment').textContent = data.environment || 'Unknown';
    document.getElementById('deployment').textContent = data.deployment || 'Unknown';
    document.getElementById('hostname').textContent = data.hostname || 'Unknown';
    document.getElementById('cpus').textContent = data.cpus || 'Unknown';
    document.getElementById('timestamp').textContent = new Date(data.timestamp).toLocaleString();

    // Update metrics
    updateMetrics(data.memory);
    updateUptime(data.uptime);
  } catch (error) {
    console.error('Error fetching app info:', error);
  }
}

async function fetchComparison() {
  try {
    const response = await fetch('/api/comparison');
    const data = await response.json();

    const container = document.getElementById('comparison-rows');
    container.innerHTML = '';

    if (data.comparison) {
      const features = data.comparison['Google App Engine'] || {};
      
      Object.keys(features).forEach(feature => {
        const gaeValue = features[feature];
        const gkeValue = data.comparison['Google Kubernetes Engine'][feature] || 'N/A';

        const row = document.createElement('div');
        row.className = 'comparison-row';

        const gkeCheck = gkeValue === true || gkeValue === 'Yes' ? '✓' : '✕';
        const gaeCheck = gaeValue === true || gaeValue === 'Yes' ? '✓' : '✕';
        const gkeClass = gkeValue === true || gkeValue === 'Yes' ? 'feature-checkmark' : 'feature-cross';
        const gaeClass = gaeValue === true || gaeValue === 'Yes' ? 'feature-checkmark' : 'feature-cross';

        row.innerHTML = `
          <div class="feature-name">${feature}</div>
          <div class="feature-value"><span class="${gkeClass}">${gkeCheck}</span></div>
          <div class="feature-value"><span class="${gaeClass}">${gaeCheck}</span></div>
        `;

        container.appendChild(row);
      });
    }
  } catch (error) {
    console.error('Error fetching comparison:', error);
  }
}

async function fetchMetrics() {
  try {
    const response = await fetch('/api/metrics');
    const data = await response.json();

    if (data.memory) {
      updateMetrics(data.memory);
    }
    if (data.uptime) {
      updateUptime(data.uptime);
    }
  } catch (error) {
    console.error('Error fetching metrics:', error);
  }
}

async function fetchHealth() {
  try {
    const response = await fetch('/health');
    const data = await response.json();

    const statusBadge = document.getElementById('status');
    if (data.status === 'healthy') {
      statusBadge.textContent = '● Healthy';
      statusBadge.classList.remove('status-unhealthy');
      statusBadge.classList.add('status-healthy');
    } else {
      statusBadge.textContent = '● Unhealthy';
      statusBadge.classList.remove('status-healthy');
      statusBadge.classList.add('status-unhealthy');
    }
  } catch (error) {
    console.error('Error fetching health:', error);
    const statusBadge = document.getElementById('status');
    statusBadge.textContent = '● Unreachable';
  }
}

// ===========================
// Metrics Update Functions
// ===========================

function updateMetrics(memory) {
  if (!memory) return;

  // Memory usage
  const heapUsed = formatBytes(memory.heapUsed);
  const heapTotal = formatBytes(memory.heapTotal);
  const rss = formatBytes(memory.rss);
  const external = formatBytes(memory.external);

  document.getElementById('memory-usage').textContent = rss;
  document.getElementById('memory-percent').textContent = 
    Math.round((memory.rss / (memory.rss + memory.external)) * 100) || 0;

  // Update memory bar
  const memoryFill = document.querySelector('#memory-bar .progress-fill');
  const memoryPercent = Math.min((memory.rss / (1024 * 1024 * 512)) * 100, 100); // Assume 512MB reserve
  memoryFill.style.width = memoryPercent + '%';

  // Heap usage
  document.getElementById('heap-used').textContent = heapUsed;
  document.getElementById('heap-percent').textContent = 
    Math.round((memory.heapUsed / memory.heapTotal) * 100);

  // Update heap bar
  const heapFill = document.querySelector('#heap-bar .progress-fill');
  const heapPercent = (memory.heapUsed / memory.heapTotal) * 100;
  heapFill.style.width = heapPercent + '%';

  // External memory
  document.getElementById('external-memory').textContent = external;
}

function updateUptime(seconds) {
  if (seconds === undefined) return;
  document.getElementById('process-uptime').textContent = formatTime(seconds);
}

// ===========================
// Modal Functions
// ===========================

function openModal(title, content) {
  const modal = document.getElementById('modal');
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').textContent = content;
  modal.classList.add('active');
}

function closeModal() {
  document.getElementById('modal').classList.remove('active');
}

async function callEndpoint(endpoint) {
  try {
    const response = await fetch(endpoint);
    const data = await response.json();
    openModal(`Response from ${endpoint}`, formatJSON(data));
  } catch (error) {
    openModal(`Error calling ${endpoint}`, `Error: ${error.message}`);
  }
}

// Close modal when clicking outside
document.addEventListener('DOMContentLoaded', function() {
  const modal = document.getElementById('modal');
  if (modal) {
    modal.addEventListener('click', function(event) {
      if (event.target === modal) {
        closeModal();
      }
    });
  }
});

// ===========================
// Initialization
// ===========================

function initialize() {
  fetchAppInfo();
  fetchComparison();
  fetchHealth();

  // Auto-refresh metrics every 5 seconds
  setInterval(fetchMetrics, 5000);
  // Auto-refresh health every 10 seconds
  setInterval(fetchHealth, 10000);

  // Smooth scroll for navigation links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href.startsWith('#')) {
        e.preventDefault();
        const section = document.querySelector(href);
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
