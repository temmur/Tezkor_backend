const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const router = express.Router();

// Регистрация пользователя
router.post('/register', async (req, res) => {
  const { chatId, name, phone, city, language } = req.body;

  // Валидация обязательных полей
  if (!chatId || !name || !language) {
    return res.status(400).json({ 
      success: false,
      message: 'Необходимо указать chatId, имя и язык пользователя'
    });
  }

  try {
    const existingUser = await User.findOne({ chatId });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Пользователь уже зарегистрирован',
        user: existingUser
      });
    }

    const newUser = new User({
      chatId,
      name,
      phone,
      city,
      language,
      registered: true,
      isSubscribed: true,
      subscribedAt: new Date()
    });

    const savedUser = await newUser.save();
    
    res.status(201).json({
      success: true,
      message: 'Пользователь успешно зарегистрирован',
      user: savedUser
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
    
    // Обработка дубликатов
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Пользователь с таким chatId уже существует'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера',
      error: error.message
    });
  }
});

// Проверка регистрации пользователя
router.get('/check/:chatId', async (req, res) => {
  try {
    const user = await User.findOne({ chatId: req.params.chatId })
      .select('-__v -createdAt -updatedAt');

    if (!user) {
      return res.status(200).json({
        success: true,
        registered: false,
        message: 'Пользователь не найден'
      });
    }

    res.status(200).json({
      success: true,
      registered: user.registered,
      user: user.toObject({ getters: true })
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при проверке пользователя',
      error: error.message
    });
  }
});

// Подписка/отписка пользователя
router.patch('/subscription/:chatId', async (req, res) => {
  try {
    const user = await User.findOne({ chatId: req.params.chatId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    // Обновление статуса подписки
    user.isSubscribed = req.body.subscribe ?? !user.isSubscribed;
    user.subscribedAt = user.isSubscribed ? new Date() : null;

    const updatedUser = await user.save();
    
    res.status(200).json({
      success: true,
      message: `Подписка ${user.isSubscribed ? 'активирована' : 'отменена'}`,
      user: updatedUser.toObject({ getters: true })
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка обновления подписки',
      error: error.message
    });
  }
});

// Статистика подписчиков
router.get('/subscribers/analytics', async (req, res) => {
  try {
    const totalSubscribers = await User.countDocuments({ isSubscribed: true });
    
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const newSubscribers = await User.countDocuments({
      isSubscribed: true,
      subscribedAt: { $gte: oneMonthAgo }
    });

    const subscriptionData = await User.aggregate([
      { $match: { isSubscribed: true } },
      {
        $group: {
          _id: { $month: "$subscribedAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalSubscribers,
        newLastMonth: newSubscribers,
        monthlyDistribution: subscriptionData
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка получения статистики',
      error: error.message
    });
  }
});

// Обновление языка пользователя
router.patch('/update-language/:chatId', async (req, res) => {
    const { chatId } = req.params;
    const { language } = req.body;
  
    // Валидация языка
    const validLanguages = ['ru', 'en', 'uz'];
    if (!validLanguages.includes(language)) {
      return res.status(400).json({
        success: false,
        message: 'Некорректный язык. Допустимые значения: ru, en, uz'
      });
    }
  
    try {
      const user = await User.findOneAndUpdate(
        { chatId: chatId },
        { $set: { language: language } },
        { new: true }
      );
  
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Пользователь не найден'
        });
      }
  
      res.status(200).json({
        success: true,
        message: 'Язык успешно обновлен',
        user: user.toObject({ getters: true })
      });
  
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Ошибка при обновлении языка',
        error: error.message
      });
    }
  });

  // Добавляем в существующий router/users.js

// Обновление имени пользователя
router.patch('/update-name/:chatId', async (req, res) => {
    const { chatId } = req.params;
    const { name } = req.body;

    // Валидация имени
    if (!name || name.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Имя не может быть пустым'
        });
    }

    try {
        const user = await User.findOneAndUpdate(
            { chatId: chatId },
            { $set: { name: name.trim() } },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Имя успешно обновлено',
            user: user.toObject({ getters: true })
        });

    } catch (error) {
        // Обработка ошибок валидации Mongoose
        if (error instanceof mongoose.Error.ValidationError) {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Ошибка валидации имени',
                errors
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Ошибка при обновлении имени',
            error: error.message
        });
    }
});
module.exports = router;