import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

// Utility to generate Expense Number
async function generateExpenseNumber() {
  const lastExpense = await prisma.expense.findFirst({
    orderBy: { id: 'desc' },
  });
  let nextNumber = 1;
  if (lastExpense && lastExpense.expenseNumber.startsWith('EXP-')) {
    const lastNum = parseInt(lastExpense.expenseNumber.replace('EXP-', ''), 10);
    if (!isNaN(lastNum)) nextNumber = lastNum + 1;
  }
  return `EXP-${nextNumber.toString().padStart(6, '0')}`;
}

export const getExpenses = async (req: Request, res: Response) => {
  try {
    const expenses = await prisma.expense.findMany({
      include: {
        category: true,
      },
      orderBy: { date: 'desc' }
    });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
};

export const getExpenseCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.expenseCategory.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expense categories' });
  }
};

const expenseSchema = z.object({
  date: z.string().or(z.date()),
  categoryId: z.number().optional().nullable(),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  method: z.string().default('CASH'),
  payee: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const createExpense = async (req: Request, res: Response) => {
  try {
    const data = expenseSchema.parse(req.body);
    const expenseNumber = await generateExpenseNumber();

    const expense = await prisma.expense.create({
      data: {
        expenseNumber,
        date: new Date(data.date),
        categoryId: data.categoryId,
        description: data.description,
        amount: data.amount,
        method: data.method,
        payee: data.payee,
        reference: data.reference,
        notes: data.notes,
        status: 'PAID'
      },
      include: { category: true }
    });

    res.status(201).json(expense);
  } catch (error) {
    if (error instanceof z.ZodError) res.status(400).json({ error: error.errors });
    else res.status(500).json({ error: 'Failed to record expense' });
  }
};

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required')
});

export const createExpenseCategory = async (req: Request, res: Response) => {
  try {
    const data = categorySchema.parse(req.body);
    const category = await prisma.expenseCategory.create({
      data: { name: data.name }
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' });
  }
};
