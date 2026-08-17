import { Router } from 'express';
import { getVendors, getVendor, createVendor, updateVendor } from '../controllers/vendor.controller';

const router = Router();

router.get('/', getVendors);
router.get('/:id', getVendor);
router.post('/', createVendor);
router.put('/:id', updateVendor);

export default router;
