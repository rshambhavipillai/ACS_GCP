# GKE Metrics Monitoring - Quick Start Guide

## 🎯 Why You Can't See Metrics in GKE Workloads

Your GKE cluster needs **5 critical things** to display metrics:

### ✅ What We've Done For You

1. **✓ Added /metrics endpoint** - Prometheus-format metrics at `http://localhost:8080/metrics`
2. **✓ Added request tracking** - Counts requests, errors, response times
3. **✓ Created monitoring.yaml** - Kubernetes manifests for monitoring setup
4. **✓ Added resource limits** - deployment.yaml has `requests` and `limits` defined
5. **✓ Included health checks** - `/health` endpoint for pod readiness

---

## 🚀 Quick Start: View Metrics Locally

### Test GAE Metrics
```bash
# Curl (on Linux/Mac)
curl http://localhost:8080/metrics

# PowerShell
Invoke-WebRequest http://localhost:8080/metrics | Select-Object -ExpandProperty Content
```

**Expected Output:**
```
# HELP app_info Application information
# TYPE app_info gauge
app_info{platform="GAE",deployment="Google App Engine"} 1

# HELP app_requests_total Total requests
# TYPE app_requests_total counter
app_requests_total 5

# HELP app_response_time_ms Average response time
# TYPE app_response_time_ms gauge
app_response_time_ms 2.34
```

### Test GKE Metrics
```bash
curl http://localhost:8081/metrics
```

---

## 🏗️ Deploy to GKE Cluster

### Prerequisites
```bash
# 1. Enable APIs
gcloud services enable container.googleapis.com logging.googleapis.com monitoring.googleapis.com

# 2. Create cluster with monitoring
gcloud container clusters create gcp-compare-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --enable-cloud-logging \
  --enable-cloud-monitoring \
  --monitoring=SYSTEM,WORKLOAD,POD
```

### Build & Deploy
```bash
# 1. Authenticate Docker
gcloud auth configure-docker

# 2. Build image
docker build -t gcr.io/acs-stuttgart-2026-semester/gcp-compare-app:latest .

# 3. Push to Container Registry
docker push gcr.io/acs-stuttgart-2026-semester/gcp-compare-app:latest

# 4. Get cluster credentials
gcloud container clusters get-credentials gcp-compare-cluster --zone us-central1-a

# 5. Deploy to GKE
kubectl apply -f gke/deployment.yaml

# 6. Apply monitoring config (optional, requires Prometheus Operator)
kubectl apply -f gke/monitoring.yaml
```

---

## 📊 View Metrics in Cloud Console

### In Google Cloud Console
1. Go to **Kubernetes Engine** > **Workloads**
2. Click **gcp-compare-app** deployment
3. Click **Metrics** tab
4. Wait 2-3 minutes for data to appear

**You'll see:**
- CPU usage (millicores)
- Memory usage (MB)
- Network I/O
- Pod restarts
- Replica count

### In Cloud Monitoring Dashboard
1. **Monitoring** > **Dashboards** > **Create Dashboard**
2. Add chart: **Resource Type** = `k8s_workload`
3. Choose metrics:
   - `kubernetes.io/workload/cpu/core_usage_time`
   - `kubernetes.io/workload/memory/used_bytes`
   - `kubernetes.io/workload/network/received_bytes_count`

---

## 🔍 Verify Metrics Are Working

### Check if pod is running
```bash
kubectl get pods
kubectl describe pod gcp-compare-app-xxx
```

### Check if metrics are being scraped
```bash
kubectl top pods              # CPU & Memory usage
kubectl top nodes             # Node metrics
kubectl logs gcp-compare-app-xxx  # App logs
```

### Check resource requests/limits (Required!)
```bash
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].resources}{"\n"}{end}'
```

Output should show:
```
gcp-compare-app-xxx    {"limits":{"cpu":"500m","memory":"512Mi"},"requests":{"cpu":"100m","memory":"128Mi"}}
```

---

## 📈 Metrics You'll Get

| Metric | Description |
|--------|-------------|
| **CPU Usage** | Per pod, per container (millicores) |
| **Memory** | Heap, RSS, external (bytes) |
| **Network** | Bytes in/out per second |
| **Uptime** | Pod age in seconds |
| **Request Rate** | Requests per second custom metrics |
| **Error Rate** | Errors as percentage |
| **Response Time** | Average latency |
| **Restart Count** | Pod crash count |

---

## 🐛 Troubleshooting

### "No metrics showing in Cloud Console"

**Step 1: Verify cluster monitoring is enabled**
```bash
gcloud container clusters describe gcp-compare-cluster --zone us-central1-a | grep -i monitoring
```
Must show: `monitoringConfig: SYSTEM_COMPONENTS, WORKLOAD`

**Step 2: Verify pods have resource requests**
```bash
kubectl get pods -o yaml | grep -A5 resources:
```
Must show `requests:` and `limits:`

**Step 3: Wait 2-3 minutes**
Cloud Console takes time to collect initial metrics

**Step 4: Check if monitoring is actually collecting**
```bash
# View metrics via gcloud
gcloud monitoring metrics-list | grep kubernetes
```

### "Pod keeps restarting"
```bash
# Check pod logs
kubectl logs <pod-name> --previous
kubectl describe pod <pod-name>
```

### "Cannot connect to cluster"
```bash
# Re-authenticate
gcloud container clusters get-credentials gcp-compare-cluster --zone us-central1-a
kubectl cluster-info
```

---

## 📦 Optional: Install Prometheus for Advanced Monitoring

```bash
# Add Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Prometheus Stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace

# Access Prometheus UI
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090
# Visit http://localhost:9090

# Access Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
# Visit http://localhost:3000 (user: admin, password: prom-operator)

# Apply ServiceMonitor for our app
kubectl apply -f gke/monitoring.yaml
```

---

## 🔗 Useful Resources

- [GKE Monitoring Overview](https://cloud.google.com/kubernetes-engine/docs/how-to/monitoring)
- [Cloud Monitoring Docs](https://cloud.google.com/monitoring/docs)
- [Prometheus in Kubernetes](https://prometheus.io/docs/prometheus/latest/getting_started/)
- [kubectl cheat sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)

---

## ✅ Metrics Collection Checklist

Your app now has:
- [x] `/health` endpoint for liveness/readiness probes
- [x] `/metrics` endpoint in Prometheus format
- [x] Request counter tracking
- [x] Error counter tracking
- [x] Response time tracking
- [x] Memory metrics (heap, RSS, external)
- [x] CPU metrics
- [x] Process uptime tracking
- [x] Custom app metrics (requests, errors, etc.)

All endpoints are documented in your deployment and ready to be scraped by:
- GKE native monitoring (automatic)
- Prometheus (via ServiceMonitor)
- Cloud Monitoring (via Cloud Logging)
