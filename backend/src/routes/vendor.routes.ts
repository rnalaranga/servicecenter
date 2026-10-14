import { Router } from 'express';
import { getVendors, getVendor, createVendor, updateVendor, deleteVendor } from '../controllers/vendor.controller';

const router = Router();

router.get('/', getVendors);
router.get('/:id', getVendor);
router.post('/', createVendor);
router.put('/:id', updateVendor);
router.delete('/:id', deleteVendor);

export default router;
