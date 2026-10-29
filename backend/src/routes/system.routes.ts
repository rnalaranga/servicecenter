import { Router } from 'express';
import { 
  getAuditLogs, 
  getSettings, 
  updateSettings, 
  fixDatabase,
  createDatabaseBackup,
  downloadLatestBackup,
  listBackups
} from '../controllers/system.controller';

const router = Router();

router.get('/audit-logs', getAuditLogs);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.post('/fix-database', fixDatabase);
router.post('/backup', createDatabaseBackup);
router.get('/backup/download', downloadLatestBackup);
router.get('/backups', listBackups);

export default router;
