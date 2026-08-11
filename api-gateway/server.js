const express = require('express');
const cors = require('cors');
const {createProxyMiddleware} = require('http-proxy-middleware');
const {v4: uuidv4} = require('uuid');
const logger = require('./config/logger');

const app = express();
app.use(cors());
app.use((req,res,next)=>{
    if(!req.headers['x-correlation-id']){
        req.headers['x-correlation-id'] = uuidv4();
    }
    logger.info(`Incoming request ${req.method} ${req.url}`, {correlationId: req.headers['x-correlation-id']});
    next();
});

const routes = {
    '/api/cakes': process.env.CATALOG_URL || 'http://localhost:3001',
    '/api/orders': process.env.ORDER_URL || 'http://localhost:3002',
    '/api/rating': process.env.RATING_URL || 'http://localhost:3003',
    '/api/notification': process.env.NOTIFICATION_URL || 'http://localhost:3004'
};

//API for Health Check
app.get('/health',(req,res)=>{
    res.status(200).json({status: 'UP', service: 'api-gateway', timestamp: new Date()});
})

for(const[route, target] of Object.entries(routes)){
    app.use(route, createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: (path, req) => req.originalUrl,
        on:{
            proxyReq: (proxyReq, req, res) =>{
                proxyReq.setHeader('x-correlation-id', req.headers['x-correlation-id']);
            },
            error: (err, req, res)=>{
                logger.error(`Proxy error while routing to ${route}`, {correlationId: req.headers['x-correlation-id']});
                res.status(502).json({message: 'Bad Gateway: Microservice is down or unreachable'});
            }
        }

    }));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>{
    logger.info(`API Gateway is running on PORT ${PORT}`);
});