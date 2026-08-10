const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const logger = require("./config/logger");
const Rating = require("./models/Rating");

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  req.correlationId = req.headers["x-correlation-id"] || "N/A";
  next();
});

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:password@localhost:27017/rating_db?authSource=admin";

mongoose
  .connect(MONGO_URI)
  .then(() => logger.info("MongoDb connected successfully"))
  .catch((error) =>
    logger.error("MongoDb Connection Error", { error: error.message }),
  );

//API to submit new rating
app.post("/api/rating", async (req, res) => {
  try {
    const { cakeId, userId, rating, review } = req.body;

    if (!cakeId || !userId || !rating) {
      return res
        .status(400)
        .json({ message: "cakeId, userId and ratings are required" });
    }

    const newRating = new Rating({ cakeId, userId, rating, review });
    await newRating.save();

    logger.info("Rating Submitted", {
      cakeId,
      userId,
      correlationId: req.correlationId,
    });
    res
      .status(201)
      .json({ message: "Rating Submitted successfully", data: newRating });
  } catch (error) {
    logger.error('Error in submiting new rating', {error: error.message, correlationId: req.correlationId});
    res.status(500).json({message: 'Internal server error in adding new rating'});
  }
});

//API to get ratings and average
app.get('/api/rating/:cakeId',async (req,res)=>{
    try{
        const {cakeId} = req.params;
        const ratings = await Rating.find({cakeId});

        let averageRating = 0;
        if(ratings.length > 0){
            const sum = ratings.reduce((acc,curr)=> acc + curr.rating, 0);
            averageRating = parseFloat((sum / ratings.length).toFixed(1));
        }

        logger.info('Rating retrieved',{cakeId, count: ratings.length, averageRating, correlationId: req.correlationId});
        res.status(200).json({
            cakeId,
            averageRating,
            totalRating: ratings.length,
            review: ratings
        });
    }catch(error){
        logger.error('Error in fetching review',{error: error.message, correlationId: req.correlationId});
        res.status(500).json({message: 'Internal Server Error'})
    }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, ()=>{
    logger.info(`Rating service is running on PORT ${PORT}`)
});
