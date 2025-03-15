const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
    },
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item', // Reference to the Item model
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        default: 1,
    },
    totalPrice: {
        type: Number,
        required: true,
    },
    profit: {
        type: Number,
        required: true,
    },
    selectedColor: {
        type: String,
        required: true,
    },
    imageUrl: { // Add this line to store the image URL
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Cart = mongoose.model('Cart', CartSchema);
module.exports = Cart;