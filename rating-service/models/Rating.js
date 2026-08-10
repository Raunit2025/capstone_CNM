const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
    cakeId: {type: String, required: true, index: true},
    userId: {type: String, required: true},
    rating: {type: Number, required: true, min: 1, max: 5},
    review: {type: String}
}, {timestamps: true});

module.exports = mongoose.model('Rating', ratingSchema);