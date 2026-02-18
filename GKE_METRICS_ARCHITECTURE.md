# 📊 GKE Metrics Monitoring - Complete Solution

## Problem: "Why can't I see metrics in GKE workloads?"

**Answer:** You need a GKE cluster deployed with proper monitoring configuration.

---

## ✅ What We've Set Up For You

### 1. **Application Metrics (`/metrics` endpoint)**
```
✓ Request counting (total, errors, rate)
✓ Response time tracking (average, p95, p99)
✓ Memory metrics (heap, RSS, external)
✓ CPU metrics
✓ Uptime tracking
✓ Process information
✓ Health check counts
```

### 2. **Kubernetes Manifests**
```
✓ deployment.yaml → With health checks + resource limits
✓ monitoring.yaml → ServiceMonitor + PrometheusRules
✓ service-account.yaml → RBAC configuration
✓ configmap.yaml → Configuration management
✓ ingress.yaml → External access
```

### 3. **Documentation**
```
✓ GKE_MONITORING_SETUP.md → Complete setup guide
✓ GKE_METRICS_QUICK_START.md → Quick reference
✓ Este arquivo → Architecture overview
```

---

## 🏃 Quick Start Steps (5 minutes)

### Step 1: Create GKE Cluster with Monitoring
```powershell
gcloud container clusters create gcp-compare-cluster `
  --zone us-central1-a `
  --num-nodes 3 `
  --enable-cloud-logging `
  --enable-cloud-monitoring `
  --monitoring=SYSTEM,WORKLOAD,POD
```

### Step 2: Build & Push Docker Image
```powershell
gcloud auth configure-docker
docker build -t gcr.io/acs-stuttgart-2026-semester/gcp-compare-app:latest .
docker push gcr.io/acs-stuttgart-2026-semester/gcp-compare-app:latest
```

### Step 3: Deploy to GKE
```powershell
gcloud container clusters get-credentials gcp-compare-cluster --zone us-central1-a
kubectl apply -f gke/deployment.yaml
```

### Step 4: View Metrics
**Wait 2-3 minutes, then:**
1. Go to **Google Cloud Console**
2. **Kubernetes Engine** > **Workloads**
3. Click **gcp-compare-app**
4. Click **Metrics** tab

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  GKE Cluster (Google Cloud)                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────┐                                    │
│  │   Pod 1              │                                    │
│  │  ┌────────────────┐  │  ┌─────────────────────────────┐  │
│  │  │ gcp-compare    │  │  │ Exponential Backoff  │  
│  │  │ app:8080       │  │  │ Retry Policy         │  
│  │  │                │  │  │                      │  
│  │  │ /health        │──┼──→ K8s Probes          │  
│  │  │ /metrics       │  │  │ (liveness & ready)   │  
│  │  │ /api/*         │  │  │                      │  
│  │  └────────────────┘  │  └─────────────────────────────┘  
│  │                       │                                    │
│  │  Resource Requests:   │                                    │
│  │  • CPU: 100m          │  ┌─────────────────────────────┐  
│  │  • Memory: 128Mi      │  │ Real-time Metrics   │  
│  │                       │  │ • CPU Usage         │  
│  │  Resource Limits:     │  │ • Memory Usage      │  
│  │  • CPU: 500m          │  │ • Network I/O       │  
│  │  • Memory: 512Mi      │  │ • Restarts          │  
│  │                       │  └─────────────────────────────┘  
│  └──────────────────────┘                                    │
│                                                               │
│  ┌──────────────────────┐                                    │
│  │   Pod 2              │  ┌─────────────────────────────┐  
│  │  [gcp-compare]       │  │ Horizontal Pod Autoscaler   │  
│  └──────────────────────┘  │ • Min: 3 replicas           │  
│                            │ • Max: 10 replicas          │  
│  ┌──────────────────────┐  │ • Target CPU: 70%           │  
│  │   Pod 3              │  │ • Target Memory: 80%        │  
│  │  [gcp-compare]       │  └─────────────────────────────┘  
│  └──────────────────────┘                                    │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Service Mesh (Optional)                                 │ │
│  │ • Load Balancer: gcp-compare-service (port 80→8080)    │ │
│  │ • Session Affinity: None                               │ │
│  │ • Pod Disruption Budget: max 1 unavailable             │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
         │
         ├──→ Cloud Monitoring (Automatic)
         ├──→ Cloud Logging (Automatic)
         └──→ Prometheus Scraper (Optional)
              • ServiceMonitor configured
              • Metrics available @ /metrics
```

---

## 📈 Metrics Collected

### Automatic Metrics (by GKE)
- CPU utilization (%)
- Memory utilization (%)
- Disk I/O
- Network bandwidth
- Pod restart count
- Replica count

### Custom Application Metrics (from `/metrics`)
- Total requests (counter)
- Total errors (counter)
- Average response time (gauge)
- Uptime (gauge)
- Health check count (counter)
- Memory heap usage (bytes)
- Process uptime (seconds)

---

## 🔧 Configuration Files

### `gke/deployment.yaml`
Contains:
- Pod resource requests/limits ✓
- Liveness probe ✓
- Readiness probe ✓
- HorizontalPodAutoscaler ✓
- PodDisruptionBudget ✓
- Prometheus scrape annotations ✓

### `gke/monitoring.yaml`
Contains:
- ServiceMonitor (for Prometheus)
- PodMonitor (for pod-level metrics)
- PrometheusRule (alert rules)
- Service definition

### `app.js`
Added:
- Metrics collection middleware ✓
- `/metrics` endpoint ✓
- Request/error/response-time tracking ✓

---

## 🚀 Deployment Steps

```
1. Infrastructure Setup
   └─ Create GKE cluster with monitoring enabled

2. Build & Registry
   └─ Build Docker image
   └─ Push to Google Container Registry

3. Kubernetes Deployment
   └─ Apply deployment.yaml
   └─ Verify pods are running
   └─ Apply monitoring.yaml (optional)

4. Verification
   └─ Check pod status: kubectl get pods
   └─ Check metrics: kubectl top pods
   └─ View in Cloud Console

5. Monitoring Setup (Optional)
   └─ Install Prometheus Operator
   └─ Install Grafana
   └─ Create dashboards
```

---

## 🔍 Verification Commands

```bash
# Check cluster
kubectl cluster-info

# Check pods
kubectl get pods
kubectl describe pod <pod-name>

# Check metrics availability
kubectl top pods
kubectl top nodes

# Check resource definition
kubectl get pod <pod-name> -o yaml | grep -A5 resources:

# View app logs
kubectl logs <pod-name>

# Port-forward to access app
kubectl port-forward service/gcp-compare-service 8080:80

# Test metrics endpoint
curl http://localhost:8080/metrics

# Install Prometheus (optional)
helm install prometheus prometheus-community/kube-prometheus-stack
```

---

## 📊 View Metrics In Cloud Console

### Path 1: Kubernetes Workloads
1. Cloud Console → Kubernetes Engine → Workloads
2. Click "gcp-compare-app"
3. View "Metrics" tab
4. See: CPU, Memory, Network, Restarts

### Path 2: Cloud Monitoring Dashboard
1. Monitoring → Dashboards → Create Dashboard
2. Add Charts
3. Select metrics:
   - kubernetes.io/workload/cpu/core_usage_time
   - kubernetes.io/workload/memory/used_bytes
   - kubernetes.io/workload/network/received_bytes_count

### Path 3: Prometheus (Optional)
1. Install: `helm install prometheus prometheus-community/kube-prometheus-stack`
2. Port-forward: `kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090`
3. Visit: http://localhost:9090
4. Query: `app_requests_total`, `app_response_time_ms`, etc.

---

## ⚠️ Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| No metrics showing | Wait 2-3 minutes, check if monitoring is enabled on cluster |
| Pod not starting | Check limits: 512Mi memory might be too low |
| Metrics empty after 5 min | Verify `requests`/`limits` are defined in deployment |
| Prometheus not scraping | Verify ServiceMonitor and Pod both have annotations |
| Dashboard shows no data | Check GKE cluster has `--monitoring=SYSTEM,WORKLOAD` |

---

## ✅ Summary

✓ Application has metrics endpoint (`/metrics`)
✓ Kubernetes manifests configured with resource limits
✓ Health checks enabled (liveness + readiness)
✓ Auto-scaling configured (HPA)
✓ Monitoring setup documented
✓ Ready to deploy to GKE cluster
✓ Metrics will auto-appear in Cloud Console

**Next steps:**
1. Create GKE cluster with monitoring enabled
2. Push Docker image to Container Registry  
3. Deploy using provided YAML files
4. Metrics visible in ~3-5 minutes

All the configuration is ready to go! 🚀
