const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Master = require('../models/ Master')
const router = express.Router();



// Создание заказа
router.post('/create', async (req, res) => {
    const { chatId, serviceType, problemDescription, location, time, name, number, address, price } = req.body;
  
    // Валидация обязательных полей
    if (!chatId || !serviceType || !location || !time) {
      return res.status(400).json({ 
        success: false,
        message: 'Необходимо указать chatId, тип услуги, локацию и время'
      });
    }
  
    try {
      const order = new Order({ 
        chatId, 
        serviceType, 
        problemDescription, 
        location, 
        time, 
        name, 
        number, 
        address,
        price
      });
  
      const savedOrder = await order.save();
  
      res.status(201).json({
        success: true,
        message: 'Заказ успешно создан',
        data: savedOrder
      });
  
    } catch (error) {
      // Обработка ошибок валидации Mongoose
      if (error instanceof mongoose.Error.ValidationError) {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: 'Ошибка валидации',
          errors
        });
      }
  
      res.status(500).json({
        success: false,
        message: 'Ошибка сервера',
        error: error.message
      });
    }
  });
  
  // Получение всех заказов пользователя
  router.get('/user/:chatId', async (req, res) => {
    try {
      const orders = await Order.find({ chatId: req.params.chatId })
        .populate('masterId', 'name phone')
        .select('-__v -updatedAt');
  
      res.status(200).json({
        success: true,
        data: orders
      });
  
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Ошибка при получении заказов',
        error: error.message
      });
    }
  });
  
  // Получение всех заказов
  router.get('/all', async (req, res) => {
    try {
      const orders = await Order.find()
        .populate('masterId', 'name phone')
        .sort({ createdAt: -1 })
        .select('-__v');
  
      res.status(200).json({
        success: true,
        data: orders
      });
  
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Ошибка при получении заказов',
        error: error.message
      });
    }
  });
  
  // Обновление заказа
  router.put('/:orderId', async (req, res) => {
    const { orderId } = req.params;
    const { status, masterId, price } = req.body;
  
    // Валидация ID
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Некорректный ID заказа'
      });
    }
  
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Заказ не найден'
        });
      }
  
      // Логика обновления статуса
      if (status) {
        // Освобождение мастера при завершении
        if (status === 'done' && order.masterId) {
          const master = await Master.findById(order.masterId);
          if (master) {
            master.isAvailable = true; // Set the master's availability to true
            if (order.price) {
              master.earnings.total += order.price; // Увеличиваем общий заработок
              master.earnings.currentMonth += order.price; // Увеличиваем заработок за текущий месяц
            }
            await master.save();
          }
        }
        order.status = status;
      }
  
      // Логика обновления мастера
      if (masterId) {
        const newMaster = await Master.findById(masterId);
        if (!newMaster) {
          return res.status(404).json({
            success: false,
            message: 'Мастер не найден'
          });
        }
  
        // Освобождение старого мастера
        if (order.masterId && order.masterId.toString() !== masterId) {
          const oldMaster = await Master.findById(order.masterId);
          if (oldMaster) {
            oldMaster.isAvailable = true;
            await oldMaster.save();
          }
        }
  
        // Проверка доступности нового мастера
        if (!newMaster.isAvailable) {
          return res.status(400).json({
            success: false,
            message: 'Мастер уже занят'
          });
        }
  
        newMaster.isAvailable = false;
        await newMaster.save();
        order.masterId = masterId;
      }
  
      // Обновление цены
      if (typeof price !== 'undefined') {
        order.price = Number(price);
      }
  
      const updatedOrder = await order.save();
  
      res.status(200).json({
        success: true,
        message: 'Заказ успешно обновлен',
        data: updatedOrder
      });
  
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Ошибка при обновлении заказа',
        error: error.message
      });
    }
  });
  router.put('/:orderId/pay', async (req, res) => {
    const { orderId } = req.params;
    const { isPaid } = req.body;
  
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Заказ не найден' });
      }
  
      // Проверяем, что заказ завершен
      if (order.status !== 'done') {
        return res.status(400).json({ message: 'Заказ еще не завершен' });
      }
  
      // Проверяем, что заказ имеет цену
      if (!order.price) {
        return res.status(400).json({ message: 'Цена заказа не указана' });
      }
  
      // Проверяем, что статус isPaid изменился
      if (order.isPaid === isPaid) {
        return res.status(400).json({
          success: false,
          message: `Выплата уже ${order.isPaid ? 'произведена' : 'отменена'}`
        });
      }
  
      // Обновляем заработок мастера
      if (order.masterId) {
        const master = await Master.findById(order.masterId);
        if (master) {
          if (isPaid) {
            // Если заказ теперь выплачен, добавляем сумму в earnings
            master.earnings.total += order.price;
            master.earnings.currentMonth += order.price;
          } else {
            // Если заказ теперь не выплачен, вычитаем сумму из earnings
            master.earnings.total -= order.price;
            master.earnings.currentMonth -= order.price;
          }
          await master.save();
        }
      }
  
      // Меняем статус isPaid
      order.isPaid = isPaid;
      await order.save();
  
      res.status(200).json({ 
        success: true,
        message: `Выплата ${order.isPaid ? 'произведена' : 'отменена'}`,
        data: order 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        message: 'Ошибка сервера', 
        error: error.message 
      });
    }
  });
// Отметка о выплате
// router.put('/:orderId/pay', async (req, res) => {
//     const { orderId } = req.params;
//     const { isPaid } = req.body;
  
//     try {
//       const order = await Order.findById(orderId);
//       if (!order) {
//         return res.status(404).json({ message: 'Заказ не найден' });
//       }
  
//       // Проверяем, что заказ завершен
//       if (order.status !== 'done') {
//         return res.status(400).json({ message: 'Заказ еще не завершен' });
//       }
  
//       // Проверяем, что заказ имеет цену
//       if (!order.price) {
//         return res.status(400).json({ message: 'Цена заказа не указана' });
//       }
  
//       // Проверяем, что статус isPaid изменился
//       if (order.isPaid === isPaid) {
//         return res.status(400).json({
//           success: false,
//           message: `Выплата уже ${order.isPaid ? 'произведена' : 'отменена'}`
//         });
//       }
  
//       // Обновляем заработок мастера
//       if (order.masterId) {
//         const master = await Master.findById(order.masterId);
//         if (master) {
//           if (isPaid) {
//             // Если заказ теперь выплачен, добавляем сумму в earnings
//             master.earnings.total += order.price;
//             master.earnings.currentMonth += order.price;
//           } else {
//             // Если заказ теперь не выплачен, вычитаем сумму из earnings
//             master.earnings.total -= order.price;
//             master.earnings.currentMonth -= order.price;
//           }
//           await master.save();
//         }
//       }
  
//       // Меняем статус isPaid
//       order.isPaid = isPaid;
//       await order.save();
  
//       res.status(200).json({ 
//         success: true,
//         message: `Выплата ${order.isPaid ? 'произведена' : 'отменена'}`,
//         data: order 
//       });
//     } catch (error) {
//       res.status(500).json({ 
//         success: false,
//         message: 'Ошибка сервера', 
//         error: error.message 
//       });
//     }
//   });



// // Создание заказа
// router.post('/create', async (req, res) => {
//   const { chatId, serviceType, problemDescription, location, time, name, number, address, price } = req.body;

//   // Валидация обязательных полей
//   if (!chatId || !serviceType || !location || !time) {
//     return res.status(400).json({ 
//       success: false,
//       message: 'Необходимо указать chatId, тип услуги, локацию и время'
//     });
//   }

//   try {
//     const order = new Order({ 
//       chatId, 
//       serviceType, 
//       problemDescription, 
//       location, 
//       time, 
//       name, 
//       number, 
//       address,
//       price
//     });

//     const savedOrder = await order.save();

//     res.status(201).json({
//       success: true,
//       message: 'Заказ успешно создан',
//       order: savedOrder
//     });

//   } catch (error) {
//     // Обработка ошибок валидации Mongoose
//     if (error instanceof mongoose.Error.ValidationError) {
//       const errors = Object.values(error.errors).map(err => err.message);
//       return res.status(400).json({
//         success: false,
//         message: 'Ошибка валидации',
//         errors
//       });
//     }

//     res.status(500).json({
//       success: false,
//       message: 'Ошибка сервера',
//       error: error.message
//     });
//   }
// });

// // Получение всех заказов пользователя
// router.get('/user/:chatId', async (req, res) => {
//   try {
//     const orders = await Order.find({ chatId: req.params.chatId })
//       .populate('masterId', 'name phone') // Добавлено populate для мастера
//       .select('-__v -updatedAt'); // Исключаем ненужные поля

//     res.status(200).json({
//       success: true,
//       data: orders
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Ошибка при получении заказов',
//       error: error.message
//     });
//   }
// });

// // Получение всех заказов
// router.get('/all', async (req, res) => {
//   try {
//     const orders = await Order.find()
//       .populate('masterId', 'name phone') // Добавлено populate для мастера
//       .sort({ createdAt: -1 }) // Сортировка по дате создания
//       .select('-__v'); // Исключаем ненужные поля

//     res.status(200).json({
//       success: true,
//       data: orders
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Ошибка при получении заказов',
//       error: error.message
//     });
//   }
// });

// // Обновление заказа
// router.put('/:orderId', async (req, res) => {
//   const { orderId } = req.params;
//   const { status, masterId, price } = req.body;

//   // Валидация ID
//   if (!mongoose.Types.ObjectId.isValid(orderId)) {
//     return res.status(400).json({ 
//       success: false,
//       message: 'Некорректный ID заказа'
//     });
//   }

//   try {
//     const order = await Order.findById(orderId);
//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         message: 'Заказ не найден'
//       });
//     }

//     // Логика обновления статуса
//     if (status) {
//       // Освобождение мастера при завершении
//       if (status === 'done' && order.masterId) {
//         const master = await Master.findById(order.masterId);
//         if (master) {
//           master.isAvailable = true;
//           await master.save();
//         }
//       }
//       order.status = status;
//     }

//     if (typeof price !== 'undefined') {
//         order.price = Number(price);
//       }
//     // Логика обновления мастера
//     if (masterId) {
//       // Валидация нового мастера
//       const newMaster = await Master.findById(masterId);
//       if (!newMaster) {
//         return res.status(404).json({
//           success: false,
//           message: 'Мастер не найден'
//         });
//       }

//       // Освобождение старого мастера
//       if (order.masterId && order.masterId.toString() !== masterId) {
//         const oldMaster = await Master.findById(order.masterId);
//         if (oldMaster) {
//           oldMaster.isAvailable = true;
//           await oldMaster.save();
//         }
//       }

//       // Проверка доступности нового мастера
//       if (!newMaster.isAvailable) {
//         return res.status(400).json({
//           success: false,
//           message: 'Мастер уже занят'
//         });
//       }

//       newMaster.isAvailable = false;
//       await newMaster.save();
//       order.masterId = masterId;
//     }

//     // Проверка наличия изменений
//     if (!status && !masterId) {
//       return res.status(400).json({
//         success: false,
//         message: 'Нет данных для обновления'
//       });
//     }

//     const updatedOrder = await order.save();

//     res.status(200).json({
//       success: true,
//       message: 'Заказ успешно обновлен',
//       data: updatedOrder
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Ошибка при обновлении заказа',
//       error: error.message
//     });
//   }
// });

// // routes/orderRoutes.js
// router.put('/:orderId/pay', async (req, res) => {
//     const { orderId } = req.params;
  
//     try {
//       const order = await Order.findById(orderId);
//       if (!order) {
//         return res.status(404).json({ message: 'Заказ не найден' });
//       }
  
//       // Проверяем, что заказ завершен
//       if (order.status !== 'done') {
//         return res.status(400).json({ message: 'Заказ еще не завершен' });
//       }
  
//       // Проверяем, что выплата еще не произведена
//       if (order.isPaid) {
//         return res.status(400).json({ message: 'Выплата уже произведена' });
//       }
  
//       // Обновляем заработок мастера
//       if (order.masterId && order.price) {
//         const master = await Master.findById(order.masterId);
//         if (master) {
//           master.earnings.total -= order.price; // Уменьшаем общий заработок
//           master.earnings.currentMonth -= order.price; // Уменьшаем заработок за текущий месяц
//           await master.save();
//         }
//       }
  
//       // Отмечаем заказ как выплаченный
//       order.isPaid = true;
//       await order.save();
  
//       res.status(200).json({ message: 'Выплата успешно произведена', order });
//     } catch (error) {
//       res.status(500).json({ message: 'Ошибка сервера', error });
//     }
//   });

module.exports = router;


// // Создание заказа
// router.post('/create', async (req, res) => {
//   const { chatId, serviceType, problemDescription, location, time, name, number, address } = req.body;

//   try {
//     const order = new Order({ chatId, serviceType, problemDescription, location, time, name, number, address });
//     await order.save();

//     res.status(201).json({ message: 'Заказ успешно создан', order });
//   } catch (error) {
//     res.status(500).json({ message: 'Ошибка сервера', error });
//   }
// });

// // Получение всех заказов пользователя
// router.get('/user/:chatId', async (req, res) => {
//   const { chatId } = req.params;
//   try {
//     const orders = await Order.find({ chatId });
//     res.status(200).json({ orders });
//   } catch (error) {
//     res.status(500).json({ message: 'Ошибка сервера', error });
//   }
// });

// // Получение всех заказов
// router.get('/all', async (req, res)=> {
//     try{
//         const orders = await Order.find();  // Находим все заказы
//         res.status(200).json({orders})
//     }catch(error){
//         res.status(500).json({message: 'Ошибка сервера', error })
//     }
// })


// // Получение заказа по ID
// router.get('/:orderId', async (req, res) => {
//     const { orderId } = req.params;
  
//     try {
//       const order = await Order.findById(orderId).populate('masterId'); // Добавляем информацию о мастере
//       if (!order) {
//         return res.status(404).json({ message: 'Заказ не найден' });
//       }
//       res.status(200).json({ order });
//     } catch (error) {
//       res.status(500).json({ message: 'Ошибка сервера', error });
//     }
//   });

//   // Обновление заказа по chatId
// // router.put('/chat/:chatId', async (req, res) => {
// //     const { chatId } = req.params;
// //     const { status, masterId } = req.body;
  
// //     try {
// //       // Находим заказ по chatId
// //       const order = await Order.findOne({ chatId });
  
// //       if (!order) {
// //         return res.status(404).json({ message: 'Заказ не найден' });
// //       }
  
// //       // Обновляем поля, если они переданы
// //       if (status) order.status = status;
// //       if (masterId) order.masterId = masterId;
  
// //       // Сохраняем изменения
// //       await order.save();
  
// //       // Возвращаем обновленный заказ
// //       res.status(200).json({ message: 'Заказ успешно обновлен', order });
// //     } catch (error) {
// //       res.status(500).json({ message: 'Ошибка сервера', error });
// //     }
// //   });

// router.put('/:orderId', async (req, res) => {
//     const { orderId } = req.params;
//     const { status, masterId } = req.body;
  
//     try {
//       // Находим заказ
//       const order = await Order.findById(orderId);
//       if (!order) {
//         return res.status(404).json({ message: 'Заказ не найден' });
//       }
  
//       // Если меняется статус на "завершен", освобождаем мастера
//       if (status === 'done' && order.masterId) {
//         const master = await Master.findById(order.masterId);
//         if (master) {
//           master.isAvailable = true;
//           await master.save();
//         }
//       }
  
//       // Если прикрепляется новый мастер, делаем его недоступным
//       if (masterId && masterId !== order.masterId) {
//         const newMaster = await Master.findById(masterId);
//         if (newMaster) {
//           newMaster.isAvailable = false;
//           await newMaster.save();
//         }
  
//         // Если был прикреплен другой мастер, освобождаем его
//         if (order.masterId) {
//           const oldMaster = await Master.findById(order.masterId);
//           if (oldMaster) {
//             oldMaster.isAvailable = true;
//             await oldMaster.save();
//           }
//         }
//       }
  
//       // Обновляем заказ
//       if (status) order.status = status;
//       if (masterId) order.masterId = masterId;
  
//       await order.save();
  
//       res.status(200).json({ message: 'Заказ успешно обновлен', order });
//     } catch (error) {
//       res.status(500).json({ message: 'Ошибка сервера', error });
//     }
//   });



// // router.put('/:orderId', async (req, res) => {
// //     try {
// //       const order = await Order.findById(req.params.orderId);
// //       if (!order) return res.status(404).send();
  
// //       // Сохраняем предыдущего мастера
// //       const previousMasterId = order.masterId;
  
// //       // Обновляем данные
// //       if (req.body.status) order.status = req.body.status;
// //       if (req.body.masterId) order.masterId = req.body.masterId;
  
      
// //       // Обработка изменений мастера
// //       if (previousMasterId && previousMasterId !== order.masterId) {
// //         const oldMaster = await Master.findById(previousMasterId);
// //         if (oldMaster) {
// //           oldMaster.isAvailable = true;
// //           await oldMaster.save();
// //         }
// //       }
  
// //       if (order.masterId && order.masterId !== previousMasterId) {
// //         const newMaster = await Master.findById(order.masterId);
// //         if (newMaster) {
// //           newMaster.isAvailable = false;
// //           await newMaster.save();
// //         }
// //       }
  
// //       await order.save();
// //       res.json(order);
      
// //     } catch (error) {
// //       res.status(400).send(error);
// //     }
// //   });
// module.exports = router;