import { Router } from 'express';
import { getVendorBalances, getVendorStatement } from '../controllers/vendor-ledger.controller';

const router = Router();

router.get('/', getVendorBalances);
router.get('/:vendorId', getVendorStatement);

export default router;
