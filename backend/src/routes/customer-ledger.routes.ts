import { Router } from 'express';
import { getCustomerBalances, getCustomerStatement } from '../controllers/customer-ledger.controller';

const router = Router();

router.get('/', getCustomerBalances);
router.get('/:customerId', getCustomerStatement);

export default router;
