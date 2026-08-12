## Architecture

```text
                                 +-------------------+
                                 | Client / Frontend |
                                 +---------+---------+
                                           |
                                           | REST API
                                           v
                                   +---------------+
                                   |  API Gateway  |  (Port 3000)
                                   +-------+-------+
                                           |
           +-------------------------------+-------------------------------+
           |                               |                               |
           v                               v                               v
  +-----------------+             +-----------------+             +-----------------+
  | Catalog Service |             |  Order Service  |             | Rating Service  |
  |   (Port 3001)   |             |   (Port 3002)   |             |   (Port 3003)   |
  +--------+--------+             +--------+--------+             +--------+--------+
           |                               |                               |
           v                               |                               v
      (MongoDB)                            |                           (MongoDB)
                                           |
                           Publish Event   |
                          -----------------+
                          |
                          v
                +-------------------+
                |     RabbitMQ      |
                |  (Event Broker)   |
                +---------+---------+
                          |
                          | Consume Event
                          v
              +----------------------+
              | Notification Service |
              |     (Port 3004)      |
              +----------+-----------+
                         |
                         +---> (MongoDB)
                         |
                         +---> SSE Real-time Updates / Nodemailer
```

---

## Tech Stack

* **Backend:** Node.js, Express.js
* **Databases:** MongoDB (Catalog, Rating, Notification), MySQL (Order)
* **Messaging:** RabbitMQ
* **Containerization & Orchestration:** Docker, Kubernetes (Minikube)
* **Frontend:** HTML5, JavaScript (ES6+), Tailwind CSS

---

## Microservices Breakdown

### API Gateway (Port 3000)
* Entry point for all incoming API traffic.
* Handles request proxying and attaches a correlation ID (`x-correlation-id`) to incoming requests for log tracing.

### Catalog Service (Port 3001)
* Manages cake product records stored in MongoDB.
* **Endpoints:**
  * `GET /api/cakes` : Retrieve products with optional filter query params (`name`, `category`, `minPrice`, `maxPrice`).
  * `GET /api/cakes/:id` : Fetch details for a specific item.
  * `POST /api/cakes` : Add new product to catalog.

### Order Service (Port 3002)
* Manages shopping basket state and checkout transactions using MySQL.
* **Endpoints:**
  * `GET /api/orders/basket/:userId` : Get current user basket.
  * `POST /api/orders/basket/:userId` : Add or update basket item.
  * `DELETE /api/orders/basket/:userId/:cakeId` : Remove item from basket.
  * `POST /api/orders/checkout/:userId` : Execute checkout, create order, and publish `order_completed` event to RabbitMQ.
  * `PATCH /api/orders/:orderId/status` : Update order tracking status.

### Rating Service (Port 3003)
* Stores and computes customer ratings and reviews in MongoDB.
* **Endpoints:**
  * `POST /api/rating` : Submit a review and score.
  * `GET /api/rating/:cakeId` : Get calculated average score and review list for a product.

### Notification Service (Port 3004)
* Consumes `order_completed` events asynchronously from RabbitMQ.
* Stores notification logs in MongoDB and sends email confirmations via Nodemailer.
* **Endpoints:**
  * `GET /api/notification/stream` : Server-Sent Events (SSE) connection to push real-time updates to the web client.
  * `GET /api/notification/:orderId` : Retrieve notification logs by order ID.

---

## Quickstart Guide

### Prerequisites
* Docker installed and running.
* Minikube (or local Kubernetes cluster) running.
* `kubectl` configured to target your local cluster.

### Step 1: Start Minikube
```bash
minikube start
```

### Step 2: Run Automated Deployment

**On Windows (PowerShell):**
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\deploy.ps1
```

**On Linux / macOS:**
```bash
chmod +x deploy.sh
./deploy.sh
```

### Step 3: Verify Cluster Status
Check that all database, broker, gateway, and microservice pods are running:
```bash
kubectl get pods
```

### Step 4: Expose API Gateway
Expose port 3000 of the Gateway service to local port 30000:
```bash
kubectl port-forward service/api-gateway-service 30000:3000
```

### Step 5: Launch the Frontend
Open `frontend/index.html` directly in any standard browser to use the application.

---

## Observability: Logging & Monitoring

The application uses built-in Kubernetes features and Winston to track system health and logs without requiring external dashboards.

### Checking Logs
All microservices use Winston to output structured JSON logs to stdout, which Kubernetes captures automatically. You can view the live log stream for any specific service using its label. For example:
```bash
kubectl logs -l app=order-service -f
kubectl logs -l app=api-gateway -f
```

### Checking Health & Events
Each microservice exposes a `/health` endpoint that verifies database and message broker connectivity. Kubernetes uses these endpoints for liveness and readiness probes. If a service becomes unresponsive, Kubernetes will automatically restart the pod. You can monitor these cluster events and check for probe failures using:
```bash
kubectl get events --sort-by='.metadata.creationTimestamp'
kubectl describe pod -l app=catalog-service
```