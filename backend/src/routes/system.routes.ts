import { Router } from 'express';
import { getAuditLogs, getSettings, updateSettings } from '../controllers/system.controller';

const router = Router();

router.get('/audit-logs', getAuditLogs);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

export default router;
