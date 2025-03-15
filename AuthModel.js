// AuthModel.js
const mongoose = require('mongoose');

// Define the schema for 'User '
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    uid: { type: String, required: true, unique: true }, // Unique identifier for the user
    role: { type: String, default: 'buyer' }, // Default role is 'buyer'
    createdAt: { type: Date, default: Date.now }, // Automatically set the creation date
});

// Register the schema with mongoose
const User = mongoose.model('User ', userSchema);

module.exports = User; // Export the model