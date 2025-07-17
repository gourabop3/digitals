import express from 'express';
import { WebhookRequest } from './server';
import { stripe } from './lib/stripe';
import type Stripe from 'stripe';
import { getPayloadClient } from './get-payload';
import { Product } from './payload-types';
import { Resend } from 'resend';
import { ReceiptEmailHtml } from './components/emails/ReceiptEmail';

const resend = new Resend(process.env.RESEND_API_KEY || 'dummy-key');

export const stripeWebhookHandler =
  async (req: express.Request, res: express.Response) => {
    // 1. validate that this request actually comes from stripe
    // 2. update the _isPaid value of this order
    // 3. send receipt email

    const webhookRequest = req as any as WebhookRequest;
    const body = webhookRequest.rawBody;
    const signature = req.headers['stripe-signature'] || '';

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );
    } catch (err) {
      return res
        .status(400)
        .send(
          `Webhook Error: ${
            err instanceof Error ? err.message : 'Unknown Error'
          }`
        );
    }

    const session = event.data.object as Stripe.Checkout.Session;

    if (!session?.metadata?.userId || !session?.metadata?.orderId) {
      return res.status(400).send(`Webhook Error: No user present in metadata`);
    }

    const userId = session.metadata.userId as string;
    const orderId = session.metadata.orderId as string;

    if (event.type === 'checkout.session.completed') {
      const payload = await getPayloadClient();

      const { docs: users } = await payload.find({
        collection: 'users',
        where: {
          id: {
            equals: userId,
          },
        },
      });

      const [user] = users;

      if (!user) return res.status(404).json({ error: 'No such user exists.' });

      const { docs: orders } = await payload.find({
        collection: 'orders',
        depth: 2,
        where: {
          id: {
            equals: orderId,
          },
        },
      });

      const [order] = orders;

      if (!order)
        return res.status(404).json({ error: 'No such order exists.' });

      await payload.update({
        collection: 'orders',
        data: {
          _isPaid: true,
        },
        where: {
          id: {
            equals: orderId,
          },
        },
      });

      // send receipt
      try {
        const data = await resend.emails.send({
          from: 'DigitalHippo <hello@joshtriedcoding.com>',
          to: [user.email as string],
          subject: 'Thanks for your order! This is your receipt.',
          html: ReceiptEmailHtml({
            date: new Date(),
            email: user.email as string,
            orderId: orderId,
            products: order.products as Product[],
          }),
        });
        res.status(200).json({ data });
      } catch (error) {
        res.status(500).json({ error });
      }
    }

    return res.status(200).send();
  };
