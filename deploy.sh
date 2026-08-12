#!/bin/bash

echo "Starting Cake Delight Deployment..."

# 1. Clean up old ConfigMap if it exists
kubectl delete configmap mongodb-seed-config --ignore-not-found

# 2. Create the seed ConfigMap
kubectl create configmap mongodb-seed-config --from-file=catalog-service/seed.js

# 3. Apply all K8s manifests recursively
kubectl apply -R -f k8s/

echo "Waiting for pods to initialize... (Press Ctrl+C to exit watch mode when READY)"
kubectl get pods -w