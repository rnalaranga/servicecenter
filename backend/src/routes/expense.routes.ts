import { Router } from 'express';
import { getExpenses, getExpenseCategories, createExpense, createExpenseCategory } from '../controllers/expense.controller';

const router = Router();

router.get('/categories', getExpenseCategories);
router.post('/categories', createExpenseCategory);

router.get('/', getExpenses);
router.post('/', createExpense);

export default router;
