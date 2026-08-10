const express = require('express');
const cors = require('cors');
const logger = require('./config/logger').logger;
const initDatabase = require('./config/initDb').initDatabase;
const {connectRabbitMQ, publishOrderCompletedEvent} = require('./config/rabbitmq');

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next)=>{
    req.correlationId = req.headers['x-correlation-id'] || 'N/A';
    next();
});

let dbPool;

const baskets = {};

//API to get basket and total Amount for userId
app.get('/api/orders/basket/:userId',(req,res)=>{
    const {userId} = req.params;
    const basket = baskets[userId] || [];

    const totalAmount = basket.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    logger.info('Basket retrieved',{userId, itemCount: basket.length,correlationId: req.correlationId});
    res.status(200).json({basket, totalAmount});
});

//API to add to basket or update the quantity if item already exists
app.post('/api/orders/basket/:userId',(req,res)=>{
    const {userId} = req.params;
    const {cakeId, cakeName, price, quantity} = req.body;

    if(!baskets[userId]) baskets[userId] = [];

    const existingItem = baskets[userId].find(item => item.cakeId === cakeId);
    if(existingItem){
        existingItem.quantity += quantity;
    }else{
        baskets[userId].push({cakeId, cakeName, price,quantity});
    }

    logger.info('Item added to basket', {userId, cakeId, correlationId: req.correlationId});
    res.status(200).json({message: "Item Added", basket: baskets[userId]});
});

//API to remove item from basket
app.delete('/api/orders/basket/:userId/:cakeId',(req,res)=>{
    const {userId, cakeId} = req.params;

    if(baskets[userId]){
        baskets[userId] = baskets[userId].filter(item => item.cakeId !== cakeId);
    }
    logger.info('Item removed from basket',{userId, cakeId, correlationId: req.correlationId});
    res.status(200).json({message: 'Item Removed', basket: baskets[userId] || []});
});

//API for Completing Checkout
app.post('/api/orders/checkout/:userId',async (req,res)=>{
    const { userId } = req.params;
    const {customerName, customerEmail} = req.body;

    const basket = baskets[userId];
    if(!basket || basket.length === 0){
        return res.status(400).json({message : 'Cannot checkout with empty basket'});
    }

    const totalAmount = basket.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    let connection;

    try{
        connection = await dbPool.getConnection();
        await connection.beginTransaction();

        const [orderResult] = await connection.query(
            'INSERT INTO orders (customer_name, customer_email, total_amount) VALUES(?, ?, ?)',
            [customerName, customerEmail, totalAmount]
        );

        const orderId = orderResult.insertId;

        for(const item of basket){
            await connection.query(
                'INSERT INTO order_item (order_id, cake_id, cake_name, price, quantity) VALUES (?, ?, ?, ?, ?)',
                [orderId, item.cakeId, item.cakeName, item.price, item.quantity]
            );
        }

        await connection.commit();
        connection.release();

        delete baskets[userId];

        const eventPayload = {orderId, customerName, customerEmail, totalAmount, items: basket};
        publishOrderCompletedEvent(eventPayload);

        logger.info('Checkout Successful', {orderId, correlationId: req.correlationId});
        res.status(201).json({message: 'order created successfully', orderId});
    }catch(error){
        if(connection){
            await connection.rollback();
            connection.release();
        }
        logger.error('Error in checkout api',{ error: error.message, correlationId: req.correlationId});
        res.status(500).json({message: 'Internal Server Error in Checkout API'});
    }
});

const PORT = process.env.PORT || 3002;

async function startServer() {
    try{
        dbPool = await initDatabase();
        await connectRabbitMQ();

    app.listen(PORT, ()=>{
        logger.info(`Order service listening on PORT ${PORT}`);
    });
    }catch(error){
        logger.error('Failed to start order-service Server', {error: error.message});
        process.exit(1);
    }
}

startServer();