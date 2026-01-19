import express from 'express';
import {
  syncProduct,
  syncAllProducts,
  getSyncStatus
} from '../controllers/woocommerceSyncController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: WooCommerce Sync
 *   description: Manual product synchronization with WooCommerce
 */

/**
 * @swagger
 * /api/woocommerce/status:
 *   get:
 *     summary: Check WooCommerce sync status
 *     tags: [WooCommerce Sync]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 syncEnabled:
 *                   type: boolean
 *                 wordPress:
 *                   type: object
 *                   properties:
 *                     enabled:
 *                       type: boolean
 *                     status:
 *                       type: string
 *                     woocommerce_active:
 *                       type: boolean
 *                     version:
 *                       type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/status', authenticate, getSyncStatus);

/**
 * @swagger
 * /api/woocommerce/sync-product/{id}:
 *   post:
 *     summary: Sync a single product to WooCommerce
 *     tags: [WooCommerce Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 product:
 *                   type: object
 *                 wooCommerce:
 *                   type: object
 *       400:
 *         description: Sync not enabled or product not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Sync failed
 */
router.post('/sync-product/:id', authenticate, authorize('admin'), syncProduct);

/**
 * @swagger
 * /api/woocommerce/sync-all:
 *   post:
 *     summary: Sync all active products to WooCommerce
 *     tags: [WooCommerce Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of products to sync
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of products to skip
 *     responses:
 *       200:
 *         description: Products synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 synced:
 *                   type: number
 *                 result:
 *                   type: object
 *       400:
 *         description: Sync not enabled
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Sync failed
 */
router.post('/sync-all', authenticate, authorize('admin'), syncAllProducts);

export default router;
