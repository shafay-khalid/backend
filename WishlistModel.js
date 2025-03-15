// WishlistModel.js
const mongoose = require('mongoose');

const WishlistSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
    },
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item', // Reference to the Item model
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Wishlist = mongoose.model('Wishlist', WishlistSchema);
module.exports = Wishlist;