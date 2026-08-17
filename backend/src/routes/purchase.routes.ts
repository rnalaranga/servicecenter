import { Router } from 'express';
import { getPurchases, getPurchase, createPurchase } from '../controllers/purchase.controller';

const router = Router();

router.get('/', getPurchases);
router.get('/:id', getPurchase);
router.post('/', createPurchase);

export default router;
