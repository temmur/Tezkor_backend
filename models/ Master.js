const mongoose = require('mongoose')

const masterSchema = new mongoose.Schema({
    name: {type: String, required: true},
    phone: {type: String, required: true},
    serviceType: {type: String, required: true},
    isAvailable: {type: String, default: true},
    location: {type: String, required: true},
    earnings: {
        total: {type: Number, default: 0},
        currentMonth: {type: Number, default: 0}
    }
})

module.exports = mongoose.model('Master', masterSchema)