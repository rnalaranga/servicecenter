import { Router } from 'express';
import { getAccounts, getAccount, createAccount, updateAccount, deleteAccount } from '../controllers/account.controller';

const router = Router();

router.get('/', getAccounts);
router.get('/:id', getAccount);
router.post('/', createAccount);
router.put('/:id', updateAccount);
router.delete('/:id', deleteAccount);

export default router;
