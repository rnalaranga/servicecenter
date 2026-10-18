import { Router } from 'express';
import * as invoiceController from '../controllers/invoice.controller';

const router = Router();

router.get('/', invoiceController.getInvoices);
router.post('/', invoiceController.createDirectInvoice);
router.post('/from-job-card', invoiceController.createInvoiceFromJobCard);
router.get('/:id', invoiceController.getInvoiceById);
router.put('/:id', invoiceController.updateInvoice);
router.post('/:id/convert-to-invoice', invoiceController.convertQuotationToInvoice);
router.post('/payment', invoiceController.recordPayment);
router.delete('/:id', invoiceController.deleteInvoice);

export default router;
