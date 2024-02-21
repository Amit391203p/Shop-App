const express = require('express');
const { body } = require('express-validator');

const adminController = require('../controller/admin');
const isAuth = require('../middlewares/is-auth');

const router = express.Router();

router.get('/add-product', isAuth, adminController.getAddProduct);

router.post(
  '/add-product',
  [
    body('title').trim().isString().isLength({ min: 3 }),
    body('price').isFloat({ min: 1 }),
    body('description').trim().isLength({ min: 5, max: 500 }),
  ],
  isAuth,
  adminController.postAddProduct
);

router.get('/products', isAuth, adminController.getProducts);

router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

router.post(
  '/edit-product',
  [
    body('title').isString().isLength({ min: 3 }).trim(),
    body('price').isFloat({ min: 1 }),
    body('description').isLength({ min: 5, max: 500 }).trim(),
  ],
  isAuth,
  adminController.postEditProduct
);

router.delete('/product/:productId', isAuth, adminController.deleteProduct);

module.exports = router;
