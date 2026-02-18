# GKE Metrics Monitoring Setup Guide

## 📊 Why Can't You See Metrics?

Common reasons metrics don't show in GKE Workloads:
1. ❌ Application is not deployed to GKE cluster
2. ❌ Cloud Monitoring API is not enabled
3. ❌ No resource requests/limits defined (required for monitoring)
4. ❌ Workload doesn't have `requests` and `limits` set
5. ❌ Monitoring agent isn't running on cluster
6. ❌ Cluster doesn't have proper IAM permissions

---

## ✅ Complete Setup Steps

### Step 1: Enable Required APIs
```bash
gcloud services enable container.googleapis.com
gcloud services enable monitoring.googleapis.com
gcloud services enable logging.googleapis.com
gcloud services enable cloudtrace.googleapis.com
```

### Step 2: Create GKE Cluster with Monitoring Enabled
```bash
# Create cluster with monitoring enabled
gcloud container clusters create gcp-compare-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type n1-standard-2 \
  --enable-cloud-logging \
  --enable-cloud-monitoring \
  --logging=SYSTEM,WORKLOAD \
  --monitoring=SYSTEM,WORKLOAD,POD,STORAGE,NODE_POOLS
```

Or for existing cluster, enable monitoring:
```bash
gcloud container clusters update gcp-compare-cluster \
  --zone us-central1-a \
  --enable-cloud-logging \
  --enable-cloud-monitoring \
  --logging=SYSTEM,WORKLOAD \
  --monitoring=SYSTEM,WORKLOAD,POD,STORAGE,NODE_POOLS
```

### Step 3: Configure kubectl Access
```bash
gcloud container clusters get-credentials gcp-compare-cluster --zone us-central1-a
```

### Step 4: Build and Push Docker Image
```bash
# Configure Docker
gcloud auth configure-docker

# Build image
docker build -t gcr.io/acs-stuttgart-2026-semester/gcp-compare-app:1.0 .

# Push to GCR
docker push gcr.io/acs-stuttgart-2026-semester/gcp-compare-app:1.0
```

### Step 5: Deploy Application with Proper Resource Metrics
```bash
# Deploy using the updated deployment with metrics enabled
kubectl apply -f gke/deployment.yaml

# Verify deployment
kubectl get deployments
kubectl get pods
kubectl get services
```

### Step 6: Enable Workload Metrics in Cloud Console
Navigate to Cloud Console:
1. Go to **Kubernetes Engine** > **Workloads**
2. Click on your deployment: **gcp-compare-app**
3. Go to **Metrics** tab
4. Wait 2-3 minutes for initial metrics to appear

---

## 📈 Metrics You'll See

### Pod-Level Metrics
- **CPU Usage** (millicores)
- **Memory Usage** (bytes)
- **Network I/O** (bytes/sec)
- **Disk I/O** operations
- **Restart count**

### Deployment-Level Metrics
- **Pod Count** (desired vs actual)
- **CPU Utilization %**
- **Memory Utilization %**
- **Network metrics**
- **Uptime**

### Container-Level Metrics
- **CPU requests/limits**
- **Memory requests/limits**
- **Filesystem usage**

---

## 🔧 Configure Custom Metrics (Optional)

### Option 1: Use Prometheus Operator
```bash
# Install Prometheus
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack

# Apply ServiceMonitor
kubectl apply -f gke/monitoring.yaml
```

### Option 2: Send Custom Metrics to Cloud Monitoring
Add to your Node.js app:

```javascript
// Example custom metrics
const client = require('@google-cloud/monitoring').MetricServiceClient;

function recordCustomMetric(metricType, value) {
  const projectName = `projects/acs-stuttgart-2026-semester`;
  const timeSeries = {
    metric: { type: metricType },
    resource: { type: 'gke_pod' },
    points: [{
      interval: { endTime: { seconds: Math.floor(Date.now() / 1000) } },
      value: { doubleValue: value }
    }]
  };

  const request = { name: projectName, timeSeries: [timeSeries] };
  // Write the time series
}
```

---

## 🐛 Troubleshooting

### Metrics Not Showing?

**Check 1: Verify cluster has monitoring enabled**
```bash
gcloud container clusters describe gcp-compare-cluster --zone us-central1-a | grep -i monitoring
```
Output should show: `monitoringConfig: system, workload, pod...`

**Check 2: Verify pods are running**
```bash
kubectl get pods -n default
kubectl describe pod gcp-compare-app-xxx
```

**Check 3: Check pod resource requests/limits**
```bash
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].resources}{"\n"}{end}'
```
Must show `requests` and `limits`!

**Check 4: View pod metrics directly**
```bash
kubectl top pods
kubectl top nodes
```

**Check 5: Check Cloud Monitoring agent**
```bash
kubectl get ds -A | grep fluentd
kubectl get ds -A | grep monitoring
```

**Check 6: Monitor API quota**
```bash
# Check if monitoring.googleapis.com API is enabled
gcloud services list --enabled | grep monitoring
```

---

## 📊 View Metrics in Cloud Console

### Path 1: Through Kubernetes Workloads
1. **Kubernetes Engine** > **Workloads**
2. Select **gcp-compare-app**
3. Click **Metrics** tab
4. View CPU, Memory, Network, Disk metrics

### Path 2: Through Cloud Monitoring Dashboards
1. **Monitoring** > **Dashboards**
2. Create new dashboard
3. Add charts for:
   - Container CPU utilization
   - Container memory usage
   - Pod restart count
   - Network bytes in/out

### Path 3: Through Logs
1. **Logging** > **Logs Explorer**
2. Filter: `resource.type="k8s_workload" AND resource.labels.workload_name="gcp-compare-app"`
3. View pod logs in real-time

---

## 🚨 Alert Examples

### High CPU Usage
```yaml
displayName: GKE Pod High CPU
conditions:
  - displayName: CPU > 400m
    conditionThreshold:
      filter: 'resource.type="k8s_pod" AND metric.type="kubernetes.io/pod/cpu/core_usage_time"'
      comparison: COMPARISON_GT
      thresholdValue: 0.4
```

### Memory Pressure
```yaml
displayName: GKE Pod High Memory
conditions:
  - displayName: Memory > 80% of limit
    conditionThreshold:
      filter: 'resource.type="k8s_pod" AND metric.type="kubernetes.io/pod/memory/used_bytes"'
      comparison: COMPARISON_GT
      thresholdValue: 419430400  # 80% of 512Mi
```

### Pod Restarts
```yaml
displayName: Pod Restarting Frequently
conditions:
  - displayName: Restarts > 2 in 15m
    conditionThreshold:
      filter: 'resource.type="k8s_pod" AND metric.type="kubernetes.io/pod/restart_count"'
      comparison: COMPARISON_GT
      thresholdValue: 2
```

---

## ✅ Checklist

- [ ] Cloud Monitoring API enabled
- [ ] GKE cluster created with monitoring enabled
- [ ] Application deployed with resource requests/limits
- [ ] Pods are in Running state
- [ ] `kubectl top pods` shows metrics
- [ ] metrics visible in Cloud Console after 2-3 minutes
- [ ] Prometheus installed (optional)
- [ ] ServiceMonitor applied (optional)
- [ ] Alerts configured (optional)

---

## 🔗 Useful Commands

```bash
# Watch metrics in real-time
watch 'kubectl top pods'

# Get detailed metrics for pod
kubectl describe pod <pod-name>

# View pod logs
kubectl logs <pod-name>

# Execute into pod
kubectl exec -it <pod-name> -- /bin/sh

# Port forward to access app locally
kubectl port-forward service/gcp-compare-service 8080:80

# Check monitoring permissions
kubectl get clusterrolebinding | grep monitoring
```

---

## 📚 Documentation Links

- [GKE Monitoring](https://cloud.google.com/kubernetes-engine/docs/how-to/monitoring)
- [Cloud Monitoring](https://cloud.google.com/monitoring/docs)
- [Kubernetes Metrics](https://kubernetes.io/docs/tasks/debug-application-cluster/resource-metrics-pipeline/)
- [Prometheus Operator](https://prometheus-operator.dev/)
