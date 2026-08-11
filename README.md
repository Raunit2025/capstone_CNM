# Cake Delight - Cloud-Native Microservices Capstone

## 📋 Prerequisites
Before running this project, ensure you have the following installed and running on your machine:
1. **Docker**: Must be installed and running.
2. **Minikube** (or equivalent local Kubernetes cluster): Must be started.
   * Run `minikube start` to initialize your cluster.
3. **kubectl**: Command-line tool must be installed and configured to communicate with your cluster.

## 🚀 Deployment Instructions

We have provided automated deployment scripts for your convenience.

**For Windows (PowerShell):**
1. Ensure your execution policy allows scripts: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`
2. Run the deployment script: `.\deploy.ps1`

**For Mac/Linux (Bash):**
1. Make the script executable: `chmod +x deploy.sh`
2. Run the deployment script: `./deploy.sh`

## 🌐 Accessing the Application
Once all pods display a `1/1 READY` state, expose the API Gateway to your local machine by running:
```bash
kubectl port-forward service/api-gateway-service 30000:3000