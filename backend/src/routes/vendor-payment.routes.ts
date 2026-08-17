import { Router } from 'express';
import { getPayments, getPaymentsByVendor, createPayment } from '../controllers/vendor-payment.controller';

const router = Router();

router.get('/', getPayments);
router.get('/vendor/:vendorId', getPaymentsByVendor);
router.post('/', createPayment);

export default router;
