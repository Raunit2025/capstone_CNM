const mongoose = require('mongoose');

const cakeSchema = new mongoose.Schema({
    name:{type: String, required: true, index: true},
    description:{type: String, required: true},
    category:{type: String, required: true, index: true},
    price: {type: Number, required: true},
    availability:{type: Boolean, default: true},
    imageReference:{type: String, required: true}
},{timestamps: true});

const Cake = mongoose.model('Cake', cakeSchema);

module.exports.Cake = Cake;