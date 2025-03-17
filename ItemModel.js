const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    buyPrice: { type: Number, required: true },
    sellingPrice: { type: Number, required: true },
    discount: { type: Number, required: true }, // Add this line
    showingNumber: { type: Number, required: true }, // Add this line
    categories: { type: [String], required: true },
    imageUrls: { type: [String], required: true },
    colors: { type: [String], required: true }, // Add this line
    description: { type: String},
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Item', itemSchema);