import { Router } from 'express';
import { getPayments, getPaymentById, createPayment } from '../controllers/payment.controller';

const router = Router();

router.get('/', getPayments);
router.get('/:id', getPaymentById);
router.post('/', createPayment);

export default router;
