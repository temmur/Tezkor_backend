const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  chatId: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String },
  city: { type: Object },
  language: {type: String},
  registered: { type: Boolean, default: false },
  isSubscribed: { type: Boolean, default: false }, // Подписан ли пользователь
  subscribedAt: { type: Date }, // Дата подписки
});

module.exports = mongoose.model('User', userSchema);