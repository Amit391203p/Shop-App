const express = require('express');
const { body } = require('express-validator');

const authController = require('../controller/auth');
const User = require('../models/user');
const isLogged = require('../middlewares/is-logged');
const router = express.Router();

router.get('/login', isLogged, authController.getLogin);

router.get('/signup', isLogged, authController.getSignup);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please enter a valid email address'),
    body('password', 'Password must have min 5 characters')
      .trim()
      .isLength({ min: 5 }),
  ],
  authController.postLogin
);

router.post(
  '/signup',
  [
    body('name')
      .trim()
      .isLength({ min: 3 })
      .withMessage('Name must have min 5 characters'),
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email')
      .custom((value, { req }) => {
        return User.findOne({ email: value }).then((userDoc) => {
          if (userDoc) {
            return Promise.reject('Email already exists ,pick a different one');
          }
        });
      }),
    body('password', 'Password must have min 5 characters')
      .trim()
      .isLength({ min: 5 }),
    body('confirmPassword')
      .trim()
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords have to match');
        }
        return true;
      }),
  ],
  authController.postSignup
);

router.post('/logout', authController.postLogout);

router.get('/reset', isLogged, authController.getReset);

router.post('/reset', authController.postReset);

router.get('/reset/:token', isLogged, authController.getNewPassword);

router.post(
  '/new-password',
  body('password', 'Password must have min 5 characters')
    .trim()
    .isLength({ min: 5 }),
  authController.postNewPassword
);

module.exports = router;
