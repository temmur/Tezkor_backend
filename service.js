const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');

const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const masterRoutes = require('./routes/masterRoutes');

const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI = 'mongodb+srv://ecosystuz:ecosyst.2001@cluster0.dc35z.mongodb.net/tezkorusta?retryWrites=true&w=majority&appName=Cluster0';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Функция подключения к MongoDB
const connectToMongoDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB подключен');
    } catch (error) {
        console.error('❌ Ошибка подключения к MongoDB:', error);
    }
};

// Первоначальное подключение
connectToMongoDB();

// Проверка активности MongoDB каждые 10 минут
setInterval(async () => {
    try {
        await mongoose.connection.db.collection('users').findOne();
        console.log("✅ MongoDB ping success");
    } catch (error) {
        console.error("❌ MongoDB ping failed:", error);
    }
}, 10 * 60 * 1000);

// Автопереподключение каждые 5 минут, если база отвалилась
setInterval(async () => {
    if (mongoose.connection.readyState !== 1) {
        console.log("🔄 Reconnecting to MongoDB...");
        await connectToMongoDB();
    }
}, 5 * 60 * 1000);

// Keep-alive для сервера (каждые 4 мин)
setInterval(async () => {
    try {
        await axios.get(`https://tezkor-backend.onrender.com/api/ping`);
        console.log("✅ Self-ping success");
    } catch (error) {
        console.error("❌ Self-ping failed:", error);
    }
}, 4 * 60 * 1000);

// Роут для проверки активности сервера (UptimeRobot)
app.get('/api/ping', (req, res) => {
    res.status(200).send("✅ Server is alive");
});

// Маршруты
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/masters', masterRoutes);

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});
