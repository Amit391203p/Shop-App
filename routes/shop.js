const express = require('express');

const shopController = require('../controller/shop');
const isAuth = require('../middlewares/is-auth');

const router = express.Router();

router.get('/', shopController.getIndex);

router.get('/products/:productId', shopController.getProduct);

router.get('/cart', isAuth, shopController.getCart);

router.post('/cart', isAuth, shopController.postCart);

router.post('/update-cart', isAuth, shopController.postUpdateCart);

router.get(
  '/checkout',
  isAuth,
  (req, res, next) => {
    next();
  },
  shopController.getCheckout
);

router.get('/checkout/success', shopController.getCheckoutSuccess);

router.get('/checkout/cancel', shopController.getCheckout);

router.get('/orders', isAuth, shopController.getOrders);

router.get('/orders/:orderId', isAuth, shopController.getInvoice);

module.exports = router;
