const { text } = require('body-parser');
const { type } = require('express/lib/response');
const mongoose = require('mongoose');
const { ref } = require('vue');

const orderSchema = new mongoose.Schema({
  chatId: { type: Number, required: true },
  serviceType: { type: String, required: true }, // Сантехника, Электрика, Сварщик
  problemDescription: { type: String },
  location: { type: mongoose.Schema.Types.Mixed, required: true }, 
  time: { type: String, required: true }, // Время или "Срочно"
  status: { type: String, default: 'pending' }, // Статус заказа
  createdAt: { type: Date, default: Date.now },
  number: {type: String},
  name: {type: String},
  address: {type: Object},
  masterId: {type:  mongoose.Schema.Types.ObjectId, ref: 'Master'},
  price: {type: Number},
  isPaid: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('Order', orderSchema);