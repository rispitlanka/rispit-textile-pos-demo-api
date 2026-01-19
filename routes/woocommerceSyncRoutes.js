import express from 'express';
import {
  syncProduct,
  syncAllProducts,
  getSyncStatus,
  deleteProductFromWC
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
 *     summary: Check WooCommerce plugin connection status
 *     tags: [WooCommerce Sync]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 syncEnabled:
 *                   type: boolean
 *                 enabled:
 *                   type: boolean
 *                 connected:
 *                   type: boolean
 *                 status:
 *                   type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/status', authenticate, getSyncStatus);

/**
 * @swagger
 * /api/woocommerce/sync-product/{id}:
 *   post:
 *     summary: Manually sync a single product to WooCommerce
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
 *         description: WooCommerce sync not enabled
 *       404:
 *         description: Product not found
 *       401:
 *         description: Unauthorized
 */
router.post('/sync-product/:id', authenticate, authorize('admin'), syncProduct);

/**
 * @swagger
 * /api/woocommerce/sync-all:
 *   post:
 *     summary: Manually sync all active products to WooCommerce
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
 *                 results:
 *                   type: object
 *       400:
 *         description: WooCommerce sync not enabled
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post('/sync-all', authenticate, authorize('admin'), syncAllProducts);

/**
 * @swagger
 * /api/woocommerce/delete-product/{id}:
 *   delete:
 *     summary: Manually delete a product from WooCommerce
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
 *         description: Product deleted from WooCommerce successfully
 *       400:
 *         description: WooCommerce sync not enabled or product has no SKU
 *       404:
 *         description: Product not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.delete('/delete-product/:id', authenticate, authorize('admin'), deleteProductFromWC);

export default router;
