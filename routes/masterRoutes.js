const express = require('express')
const Master = require('../models/ Master')
const router = express.Router()

// Создание мастера
router.post('/create', async(req, res)=> {
    const {name, phone, serviceType, location} = req.body

    try{
        const master = new Master({ name, phone, serviceType, location });
        await master.save();
        res.status(201).json({ message: 'Мастер успешно создан', master });
    }catch (error) {
        res.status(500).json({ message: 'Ошибка сервера', error });
      }
})

// Получение всех мастеров
router.get('/all', async (req, res) => {
    try {
      const masters = await Master.find();
      res.status(200).json({ masters });
    } catch (error) {
      res.status(500).json({ message: 'Ошибка сервера', error });
    }
  });


  // Получение доступных мастеров по типу услуги
router.get('/available/:serviceType', async (req, res) => {
    const { serviceType } = req.params;
  
    try {
      const masters = await Master.find({ serviceType, isAvailable: true });
      res.status(200).json({ masters });
    } catch (error) {
      res.status(500).json({ message: 'Ошибка сервера', error });
    }
  });


  // Прикрепление мастера к заказу
router.put('/assign/:orderId', async (req, res) => {
    const { orderId } = req.params;
    const { masterId } = req.body;
  
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Заказ не найден' });
      }
  
      const master = await Master.findById(masterId);
      if (!master) {
        return res.status(404).json({ message: 'Мастер не найден' });
      }
  
      order.masterId = masterId;
      master.isAvailable = false; // Делаем мастера недоступным
      await order.save();
      await master.save();
  
      res.status(200).json({ message: 'Мастер успешно прикреплен к заказу', order });
    } catch (error) {
      res.status(500).json({ message: 'Ошибка сервера', error });
    }
  });
  
  module.exports = router;