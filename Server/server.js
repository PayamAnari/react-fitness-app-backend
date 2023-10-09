const express = require('express');
const { resolve } = require('path');
const cors = require('cors');
const env = require('dotenv').config({ path: './.env' });

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-08-16',
});
const app = express();
app.use(express.json());

function getPlanAmountFromDatabase(planId) {
  const planAmounts = {
    1: 25,
    2: 30,
    3: 45,
  };

  return planAmounts[planId] || null;
}

app.use(express.static(process.env.STATIC_DIR));
app.use(cors());

app.get('/', (req, res) => {
  const path = resolve(process.env.STATIC_DIR + '/index.html');
  res.sendFile(path);
});

app.get('/config', (req, res) => {
  res.send({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

app.get('/get-plan-amount/:planId', (req, res) => {
  const { planId } = req.params;
  const planAmount = getPlanAmountFromDatabase(parseInt(planId));

  if (planAmount !== null) {
    res.json({ amount: planAmount });
  } else {
    res.status(404).json({ error: 'Plan not found', defaultAmount: 0 });
  }
});

app.post('/create-payment-intent', async (req, res) => {
  try {
    const { planId } = req.body;

    const planPrice = getPlanAmountFromDatabase(planId);

    if (planPrice === null) {
      throw new Error('Plan not found');
    }

    const paymentIntent = await stripe.paymentIntents.create({
      currency: 'EUR',
      amount: planPrice * 100,
      automatic_payment_methods: { enabled: true },
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (e) {
    res.status(400).send({
      error: {
        message: e.message,
      },
    });
  }
});

app.listen(5252, () =>
  console.log(`Node server listening at http://localhost:5252`),
);
