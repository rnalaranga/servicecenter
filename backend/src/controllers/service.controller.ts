import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

export const getServices = async (req: Request, res: Response) => {
  try {
    const services = await prisma.service.findMany({
      include: { category: true },
      orderBy: { name: 'asc' }
    });
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch services' });
  }
};

export const getServiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const service = await prisma.service.findUnique({
      where: { id: Number(id) },
      include: { category: true }
    });
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch service' });
  }
};

const serviceSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  sellingPrice: z.number(),
  estimatedCost: z.number().optional(),
  estimatedDuration: z.number().optional().nullable(),
  categoryId: z.number().optional().nullable(),
});

export const createService = async (req: Request, res: Response) => {
  try {
    const data = serviceSchema.parse(req.body);
    
    const existing = await prisma.service.findUnique({ where: { code: data.code } });
    if (existing) return res.status(400).json({ error: 'Service code already exists' });

    const service = await prisma.service.create({ data });
    res.status(201).json(service);
  } catch (error) {
    if (error instanceof z.ZodError) res.status(400).json({ error: error.errors });
    else res.status(500).json({ error: 'Failed to create service' });
  }
};

export const updateService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = serviceSchema.parse(req.body);

    const service = await prisma.service.update({
      where: { id: Number(id) },
      data
    });
    res.json(service);
  } catch (error) {
    if (error instanceof z.ZodError) res.status(400).json({ error: error.errors });
    else res.status(500).json({ error: 'Failed to update service' });
  }
};

export const getServiceCategories = async (req: Request, res: Response) => {
  try {
    const cats = await prisma.serviceCategory.findMany({ orderBy: { name: 'asc' } });
    res.json(cats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

export const createServiceCategory = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const category = await prisma.serviceCategory.create({ data: { name } });
    res.json(category);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create category' });
  }
};

export const updateServiceCategory = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const category = await prisma.serviceCategory.update({
      where: { id: Number(req.params.id) },
      data: { name }
    });
    res.json(category);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update category' });
  }
};

export const deleteServiceCategory = async (req: Request, res: Response) => {
  try {
    await prisma.serviceCategory.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Cannot delete category in use' });
    }
    res.status(500).json({ error: 'Failed to delete category' });
  }
};
