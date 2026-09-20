const express = require('express');
const { verifyWebhookSignature, fulfillPayment } = require('../services/dodoPayments');

const router = express.Router();

/**
 * POST /api/webhooks/dodo
 * Webhook handler for Dodo Payments events
 */
router.post('/dodo', express.raw({ type: 'application/json' }), async (req, res) => {
  const rawBody = req.body;
  const headers = req.headers;

  const verification = verifyWebhookSignature(rawBody, headers);
  if (!verification.valid) {
    console.warn('Invalid Dodo webhook signature:', verification.reason);
    return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
  }

  let payload = verification.payload;
  if (!payload && typeof rawBody === 'object' && !Buffer.isBuffer(rawBody)) {
    payload = rawBody;
  } else if (!payload && Buffer.isBuffer(rawBody)) {
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
    }
  }

  const eventType = payload.event || payload.type || payload.event_type;
  console.log(`Received Dodo Payments Webhook Event: ${eventType}`);

  try {
    if (eventType === 'payment.succeeded') {
      const data = payload.data || payload;
      const metadata = data.metadata || {};
      const dodoPaymentId = data.payment_id || data.id;
      const dodoSessionId = data.checkout_session_id || data.session_id;
      const paymentId = metadata.paymentId;
      const userId = metadata.userId;
      const amount = data.total_amount;
      const currency = data.currency;

      await fulfillPayment({
        paymentId,
        dodoPaymentId,
        dodoSessionId,
        userId,
        amount,
        currency,
      });

      console.log(`Successfully processed Dodo payment for user ${userId || 'unknown'}`);
    }

    return res.status(200).json({ success: true, received: true });
  } catch (error) {
    console.error('Error handling Dodo webhook:', error.message);
    return res.status(500).json({ success: false, message: 'Webhook processing error' });
  }
});

module.exports = router;
