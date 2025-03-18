const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const redis = require('redis');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(cors());
 app.use(express.json());
app.use('/uploads', express.static('uploads'));

const mongoUrl = "mongodb+srv://aspirianboy7:storedata@cluster0.vhxut.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const JWT_SECRET = "hvdvay6ert72839289()aiyg8t87qt72393293883uhefiuh78ttq3ifi78272jdsds039[]]pou89ywe";
const port = process.env.PORT || 5021;

mongoose.connect(mongoUrl)
    .then(() => console.log("Database connected"))
    .catch((e) => console.log(e));

const User = require('./AuthModel');
const Item = require('./ItemModel'); 
const Cart = require('./CartModel');
const Wishlist = require('./WishlistModel');
const Order = require('./OrderModel');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

// Redis client create karen
const redisClient = redis.createClient({
    host: 'localhost',  // Redis server ka host
    port: 6379,        // Default Redis port
});

// Redis client ka connection check karen
redisClient.on('connect', () => {
    console.log('Connected to Redis...');
});

redisClient.on('error', (err) => {
    console.log('Redis error: ', err);
});

// Caching Middleware
const cache = (req, res, next) => {
    const { userId, category } = req.params;
    const cacheKey = userId ? userId : category;

    redisClient.get(cacheKey, (err, data) => {
        if (err) {
            console.log(err);
            return next();
        }

        if (data != null) {
            return res.json(JSON.parse(data));
        }

        next();
    });
};

app.get("/", (req, res) => {
    res.send({ status: "started" });
});

app.post('/storeUser ', async (req, res) => {
    const { fullName, email, uid, role } = req.body;

    const existingUser   = await User.findOne({ email });
    if (existingUser ) {
        return res.status(400).send({ status: 'error', message: 'User  already exists' });
    }

    try {
        const newUser   = await User.create({
            name: fullName,
            email,
            uid,
            role,
            createdAt: Date.now(),
        });

        res.send({ status: 'ok', data: newUser  });
    } catch (error) {
        console.error("Error storing user:", error);
        res.status(500).send({ status: 'error', data: error.message });
    }
});

// Update the uploadImages route
app.post('/uploadImages', upload.array('images'), async (req, res) => {
    try {
        const imageUrls = [];

        // Process each uploaded file
        for (const file of req.files) {
            const outputFilePath = `./uploads/compressed-${file.filename}`; // Define the output path for the compressed image
            const ext = path.extname(file.originalname).toLowerCase(); // Get the file extension

            // Use sharp to compress and save the image
            const image = sharp(file.path).resize(800); // Resize to a width of 800 pixels (maintaining aspect ratio)

            if (ext === '.jpeg' || ext === '.jpg') {
                await image.jpeg({ quality: 80 }).toFile(outputFilePath); // Compress to JPEG
            } else if (ext === '.png') {
                await image.png({ quality: 80 }).toFile(outputFilePath); // Compress to PNG
            } else if (ext === '.webp') {
                await image.webp({ quality: 80 }).toFile(outputFilePath); // Compress to WebP
            } else if (ext === '.avif') {
                await image.avif({ quality: 80 }).toFile(outputFilePath); // Compress to AVIF
            } else {
                // Handle unsupported formats
                throw new Error(`Unsupported file format: ${ext}`);
            }

            // Push the URL of the compressed image to the array
            imageUrls.push(`/uploads/compressed-${file.filename}`);

            // Delete the original uploaded file
            fs.unlinkSync(file.path);
        }

        res.send({ status: 'ok', imageUrls });
    } catch (error) {
        console.error("Error uploading images:", error);
        res.status(500).send({ status: 'error', message: 'Failed to upload images' });
    }
});

app.post('/storeItem', async (req, res) => {
    const { name, buyPrice, sellingPrice, discount, showingNumber, categories, id, imageUrls, colors, description } = req.body;

    try {
        const newItem = await Item.create({
            name,
            buyPrice,
            sellingPrice,
            discount,
            showingNumber,
            categories,
            imageUrls,
            colors,
            description,
            createdAt: Date.now(),
        });

        res.send({ status: 'ok', data: newItem });
    } catch (error) {
        console.error("Error storing item:", error);
        res.status(500).send({ status: 'error', data: error.message });
    }
});

// Get Items with caching
app.get('/getItems', cache, async (req, res) => {
    try {
        const items = await Item.find(); // Fetch all items from the database
        redisClient.setex('allItems', 3600, JSON.stringify(items)); // Cache for 1 hour
        res.send(items);
    } catch (error) {
        console.error("Error fetching items:", error);
        res.status(500).send({ status: 'error', data: error.message });
    }
});

app.get('/getItem/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const item = await Item.findById(id);
        if (!item) {
            return res.status(404).send({ status: 'error', message: 'Item not found' });
        }
        res.send(item);
    } catch (error) {
        console.error("Error fetching item:", error);
        res.status(500).send({ status: 'error', message: error.message });
    }
});

// Update Item
app.put('/updateItem/:id', async (req, res) => {
    const { id } = req.params;
    const { name, buyPrice, sellingPrice, discount, showingNumber, categories } = req.body;

    try {
        const updatedItem = await Item.findByIdAndUpdate(id, {
            name,
            buyPrice,
            sellingPrice,
            discount,
            showingNumber,
            categories,
            updatedAt: Date.now()
        }, { new: true });

        if (!updatedItem) {
            return res.status(404).send({ status: 'error', message: 'Item not found' });
        }

        // Clear cache for categories
        categories.forEach((category) => {
            redisClient.del(category);
        });

        res.send({ status: 'ok', data: updatedItem });
    } catch (error) {
        console.error("Error updating item:", error);
        res.status(500).send({ status: 'error', message: error.message });
    }
});

// Add to Cart
app.post('/addToCart', async (req, res) => {
    const { itemId, quantity, totalPrice, profit, userId, selectedColor, imageUrl } = req.body;

    try {
        const cartItem = await Cart.create({
            itemId,
            quantity,
            totalPrice,
            profit,
            userId,
            selectedColor,
            imageUrl,
            createdAt: Date.now(),
        });

        res.send({ status: 'ok', data: cartItem });
    } catch (error) {
        console.error("Error adding item to cart:", error);
        res.status(500).send({ status: 'error', data: error.message });
    }
});

// Get Cart Items with caching
app.get('/getCartItems/:userId', cache, async (req, res) => {
    const { userId } = req.params;
    try {
        const cartItems = await Cart.find({ userId }).populate('itemId');
        redisClient.setex(userId, 3600, JSON.stringify(cartItems)); // Cache for 1 hour
        res.send(cartItems);
    } catch (error) {
        console.error("Error fetching cart items:", error);
        res.status(500).send({ status: 'error', message: error.message });
    }
});

// Update Cart Item
app.put('/updateCartItem/:itemId', async (req, res) => {
    const { itemId } = req.params;
    const { quantity } = req.body;

    try {
        const updatedCartItem = await Cart.findByIdAndUpdate(itemId, { quantity }, { new: true });
        res.send({ status: 'ok', data: updatedCartItem });
    } catch (error) {
        console.error("Error updating cart item:", error);
        res.status(500).send({ status: 'error', message: error.message });
    }
});

// Remove Item from Cart
app.delete('/removeFromCart/:itemId', async (req, res) => {
    const { itemId } = req.params;
    try {
        await Cart.deleteOne({ _id: itemId });
        res.send({ status: 'ok', message: 'Item removed from cart' });
    } catch (error) {
        console.error("Error removing item from cart:", error);
        res.status(500).send({ status: 'error', message: error.message });
    }
});

// Add to Wishlist
app.post('/addToWishlist', async (req, res) => {
    const { itemId, userId } = req.body;

    try {
        const wishlistItem = await Wishlist.create({
            itemId,
            userId,
            createdAt: Date.now(),
        });

        res.send({ status: 'ok', data: wishlistItem });
    } catch (error) {
        console.error("Error adding item to wishlist:", error);
        res.status(500).send({ status: 'error', data: error.message });
    }
});

// Get Wishlist Items
app.get('/getWishlistItems/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const wishlistItems = await Wishlist.find({ userId }).populate('itemId');
        res.send(wishlistItems);
    } catch (error) {
        console.error("Error fetching wishlist items:", error);
        res.status(500).send({ status: 'error', message: error.message });
    }
});

// Remove Item from Wishlist
app.delete('/removeFromWishlist/:itemId', async (req, res) => {
    const { itemId } = req.params;
    try {
        await Wishlist.deleteOne({ itemId });
        res.send({ status: 'ok', message: 'Item removed from wishlist' });
    } catch (error) {
        console.error("Error removing item from wishlist:", error);
        res.status(500).send({ status: 'error', message: error.message });
    }
});

// Get Items by Category with caching
app.get('/getItemsByCategory/:category', cache, async (req, res) => {
    const { category } = req.params;
    try {
        const items = await Item.find({ categories: category });
        redisClient.setex(category, 3600, JSON.stringify(items)); // Cache for 1 hour
        res.send(items);
    } catch (error) {
        console.error("Error fetching items by category:", error);
        res.status(500).send({ status: 'error', data: error.message });
    }
});

// Store Order
app.post('/storeOrder', async (req, res) => {
    const { userId, items, userDetails } = req.body;

    try {
        const newOrder = await Order.create({
            userId,
            items,
            userDetails,
            createdAt: Date.now(),
        });

        res.send({ status: 'ok', data: newOrder });
    } catch (error) {
        console.error("Error storing order:", error);
        res.status(500).send({ status: 'error', message: error.message });
    }
});

// Get Orders
app.get('/getOrders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
});

// Delete Order
app.delete('/deleteOrder/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Order.findByIdAndDelete(id);
        res.json({ message: "Order deleted successfully!" });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ message: 'Failed to delete order' });
    }
});

// Delete Item
app.delete('/deleteItem/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await Item.findByIdAndDelete(id);
        res.send({ status: 'ok', message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).send({ status: 'error', message: 'Failed to delete item' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});