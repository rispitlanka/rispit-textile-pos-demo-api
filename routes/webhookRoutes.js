import express from 'express';
import {
  receiveOrderWebhook,
  getWooCommerceOrders,
  getWooCommerceOrder,
  getOrderStats,
  webhookHealthCheck
} from '../controllers/webhookController.js';
import { validateWebhookApiKey } from '../middleware/webhookAuth.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Webhooks
 *   description: WooCommerce webhook endpoints for order synchronization
 */

/**
 * @swagger
 * /api/webhooks/health:
 *   get:
 *     summary: Webhook service health check
 *     tags: [Webhooks]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   type: string
 *                 service:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 version:
 *                   type: string
 */
router.get('/health', webhookHealthCheck);

/**
 * @swagger
 * /api/webhooks/orders:
 *   post:
 *     summary: Receive order webhook from WooCommerce
 *     tags: [Webhooks]
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event
 *               - data
 *             properties:
 *               event:
 *                 type: string
 *                 enum: [order.created, order.status_changed]
 *                 description: Webhook event type
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: Webhook timestamp
 *               data:
 *                 type: object
 *                 description: WooCommerce order data
 *                 properties:
 *                   id:
 *                     type: number
 *                     description: WooCommerce order ID
 *                   order_number:
 *                     type: string
 *                     description: Order number
 *                   status:
 *                     type: string
 *                     description: Order status
 *                   currency:
 *                     type: string
 *                   date_created:
 *                     type: string
 *                     format: date-time
 *                   total:
 *                     type: number
 *                   subtotal:
 *                     type: number
 *                   payment_method:
 *                     type: string
 *                   billing:
 *                     type: object
 *                     properties:
 *                       first_name:
 *                         type: string
 *                       last_name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       phone:
 *                         type: string
 *                   line_items:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: number
 *                         name:
 *                           type: string
 *                         product_id:
 *                           type: number
 *                         quantity:
 *                           type: number
 *                         total:
 *                           type: number
 *                         sku:
 *                           type: string
 *     responses:
 *       200:
 *         description: Webhook received successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 event:
 *                   type: string
 *                 order_id:
 *                   type: number
 *                 order_number:
 *                   type: string
 *                 wc_order_db_id:
 *                   type: string
 *       400:
 *         description: Bad request - Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized - Invalid API key
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 *                 message:
 *                   type: string
 */
router.post('/orders', validateWebhookApiKey, receiveOrderWebhook);

/**
 * @swagger
 * /api/webhooks/orders:
 *   get:
 *     summary: Get all WooCommerce orders received via webhooks
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by order status
 *       - in: query
 *         name: processed
 *         schema:
 *           type: boolean
 *         description: Filter by processed status
 *       - in: query
 *         name: event_type
 *         schema:
 *           type: string
 *           enum: [order.created, order.status_changed]
 *         description: Filter by event type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by order number or customer details
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 orders:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/orders', authenticate, getWooCommerceOrders);

/**
 * @swagger
 * /api/webhooks/orders/stats:
 *   get:
 *     summary: Get WooCommerce order statistics
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                       description: Total orders received
 *                     processed:
 *                       type: number
 *                       description: Processed orders
 *                     pending:
 *                       type: number
 *                       description: Pending orders
 *                     byStatus:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           count:
 *                             type: number
 *                           totalAmount:
 *                             type: number
 *                     recent:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/orders/stats', authenticate, getOrderStats);

/**
 * @swagger
 * /api/webhooks/orders/{id}:
 *   get:
 *     summary: Get single WooCommerce order by ID
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: WooCommerce order database ID
 *     responses:
 *       200:
 *         description: Order found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 order:
 *                   type: object
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/orders/:id', authenticate, getWooCommerceOrder);

export default router;
