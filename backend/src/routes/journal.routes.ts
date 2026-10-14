import { Router } from 'express';
import { getJournalEntries, getJournalEntry, createJournalEntry, deleteJournalEntry } from '../controllers/journal.controller';

const router = Router();

router.get('/', getJournalEntries);
router.get('/:id', getJournalEntry);
router.post('/', createJournalEntry);
router.delete('/:id', deleteJournalEntry);

export default router;
