import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        unit: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    // For each product, calculate current stock level (since we aren't joining stockLevels in this simple fetch yet, we could sum it if we had StockLevels, but for now we'll just return it).
    // In a real app we'd join stockLevels or calculate from transactions. We will do this via a raw query or include.
    
    // Let's include stock levels
    const productsWithStock = await Promise.all(products.map(async (p) => {
      const stock = await prisma.stockLevel.aggregate({
        where: { productId: p.id },
        _sum: { quantity: true }
      });
      return {
        ...p,
        currentStock: stock._sum.quantity || 0
      };
    }));

    res.json(productsWithStock);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
      include: {
        category: true,
        unit: true,
        stockLevels: {
          include: { warehouse: true }
        },
        stockTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const totalStock = await prisma.stockLevel.aggregate({
      where: { productId: product.id },
      _sum: { quantity: true }
    });

    res.json({ ...product, currentStock: totalStock._sum.quantity || 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

const productSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().optional().nullable(),
  categoryId: z.number().optional().nullable(),
  unitId: z.number().optional().nullable(),
  purchaseCost: z.number().optional(),
  sellingPrice: z.number(),
  minStock: z.number().optional(),
});

export const createProduct = async (req: Request, res: Response) => {
  try {
    const data = productSchema.parse(req.body);
    
    const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (existing) return res.status(400).json({ error: 'SKU already exists' });

    const product = await prisma.product.create({
      data: {
        ...data,
      }
    });
    res.status(201).json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to create product' });
    }
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = productSchema.parse(req.body);

    const product = await prisma.product.update({
      where: { id: Number(id) },
      data
    });
    res.json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to update product' });
    }
  }
};

// Categories & Units
export const getCategories = async (req: Request, res: Response) => {
  try {
    const cats = await prisma.productCategory.findMany({ orderBy: { name: 'asc' } });
    res.json(cats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

export const getUnits = async (req: Request, res: Response) => {
  try {
    const units = await prisma.productUnit.findMany({ orderBy: { name: 'asc' } });
    res.json(units);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch units' });
  }
};
