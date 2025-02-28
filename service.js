const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const masterRoutes = require('./routes/masterRoutes');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Подключение к MongoDB
mongoose.connect('mongodb+srv://ecosystuz:ecosyst.2001@cluster0.dc35z.mongodb.net/tezkorusta?retryWrites=true&w=majority&appName=Cluster0' , {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB подключен'))
  .catch((err) => console.error('Ошибка подключения к MongoDB:', err));

  setInterval(async () => {
    try {
        const result = await mongoose.connection.db.admin().ping();
        console.log("MongoDB ping:", result);
    } catch (error) {
        console.error("MongoDB ping failed:", error);
    }
}, 10 * 60 * 1000); // Пинг каждые 10 минут


// Маршруты
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);

// Подключение маршрутов
app.use('/api/masters', masterRoutes);

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});

