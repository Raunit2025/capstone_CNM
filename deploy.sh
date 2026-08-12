#!/bin/bash
# deploy.sh

echo "Starting Cake Delight Deployment..."

# 1. Configure Docker environment for Minikube if active
CURRENT_CONTEXT=$(kubectl config current-context)
if [ "$CURRENT_CONTEXT" = "minikube" ]; then
    echo "Minikube context detected. Pointing Docker daemon to Minikube..."
    eval $(minikube docker-env)
fi

# 2. Build Docker images (Fixes ImagePullBackOff on fresh environments)
echo "Building Microservice Images..."
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

echo "Waiting for pods to initialize..."
kubectl get pods -w