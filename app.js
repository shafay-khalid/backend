const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const multer = require("multer");

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const mongoUrl = "mongodb+srv://aspirianboy7:storedata@cluster0.vhxut.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const JWT_SECRET = "hvdvay6ert72839289()aiyg8t87qt72393293883uhefiuh78ttq3ifi78272jdsds039[]]pou89ywe";

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

app.get("/", (req, res) => {
    res.send({ status: "started" });
});


app.post('/storeUser', async (req, res) => {
    const { fullName, email, uid, role } = req.body;

    // Check if the user already exists
    const existingUser  = await User.findOne({ email });
    // console.log(existingUser)
    if (existingUser ) {
        return 
    }

    try {
        // Create a new user in the database
        const newUser  = await User.create({
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

app.post('/uploadImages', upload.array('images'), (req, res) => {
    const imageUrls = req.files.map(file => `/uploads/${file.filename}`); // Adjust the path as needed
    res.send({ status: 'ok', imageUrls });
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
            description, // Store the description
            createdAt: Date.now(),
        });

        res.send({ status: 'ok', data: newItem });
    } catch (error) {
        console.error("Error storing item:", error);
        res.status(500).send({ status: 'error', data: error.message });
    }
});

app.get('/getItems', async (req, res) => {
    try {
        const items = await Item.find(); // Fetch all items from the database
        res.send(items);
    } catch (error) {
        console.error("Error fetching items:", error);
        res.status(500).send({ status: 'error', data: error.message });
    }
});

app.get('/getItem/:id', async (req, res) => {
    const { id } = req.params; // Get the ID from the request parameters
    try {
        const item = await Item.findById(id); // Use Mongoose to find the item by ID
        if (!item) {
            return res.status(404).send({ status: 'error', message: 'Item not found' });
        }
        res.send(item); // Send the item details
    } catch (error) {
        console.error("Error fetching item:", error);
        res.status(500).send({ status: 'error', message: error.message });
    }
});

// Update Item
app.put('/updateItem/:id', async (req, res) => {
    const { id } = req.params; // Get the ID from the request parameters
    const { name, buyPrice, sellingPrice, discount, showingNumber, categories } = req.body;

    try {
        const updatedItem = await Item.findByIdAndUpdate(id, {
            name,
            buyPrice,
            sellingPrice,
            discount,
            showingNumber,
            categories,
            updatedAt: Date.now() // Optionally track when the item was updated
        }, { new: true }); // Return the updated document

        if (!updatedItem) {
            return res.status(404).send({ status: 'error', message: 'Item not found' });
        }

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
            imageUrl, // Store the image URL
            createdAt: Date.now(),
        });

        res.send({ status: 'ok', data: cartItem });
    } catch (error) {
        console.error("Error adding item to cart:", error);
        res.status(500).send({ status: 'error', data: error.message });
    }
});

// Get Cart Items
app.get('/getCartItems/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const cartItems = await Cart.find({ userId }).populate('itemId'); // Populate to get item details
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
        const wishlistItems = await Wishlist.find({ userId }).populate('itemId'); // Populate to get item details
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


app.get('/getItemsByCategory/:category', async (req, res) => {
    const { category } = req.params; // Get the category from the request parameters
    try {
        const items = await Item.find({ categories: category }); // Fetch items that match the category
        res.send(items);
    } catch (error) {
        console.error("Error fetching items by category:", error);
        res.status(500).send({ status: 'error', data: error.message });
    }
});

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

app.get('/getOrders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
});

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

app.listen(5021, () => {
    console.log("App is running on port 5021");
});