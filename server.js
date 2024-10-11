const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/transactionsDB', { useNewUrlParser: true, useUnifiedTopology: true });

// Define Transaction Schema
const transactionSchema = new mongoose.Schema({
    productTitle: String,
    productDescription: String,
    price: Number,
    category: String,
    dateOfSale: Date
});

const Transaction = mongoose.model('Transaction', transactionSchema);

// API to Initialize Database
app.post('/api/initialize', async (req, res) => {
    try {
        const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
        const transactions = response.data.map(item => ({
            productTitle: item.productTitle,
            productDescription: item.productDescription,
            price: item.price,
            category: item.category,
            dateOfSale: new Date(item.dateOfSale)
        }));
        await Transaction.insertMany(transactions);
        res.status(201).send('Database initialized with seed data.');
    } catch (error) {
        res.status(500).send('Error initializing database.');
    }
});

// List Transactions API
app.get('/api/transactions', async (req, res) => {
    const { month, search = '', page = 1, perPage = 10 } = req.query;
    const skip = (page - 1) * perPage;

    const query = {
        $expr: { $eq: [{ $month: "$dateOfSale" }, parseInt(month)] },
        $or: [
            { productTitle: { $regex: search, $options: 'i' } },
            { productDescription: { $regex: search, $options: 'i' } },
            { price: { $regex: search, $options: 'i' } }
        ]
    };

    const transactions = await Transaction.find(query).skip(skip).limit(perPage);
    const total = await Transaction.countDocuments(query);
    
    res.json({ records: transactions, total });
});

// Statistics API
app.get('/api/statistics', async (req, res) => {
    const { month } = req.query;
    const totalSoldItems = await Transaction.countDocuments({
        $expr: { $eq: [{ $month: "$dateOfSale" }, parseInt(month)] }
    });
    
    const totalNotSoldItems = await Transaction.countDocuments({
        $expr: { $eq: [{ $month: "$dateOfSale" }, parseInt(month)] },
        price: { $eq: 0 } // Assuming 0 price means not sold
    });

    const totalSaleAmount = await Transaction.aggregate([
        {
            $match: { $expr: { $eq: [{ $month: "$dateOfSale" }, parseInt(month)] } }
        },
        {
            $group: {
                _id: null,
                total: { $sum: "$price" }
            }
        }
    ]);

    res.json({
        totalSaleAmount: totalSaleAmount[0]?.total || 0,
        totalSoldItems,
        totalNotSoldItems
    });
});

// Bar Chart API
app.get('/api/bar-chart', async (req, res) => {
    const { month } = req.query;

    const priceRanges = [
        { $match: { $expr: { $eq: [{ $month: "$dateOfSale" }, parseInt(month)] } } },
        {
            $bucket: {
                groupBy: "$price",
                boundaries: [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, Infinity],
                default: "901-above",
                output: {
                    count: { $sum: 1 }
                }
            }
        }
    ];

    const result = await Transaction.aggregate(priceRanges);
    const output = {};
    result.forEach(range => {
        output[range._id] = range.count;
    });

    res.json(output);
});

// Pie Chart API
app.get('/api/pie-chart', async (req, res) => {
    const { month } = req.query;

    const categories = await Transaction.aggregate([
        {
            $match: { $expr: { $eq: [{ $month: "$dateOfSale" }, parseInt(month)] } }
        },
        {
            $group: {
                _id: "$category",
                count: { $sum: 1 }
            }
        }
    ]);

    const output = {};
    categories.forEach(category => {
        output[category._id] = category.count;
    });

    res.json(output);
});

// Combined Data API
app.get('/api/combined-data', async (req, res) => {
    const { month } = req.query;
    
    const statistics = await axios.get(`http://localhost:${PORT}/api/statistics?month=${month}`);
    const barChart = await axios.get(`http://localhost:${PORT}/api/bar-chart?month=${month}`);
    const pieChart = await axios.get(`http://localhost:${PORT}/api/pie-chart?month=${month}`);

    res.json({ statistics: statistics.data, barChart: barChart.data, pieChart: pieChart.data });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
