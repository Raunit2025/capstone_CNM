const mongoose = require('mongoose');

const notificationSchema  = new mongoose.Schema({
    orderId: {type: String, required: true, index: true},
    customerEmail: {type: String, required: true},
    status: {type: String, enum: ['PENDING', 'SENT', 'FAILED'], default: 'PENDING'},
    message: {type: String}
},{timestamps: true});

module.exports = mongoose.model('Notification', notificationSchema);