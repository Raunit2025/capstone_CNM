const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const logger = require('./config/logger').logger;
const Cake = require('./models/Cake').Cake;

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next)=>{
    req.correlationId = req.headers['x-correlation-id'] || 'N/A';
    next();
});

const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:password@localhost:27017/catalog_db?authSource=admin';

mongoose.connect(MONGO_URI)
.then(() => {
    logger.info('MongoDB Connected Successfully');
})
.catch(err => {
    logger.error('MongoDB Connection Error',{error: err.message});
    process.exit(1);
});

//API for Health Check
app.get('/health',(req, res)=>{
    const isDatabaseConnected = mongoose.connection.readyState === 1;
    if(isDatabaseConnected){
        return res.status(200).json({status: 'UP', database: 'CONNECTED'});
    }
    return res.status(503).json({status: 'DOWN', database: 'DISCONNECTED'});
})

//API to get List and filter cakes
app.get('/api/cakes', async (req,res)=>{
    try{
        const {name, category, minPrice, maxPrice} = req.query;
        let query = {};

        if(name) query.name = {$regex: name, $options: 'i'};
        if(category) query.category = category;
        if(minPrice || maxPrice){
            query.price = {};
            if(minPrice) query.price.$gte = Number(minPrice);
            if(maxPrice) query.price.$lte = Number(maxPrice);
        }

        const cakes = await Cake.find(query);
        logger.info('Cakes retrieved successfully',{count: cakes.length, correlationId: req.correlationId });
        res.status(200).json(cakes);
    }catch(error){
        logger.error('Error fetching cakes',{ error: error.message, correlationId: req.correlationId });
        res.status(500).json({ message: 'Internal Server Error in cakes get api '});
    }
});


//API to get cake by id
app.get('/api/cakes/:id', async (req, res) =>{
    try{
        const cake = await Cake.findById(req.params.id);
        if(!cake){
            logger.warn('Cake not found', {cakeId: req.params.id, correlationId: req.correlationId });
            return res.status(404).json({message: 'Cake not found'});
        }
        res.status(200).json(cake);
    }catch(error){
        logger.error('Error fetching Cake details', {error: error.message, correlationId: req.correlationId});
        res.status(500).json({message: 'Internal server error in cakes api get by id'});
    }
});


//Utility API to add cake data to the DB easily :)
app.post('/api/cakes',async (req, res)=>{
    try{
        const newCake = new Cake(req.body);
        await newCake.save();
        logger.info('New Cake data created', {cakeId: newCake._id, correlationId: req.correlationId});
        res.status(201).json(newCake);
    }catch(error){
        logger.error('Error creating cake', {error: error.message, correlationId: req.correlationId});
        res.status(400).json({message: 'Bad Request', error: error.message });
    }
})

const PORT = process.env.PORT || 3001;

app.listen(PORT,() => {
    logger.info(`Catalog service is listening on PORT: ${PORT}`);
})