import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

export const getSalesReports = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const query: any = {};
    if (startDate && endDate) {
      const start = new Date(startDate as string);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);

      query.date = {
        gte: start,
        lte: end
      };
    }

    const invoices = await prisma.invoice.findMany({
      where: query,
      include: {
        customer: true,
      },
      orderBy: { date: 'desc' }
    });

    let totalRevenue = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;

    invoices.forEach(inv => {
      totalRevenue += Number(inv.total);
      totalCollected += Number(inv.amountPaid);
      totalOutstanding += Number(inv.balance);
    });

    res.json({
      summary: {
        totalRevenue,
        totalCollected,
        totalOutstanding,
        invoiceCount: invoices.length
      },
      invoices
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate sales report' });
  }
};

export const getInventoryReports = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        stockLevels: true,
        category: true
      }
    });

    let totalInventoryValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const inventory = products.map(p => {
      const currentStock = p.stockLevels.reduce((sum, sl) => sum + Number(sl.quantity), 0);
      const avgCost = Number(p.avgCost || p.purchaseCost || 0);
      const totalValue = currentStock * avgCost;

      totalInventoryValue += totalValue;

      if (currentStock === 0) {
        outOfStockCount++;
      } else if (currentStock <= p.reorderLevel) {
        lowStockCount++;
      }

      return {
        id: p.id,
        code: p.code,
        sku: p.sku,
        name: p.name,
        category: p.category?.name || 'Uncategorized',
        currentStock,
        reorderLevel: p.reorderLevel,
        avgCost,
        totalValue
      };
    });

    // Sort by total value descending
    inventory.sort((a, b) => b.totalValue - a.totalValue);

    res.json({
      summary: {
        totalInventoryValue,
        totalItems: products.length,
        lowStockCount,
        outOfStockCount
      },
      inventory
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate inventory report' });
  }
};

export const getProfitabilityReports = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const query: any = {};
    if (startDate && endDate) {
      const start = new Date(startDate as string);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);

      query.date = {
        gte: start,
        lte: end
      };
    }

    // 1. Get Revenue from Invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        ...query,
        status: { not: 'CANCELLED' }
      },
      include: {
        items: {
          include: { product: true }
        },
        jobCards: {
          include: {
            jobCard: {
              include: {
                materials: {
                  include: { product: true }
                }
              }
            }
          }
        }
      }
    });

    let totalRevenue = 0;
    let totalCogs = 0;

    invoices.forEach(inv => {
      totalRevenue += Number(inv.total);

      // COGS from direct invoice items
      inv.items.forEach(item => {
        if (item.product) {
          const cost = Number(item.product.avgCost || item.product.purchaseCost || 0);
          totalCogs += Number(item.quantity) * cost;
        }
      });

      // COGS from linked job cards
      inv.jobCards.forEach(jcLink => {
        jcLink.jobCard.materials.forEach(jcMaterial => {
          if (jcMaterial.product) {
            const cost = Number(jcMaterial.product.avgCost || jcMaterial.product.purchaseCost || 0);
            totalCogs += Number(jcMaterial.quantity) * cost;
          }
        });
      });
    });

    // 2. Get Expenses
    const expenses = await prisma.expense.findMany({
      where: query
    });

    let totalExpenses = 0;
    expenses.forEach(exp => {
      totalExpenses += Number(exp.amount);
    });

    const netProfit = totalRevenue - totalCogs - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    res.json({
      totalRevenue,
      totalCogs,
      totalExpenses,
      netProfit,
      profitMargin
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate profitability report' });
  }
};

export const getFinancialReports = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const query: any = {};
    if (startDate && endDate) {
      const start = new Date(startDate as string);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);

      query.date = {
        gte: start,
        lte: end
      };
    }

    // 1. Cash In (Customer Payments)
    const payments = await prisma.customerPayment.findMany({ where: query });
    const cashIn = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    // 2. Cash Out (Vendor Payments & Expenses)
    const vendorPayments = await prisma.vendorPayment.findMany({ where: query });
    const expenses = await prisma.expense.findMany({ where: query });
    
    const vendorCashOut = vendorPayments.reduce((sum, vp) => sum + Number(vp.amount), 0);
    const expenseCashOut = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const cashOut = vendorCashOut + expenseCashOut;

    const netCashFlow = cashIn - cashOut;

    // 3. Accounts Receivable (Unpaid Invoices)
    const unpaidInvoices = await prisma.invoice.findMany({
      where: { balance: { gt: 0 }, status: { not: 'CANCELLED' } }
    });
    const accountsReceivable = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.balance), 0);

    // 4. Accounts Payable (Unpaid Purchases)
    const unpaidPurchases = await prisma.purchase.findMany({
      where: { balance: { gt: 0 }, status: { not: 'CANCELLED' } }
    });
    const accountsPayable = unpaidPurchases.reduce((sum, pur) => sum + Number(pur.balance), 0);

    res.json({
      cashIn,
      cashOut,
      vendorCashOut,
      expenseCashOut,
      netCashFlow,
      accountsReceivable,
      accountsPayable
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate financial report' });
  }
};
