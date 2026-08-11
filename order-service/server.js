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

//API for Health Check
app.get('/health',async (req, res)=>{
    try{
        if(!dbPool){
        return res.status(503).json({status: 'DOWN', database: 'NOT_INITIALIZED'});
        }
        await dbPool.query('SELECT 1');
        res.status(200).json({status: 'UP', database: 'CONNECTED'});
    }catch(error){
        res.status(503).json({status: 'DOWN', database: 'DISCONNECTED', error: error.message});
    }
})



let dbPool;

//API to get basket and total Amount for userId
app.get('/api/orders/basket/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const [basket] = await dbPool.query(
            'SELECT cake_id as cakeId, cake_name as cakeName, price, quantity FROM basket_items WHERE user_id = ?', 
            [userId]
        );

        const totalAmount = basket.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
        logger.info('Basket retrieved', { userId, itemCount: basket.length, correlationId: req.correlationId });
        res.status(200).json({ basket, totalAmount });
    } catch (error) {
        logger.error('Error fetching basket', { error: error.message, correlationId: req.correlationId });
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//API to add to basket or update the quantity if item already exists
app.post('/api/orders/basket/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { cakeId, cakeName, price, quantity } = req.body;

        
        await dbPool.query(`
            INSERT INTO basket_items (user_id, cake_id, cake_name, price, quantity) 
            VALUES (?, ?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
        `, [userId, cakeId, cakeName, price, quantity]);

        const [basket] = await dbPool.query(
            'SELECT cake_id as cakeId, cake_name as cakeName, price, quantity FROM basket_items WHERE user_id = ?', 
            [userId]
        );

        logger.info('Item added to basket', { userId, cakeId, correlationId: req.correlationId });
        res.status(200).json({ message: "Item Added", basket });
    } catch (error) {
        logger.error('Error adding to basket', { error: error.message, correlationId: req.correlationId });
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//API to remove item from basket
app.delete('/api/orders/basket/:userId/:cakeId', async (req, res) => {
    try {
        const { userId, cakeId } = req.params;

        await dbPool.query('DELETE FROM basket_items WHERE user_id = ? AND cake_id = ?', [userId, cakeId]);

        const [basket] = await dbPool.query(
            'SELECT cake_id as cakeId, cake_name as cakeName, price, quantity FROM basket_items WHERE user_id = ?', 
            [userId]
        );

        logger.info('Item removed from basket', { userId, cakeId, correlationId: req.correlationId });
        res.status(200).json({ message: 'Item Removed', basket });
    } catch (error) {
        logger.error('Error removing from basket', { error: error.message, correlationId: req.correlationId });
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//API for Completing Checkout
app.post('/api/orders/checkout/:userId', async (req, res) => {
    const { userId } = req.params;
    const { customerName, customerEmail } = req.body;

    let connection;

    try {
        connection = await dbPool.getConnection();
        await connection.beginTransaction();

        const [basket] = await connection.query(
            'SELECT cake_id as cakeId, cake_name as cakeName, price, quantity FROM basket_items WHERE user_id = ?', 
            [userId]
        );

        if (!basket || basket.length === 0) {
            connection.release();
            return res.status(400).json({ message: 'Cannot checkout with empty basket' });
        }

        const totalAmount = basket.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);

        const [orderResult] = await connection.query(
            'INSERT INTO orders (customer_name, customer_email, total_amount) VALUES(?, ?, ?)',
            [customerName, customerEmail, totalAmount]
        );

        const orderId = orderResult.insertId;

        for (const item of basket) {
            await connection.query(
                'INSERT INTO order_item (order_id, cake_id, cake_name, price, quantity) VALUES (?, ?, ?, ?, ?)',
                [orderId, item.cakeId, item.cakeName, item.price, item.quantity]
            );
        }

        await connection.query('DELETE FROM basket_items WHERE user_id = ?', [userId]);

        await connection.commit();
        connection.release();

        const eventPayload = { orderId, customerName, customerEmail, totalAmount, items: basket };
        publishOrderCompletedEvent(eventPayload);

        logger.info('Checkout Successful', { orderId, correlationId: req.correlationId });
        res.status(201).json({ message: 'order created successfully', orderId });

    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        logger.error('Error in checkout api', { error: error.message, correlationId: req.correlationId });
        res.status(500).json({ message: 'Internal Server Error in Checkout API' });
    }
});

// API to update order status
app.patch('/api/orders/:orderId/status', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body; 

        const validStatuses = ['PENDING', 'COMPLETED', 'CANCELLED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status. Must be PENDING, COMPLETED, or CANCELLED.' });
        }

        const [result] = await dbPool.query(
            'UPDATE orders SET status = ? WHERE id = ?',
            [status, orderId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }

        logger.info('Order status updated', { orderId, status, correlationId: req.correlationId });
        res.status(200).json({ message: 'Order status updated successfully', orderId, status });
    } catch (error) {
        logger.error('Error updating order status', { error: error.message, correlationId: req.correlationId });
        res.status(500).json({ message: 'Internal Server Error' });
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