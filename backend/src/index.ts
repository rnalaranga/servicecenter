import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import customerRoutes from './routes/customer.routes';
import vehicleRoutes from './routes/vehicle.routes';
import jobcardRoutes from './routes/jobcard.routes';
import serviceRoutes from './routes/service.routes';
import productRoutes from './routes/product.routes';
import invoiceRoutes from './routes/invoice.routes';
import paymentRoutes from './routes/payment.routes';
import stockRoutes from './routes/stock.routes';
import vendorRoutes from './routes/vendor.routes';
import purchaseRoutes from './routes/purchase.routes';
import vendorPaymentRoutes from './routes/vendor-payment.routes';
import customerLedgerRoutes from './routes/customer-ledger.routes';
import vendorLedgerRoutes from './routes/vendor-ledger.routes';
import expenseRoutes from './routes/expense.routes';
import reportRoutes from './routes/report.routes';
import userRoutes from './routes/user.routes';
import systemRoutes from './routes/system.routes';
import dashboardRoutes from './routes/dashboard.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/customers', customerRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/job-cards', jobcardRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/products', productRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/vendor-payments', vendorPaymentRoutes);
app.use('/api/customer-ledger', customerLedgerRoutes);
app.use('/api/vendor-ledger', vendorLedgerRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error Handler
app.use((err: any, req: Request, res: Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

