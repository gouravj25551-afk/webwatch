const config = require('../config');
const prisma = require('../lib/prisma');

let DodoPayments;
try {
  DodoPayments = require('dodopayments').default || require('dodopayments');
} catch (e) {
  DodoPayments = null;
}

function getDodoClient() {
  if (!config.dodoApiKey || !DodoPayments) return null;
  return new DodoPayments({
    bearerToken: config.dodoApiKey,
    webhookKey: config.dodoWebhookKey || null,
    environment: config.dodoMode === 'live_mode' ? 'live_mode' : 'test_mode',
  });
}

function serviceError(message, statusCode = 503) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function assertPaymentMatches(payment, { userId, dodoSessionId, amount, currency }) {
  if (userId && payment.userId !== userId) throw new Error('Payment user does not match');
  if (payment.dodoSessionId && dodoSessionId && payment.dodoSessionId !== dodoSessionId) {
    throw new Error('Checkout session does not match');
  }
  if (!Number.isInteger(amount) || amount !== payment.amount) throw new Error('Payment amount does not match');
  if (String(currency || '').toUpperCase() !== payment.currency) throw new Error('Payment currency does not match');
}

/**
 * Creates a $1 checkout session for site monitoring using Dodo Payments API
 */
async function createCheckoutSession({ user, quantity = 1 }) {
  const client = getDodoClient();
  if (!client || !config.dodoProductId) {
    throw serviceError('Payments are temporarily unavailable. Please try again later.');
  }

  const amountCents = 100 * quantity; // $1.00 per site

  // Create pending payment record in DB first
  const pendingPayment = await prisma.payment.create({
    data: {
      userId: user.id,
      amount: amountCents,
      currency: 'USD',
      status: 'PENDING',
    },
  });

  try {
    const session = await client.checkoutSessions.create({
      product_cart: [{ product_id: config.dodoProductId, quantity }],
      customer: { email: user.email },
      metadata: {
        userId: user.id,
        paymentId: pendingPayment.id,
        quantity: String(quantity),
        type: 'SITE_MONITOR_SLOT',
      },
      return_url: `${config.clientOrigin}/?payment=return&payment_id=${pendingPayment.id}`,
    });

    if (!session?.session_id || !session?.checkout_url) {
      throw new Error('Dodo did not return a checkout URL');
    }

    await prisma.payment.update({
      where: { id: pendingPayment.id },
      data: { dodoSessionId: session.session_id },
    });

    return {
      success: true,
      checkoutUrl: session.checkout_url,
      isTest: config.dodoMode !== 'live_mode',
    };
  } catch (dodoError) {
    await prisma.payment.update({
      where: { id: pendingPayment.id },
      data: { status: 'FAILED' },
    });
    console.error('Dodo checkout creation failed:', dodoError.message);
    throw serviceError('Could not start checkout. Please try again.', 502);
  }
}

/**
 * Process and finalize a successful payment, granting site monitor slots to the user
 */
async function fulfillPayment({ paymentId, dodoPaymentId, dodoSessionId, userId, amount, currency }) {
  return await prisma.$transaction(async (tx) => {
    let payment = null;

    if (paymentId) {
      payment = await tx.payment.findUnique({ where: { id: paymentId } });
    } else if (dodoSessionId) {
      payment = await tx.payment.findUnique({ where: { dodoSessionId } });
    } else if (dodoPaymentId) {
      payment = await tx.payment.findUnique({ where: { dodoPaymentId } });
    }

    if (!payment) throw new Error('Payment record not found');
    assertPaymentMatches(payment, { userId, dodoSessionId, amount, currency });

    if (payment.status === 'SUCCESS') {
      return { payment, alreadyProcessed: true };
    }

    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCESS',
        dodoPaymentId: dodoPaymentId || payment.dodoPaymentId,
        dodoSessionId: dodoSessionId || payment.dodoSessionId,
      },
    });

    const quantityGranted = Math.max(1, Math.floor(updatedPayment.amount / 100));
    const user = await tx.user.update({
      where: { id: payment.userId },
      data: {
        paidMonitorsCount: { increment: quantityGranted },
      },
    });

    return { payment: updatedPayment, user, grantedSlots: quantityGranted };
  });
}

/**
 * Verifies Webhook signature from Dodo Payments
 */
function verifyWebhookSignature(payloadBuffer, headers) {
  if (!config.dodoWebhookKey) {
    return { valid: !config.isProduction, reason: 'DODO_PAYMENTS_WEBHOOK_KEY not set' };
  }

  const webhookId = headers['webhook-id'] || headers['x-webhook-id'];
  const webhookSignature = headers['webhook-signature'] || headers['x-webhook-signature'];
  const webhookTimestamp = headers['webhook-timestamp'] || headers['x-webhook-timestamp'];

  if (!webhookSignature) return { valid: false, reason: 'Missing webhook signature header' };

  try {
    const client = getDodoClient();
    if (client?.webhooks?.unwrap) {
      const unwrapped = client.webhooks.unwrap(payloadBuffer.toString('utf8'), {
        headers: {
          'webhook-id': String(webhookId || ''),
          'webhook-signature': String(webhookSignature),
          'webhook-timestamp': String(webhookTimestamp || ''),
        },
        key: config.dodoWebhookKey,
      });
      return { valid: true, payload: unwrapped };
    }
    return { valid: false, reason: 'Dodo Payments SDK is unavailable' };
  } catch (err) {
    return { valid: false, reason: err.message };
  }
}

module.exports = {
  assertPaymentMatches,
  createCheckoutSession,
  fulfillPayment,
  verifyWebhookSignature,
};
