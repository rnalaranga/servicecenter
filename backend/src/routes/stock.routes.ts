import { Router } from 'express';
import { getStockLevels, getStockMovements, adjustStock } from '../controllers/stock.controller';

const router = Router();

router.get('/', getStockLevels);
router.get('/movements', getStockMovements);
router.post('/adjust', adjustStock);

export default router;
