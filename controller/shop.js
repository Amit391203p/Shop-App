const fs = require('fs');
const path = require('path');

const PDFDocument = require('pdfkit');

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_PRIVATE_KEY);
const Product = require('../models/product');
const Order = require('../models/order');

const ITEMS_PER_PAGE = 3;

exports.getIndex = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;

  Product.countDocuments()
    .then((numProducts) => {
      totalItems = numProducts;
      return Product.find()
        .skip(ITEMS_PER_PAGE * (page - 1))
        .limit(ITEMS_PER_PAGE);
    })
    .then((products) => {
      res.render('shop/index', {
        pageTitle: 'Shop',
        prods: products,
        path: '/',
        currentPage: page,
        nextPage: page + 1,
        previousPage: page - 1,
        hasNextPage: totalItems > ITEMS_PER_PAGE * page,
        hasPreviousPage: page > 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      next(error);
    });
};

exports.getProduct = (req, res, next) => {
  prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      res.render('shop/product-detail', {
        pageTitle: product.title,
        path: '/products',
        product: product,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      next(error);
    });
};

exports.getCart = (req, res, next) => {
  let total = 0;
  req.user
    .populate('cart.items.productId')
    .then((userData) => {
      const products = userData.cart.items;

      products.forEach((p) => {
        total += p.quantity * p.productId.price;
      });
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products,
        total: total,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      next(error);
    });
};

exports.postCart = (req, res, next) => {
  productId = req.body.productId;
  Product.findById(productId)
    .then((product) => {
      return req.user.addToCart(product);
    })
    .then(() => {
      res.redirect('/cart');
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      next(error);
    });
};

exports.postUpdateCart = async (req, res, next) => {
  const productId = req.body.productId;
  const updateType = req.body.updateType;

  try {
    if (updateType === 'increaseItem') {
      await req.user.increaseItemQuantity(productId);
    } else if (updateType === 'decreaseItem') {
      await req.user.decreaseItemQuantity(productId);
    } else if (updateType === 'deleteItem') {
      await req.user.removeFromCart(productId);
    }
    res.redirect('/cart');
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    next(error);
  }
};

exports.getOrders = (req, res) => {
  Order.find({
    'user.userId': req.user._id,
  })
    .sort({ createdAt: -1 })
    .then((orders) => {
      res.render('shop/orders', {
        pageTitle: 'Orders',
        path: '/orders',
        orders: orders,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      next(error);
    });
};

exports.getCheckout = async (req, res, next) => {
  try {
    let products;
    let total = 0;
    const userData = await req.user.populate('cart.items.productId');

    products = userData.cart.items;
    products.forEach((p) => {
      total += p.quantity * p.productId.price;
    });
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: products.map((p) => {
        return {
          price_data: {
            currency: 'inr',
            unit_amount: p.productId.price * 100,
            product_data: {
              name: p.productId.title,
            },
          },
          quantity: p.quantity,
        };
      }),
      customer_email: req.user.email,
      success_url: req.protocol + '://' + req.get('host') + '/checkout/success',
      cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel',
    });

    res.render('shop/checkout', {
      path: '/checkout',
      pageTitle: 'Checkout',
      products: products,
      sessionId: session.id,
      totalSum: total,
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    next(error);
  }
};

exports.getCheckoutSuccess = (req, res, next) => {
  let totalAmount = 0;
  req.user
    .populate('cart.items.productId')
    .then((userData) => {
      const products = userData.cart.items.map((i) => {
        const product = { ...i.productId._doc };
        totalAmount += product.price * i.quantity;
        return {
          quantity: i.quantity,
          product: product,
        };
      });
      const user = {
        email: req.user.email,
        userId: req.user,
      };
      const order = new Order({
        totalAmount: totalAmount.toFixed(2),
        products: products,
        user: user,
      });
      return order.save();
    })
    .then(() => {
      req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      next(error);
    });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
  Order.findById(orderId).then((order) => {
    if (!order) {
      return next(new Error('No order found'));
    }
    if (order.user.userId.toString() !== req.user._id.toString()) {
      return next(new Error('Unauthorized'));
    }
    const invoiceName = 'invoice-' + orderId + '.pdf';
    const invoicePath = path.join('data', 'invoices', invoiceName);

    const pdfDoc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'inline; filename="' + invoiceName + '"'
    );
    pdfDoc.pipe(fs.createWriteStream(invoicePath));
    pdfDoc.pipe(res);

    pdfDoc.fontSize(26).text('Invoice', {
      underline: true,
    });
    pdfDoc.text('------------------------------------');

    pdfDoc.fontSize(17).text('Name : ' + req.user.name);
    pdfDoc.fontSize(17).text('Email : ' + req.user.email);
    pdfDoc.text('------------------------------------');
    let totalPrice = 0;
    order.products.forEach((prod) => {
      totalPrice += prod.quantity * prod.product.price;
      pdfDoc
        .fontSize(14)
        .text(
          prod.product.title +
            ' - ' +
            prod.quantity +
            ' x ' +
            prod.product.price
        );
    });
    pdfDoc.text('------------------------------------');
    pdfDoc.fontSize(20).text('Total Price: ' + totalPrice);

    pdfDoc.end();
  });
};
