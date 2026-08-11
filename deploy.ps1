Write-Host "Starting Cake Delight Deployment..." -ForegroundColor Cyan

# 1. Clean up old ConfigMap if it exists so we can recreate it cleanly
kubectl delete configmap mongodb-seed-config --ignore-not-found

# 2. Create the seed ConfigMap
kubectl create configmap mongodb-seed-config --from-file=catalog-service/seed.js

# 3. Apply all K8s manifests recursively (-R handles all subfolders automatically)
kubectl apply -R -f k8s/

Write-Host "Waiting for pods to initialize... (Press Ctrl+C to exit watch mode when READY)" -ForegroundColor Yellow
kubectl get pods -w