import { Router } from 'express';
import { getSalesReports, getInventoryReports, getProfitabilityReports, getFinancialReports } from '../controllers/report.controller';

const router = Router();

router.get('/sales', getSalesReports);
router.get('/inventory', getInventoryReports);
router.get('/profitability', getProfitabilityReports);
router.get('/financial', getFinancialReports);

export default router;
