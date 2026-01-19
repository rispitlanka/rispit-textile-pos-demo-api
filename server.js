import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';

// Import Swagger
import { specs, swaggerUi } from './config/swagger.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import saleRoutes from './routes/saleRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import expenseCategoryRoutes from './routes/expenseCategoryRoutes.js';
import productVariationRoutes from './routes/productVariationRoutes.js';
import staffRoutes from './routes/staffRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import returnRoutes from './routes/returnRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import purchaseOrderRoutes from './routes/purchaseOrderRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';

dotenv.config();

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);



const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI);

mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'POS System API Documentation'
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/expense-categories', expenseCategoryRoutes);
app.use('/api/product-variations', productVariationRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/webhooks', webhookRoutes);

// Welcome endpoint - no auth required
/**
 * @swagger
 * /:
 *   get:
 *     summary: Get API welcome message
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Welcome message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "POS System API v1.0"
 *                 status:
 *                   type: string
 *                   example: "active"
 *                 documentation:
 *                   type: string
 *                   example: "Available at /api-docs"
 */
app.get('/', (req, res) => {
  res.send({ 
    message: 'POS System API v1.0',
    status: 'active',
    documentation: 'Available at /api-docs'
  });
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("https://localhost:3000")
  // console.log("https://rispit-pos-api.onrender.com")
  
  // Start cron job to hit root route every 14 minutes
  // cron.schedule('*/14 * * * *', async () => {
  //   try {
  //     const response = await fetch(`https://rispit-pos-demo-api.onrender.com`);
  //     const data = await response.json();
  //     console.log(`Cron job executed at ${new Date().toISOString()} - Status: ${data.status}`);
  //   } catch (error) {
  //     console.error(`Cron job failed at ${new Date().toISOString()}:`, error.message);
  //   }
  // });
  
  // console.log('Cron job scheduled: hitting / route every 14 minutes');
});
