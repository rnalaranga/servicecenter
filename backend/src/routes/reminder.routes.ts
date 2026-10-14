import { Router } from 'express';
import {
  getReminders,
  getReminder,
  createReminderSchedule,
  updateReminder,
  deleteReminder,
  addFollowup
} from '../controllers/reminder.controller';

const router = Router();

router.get('/', getReminders);
router.get('/:id', getReminder);
router.post('/', createReminderSchedule);
router.put('/:id', updateReminder);
router.delete('/:id', deleteReminder);

router.post('/:id/followups', addFollowup);

export default router;
