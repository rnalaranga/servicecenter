import { Router } from 'express';
import * as invoiceController from '../controllers/invoice.controller';

const router = Router();

router.get('/', invoiceController.getInvoices);
router.post('/', invoiceController.createDirectInvoice);
router.post('/from-job-card', invoiceController.createInvoiceFromJobCard);
router.get('/:id', invoiceController.getInvoiceById);
router.post('/payment', invoiceController.recordPayment);

export default router;
