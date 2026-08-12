# deploy.ps1
Write-Host "Starting Cake Delight Deployment..." -ForegroundColor Cyan

# 1. Configure Docker environment for Minikube if active
$currentContext = kubectl config current-context
if ($currentContext -eq "minikube") {
    Write-Host "Minikube context detected. Pointing Docker daemon to Minikube..." -ForegroundColor Yellow
    minikube docker-env | Invoke-Expression
}

# 2. Build Docker images (Fixes ImagePullBackOff on fresh environments)
Write-Host "Building Microservice Images..." -ForegroundColor Cyan
docker build -t api-gateway:latest ./api-gateway
docker build -t catalog-service:latest ./catalog-service
docker build -t order-service:latest ./order-service
docker build -t rating-service:latest ./rating-service
docker build -t notification-service:latest ./notification-service

# 3. Clean up and recreate ConfigMap
kubectl delete configmap mongodb-seed-config --ignore-not-found
kubectl create configmap mongodb-seed-config --from-file=catalog-service/seed.js

# 4. Apply Kubernetes Manifests
kubectl apply -R -f k8s/

Write-Host "Waiting for pods to initialize..." -ForegroundColor Yellow
kubectl get pods -w