const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    items: { type: Array, required: true }, // Store cart items
    userDetails: { type: Object, required: true }, // Store user details
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Order', orderSchema);