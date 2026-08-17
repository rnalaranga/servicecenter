import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

// Ensure a Main Warehouse exists
async function getMainWarehouse() {
  let warehouse = await prisma.warehouse.findFirst({ where: { code: 'MAIN' } });
  if (!warehouse) {
    warehouse = await prisma.warehouse.create({
      data: {
        code: 'MAIN',
        name: 'Main Warehouse',
        location: 'HQ',
        isActive: true
      }
    });
  }
  return warehouse;
}

// Generate Txn Number
async function generateTxnNumber() {
  const lastTxn = await prisma.stockTransaction.findFirst({
    orderBy: { id: 'desc' },
  });
  let nextNumber = 1;
  if (lastTxn && lastTxn.txnNumber.startsWith('STX-')) {
    const lastNum = parseInt(lastTxn.txnNumber.replace('STX-', ''), 10);
    if (!isNaN(lastNum)) nextNumber = lastNum + 1;
  }
  return `STX-${nextNumber.toString().padStart(6, '0')}`;
}

export const getStockLevels = async (req: Request, res: Response) => {
  try {
    const levels = await prisma.stockLevel.findMany({
      include: {
        product: true,
        warehouse: true
      }
    });
    res.json(levels);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock levels' });
  }
};

export const getStockMovements = async (req: Request, res: Response) => {
  try {
    const movements = await prisma.stockTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        product: true,
        warehouse: true
      }
    });
    res.json(movements);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock movements' });
  }
};

const adjustStockSchema = z.object({
  productId: z.number(),
  type: z.enum(['IN', 'OUT']),
  quantity: z.number().min(0.01),
  unitCost: z.number().optional().default(0),
  notes: z.string().optional().nullable(),
});

export const adjustStock = async (req: Request, res: Response) => {
  try {
    const data = adjustStockSchema.parse(req.body);
    const warehouse = await getMainWarehouse();
    const txnNumber = await generateTxnNumber();

    const actualQty = data.type === 'IN' ? Math.abs(data.quantity) : -Math.abs(data.quantity);
    const totalCost = data.type === 'IN' ? data.quantity * data.unitCost : 0;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Get or create stock level
      let stockLevel = await tx.stockLevel.findUnique({
        where: { productId_warehouseId: { productId: data.productId, warehouseId: warehouse.id } }
      });
      
      if (!stockLevel) {
        stockLevel = await tx.stockLevel.create({
          data: { productId: data.productId, warehouseId: warehouse.id, quantity: 0 }
        });
      }

      // 2. Create Transaction
      const txn = await tx.stockTransaction.create({
        data: {
          txnNumber,
          productId: data.productId,
          warehouseId: warehouse.id,
          type: data.type,
          quantity: actualQty,
          unitCost: data.unitCost,
          totalCost: totalCost,
          refType: 'ADJUSTMENT',
          notes: data.notes
        }
      });

      // 3. Update Stock Level
      const updatedLevel = await tx.stockLevel.update({
        where: { id: stockLevel.id },
        data: { quantity: { increment: actualQty } }
      });

      // 4. Update Product Avg Cost if it's an IN transaction with cost
      if (data.type === 'IN' && data.unitCost > 0) {
        const product = await tx.product.findUnique({ where: { id: data.productId } });
        if (product) {
          const currentQty = Number(stockLevel.quantity);
          const currentAvgCost = Number(product.avgCost);
          
          let newAvgCost = data.unitCost;
          if (currentQty > 0) {
            const totalValueBefore = currentQty * currentAvgCost;
            const valueAdded = data.quantity * data.unitCost;
            newAvgCost = (totalValueBefore + valueAdded) / (currentQty + data.quantity);
          }
          
          await tx.product.update({
            where: { id: data.productId },
            data: { avgCost: newAvgCost }
          });
        }
      }

      return { txn, stockLevel: updatedLevel };
    });

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation Error', details: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to adjust stock' });
  }
};
