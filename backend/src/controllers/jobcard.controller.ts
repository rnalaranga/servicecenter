import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

export const getJobCards = async (req: Request, res: Response) => {
  try {
    const { vehicleId } = req.query;
    const parsedId = Number(vehicleId);
    const whereClause = vehicleId && !isNaN(parsedId) ? { vehicleId: parsedId } : {};

    const jobCards = await prisma.jobCard.findMany({
      where: whereClause,
      include: {
        customer: true,
        vehicle: true,
        services: {
          include: { service: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(jobCards);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch job cards' });
  }
};

export const getJobCardById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const jobCard = await prisma.jobCard.findUnique({
      where: { id: Number(id) },
      include: {
        customer: true,
        vehicle: true,
        services: { include: { service: true } },
        materials: { include: { product: true } },
        technician: true,
        inspections: true,
        purchases: { include: { vendor: true, items: true, payments: true } }
      }
    });

    if (!jobCard) {
      return res.status(404).json({ error: 'Job card not found' });
    }
    res.json(jobCard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch job card' });
  }
};

const jobCardSchema = z.object({
  customerId: z.number(),
  vehicleId: z.number(),
  date: z.string(),
  odometer: z.number().optional().nullable(),
  complaint: z.string().optional().nullable(),
  priority: z.string().optional(),
});

export const createJobCard = async (req: Request, res: Response) => {
  try {
    const data = jobCardSchema.parse(req.body);
    
    // Generate unique Job Number
    const count = await prisma.jobCard.count();
    const jobNumber = `JC-${String(count + 1).padStart(6, '0')}`;

    const jobCard = await prisma.jobCard.create({
      data: {
        ...data,
        date: new Date(data.date),
        jobNumber,
        status: 'OPEN'
      }
    });
    res.status(201).json(jobCard);
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to create job card' });
    }
  }
};

export const updateJobCard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, odometer, complaint, inspectionNotes, internalNotes, customerNotes, priority } = req.body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (odometer !== undefined) updateData.odometer = odometer;
    if (complaint !== undefined) updateData.complaint = complaint;
    if (inspectionNotes !== undefined) updateData.inspectionNotes = inspectionNotes;
    if (internalNotes !== undefined) updateData.internalNotes = internalNotes;
    if (customerNotes !== undefined) updateData.customerNotes = customerNotes;
    if (priority !== undefined) updateData.priority = priority;

    const jobCard = await prisma.jobCard.update({
      where: { id: Number(id) },
      data: updateData
    });
    res.json(jobCard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update job card' });
  }
};

export const addServiceToJobCard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { serviceId, quantity = 1 } = req.body;

    const service = await prisma.service.findUnique({ where: { id: Number(serviceId) } });
    if (!service) return res.status(404).json({ error: 'Service not found' });

    const total = Number(service.sellingPrice) * Number(quantity);

    const jobService = await prisma.jobCardService.create({
      data: {
        jobCardId: Number(id),
        serviceId: Number(serviceId),
        quantity: quantity,
        unitPrice: service.sellingPrice,
        total: total,
        estimatedCost: Number(service.estimatedCost) * Number(quantity)
      }
    });

    // Update job card totals
    const allServices = await prisma.jobCardService.findMany({ where: { jobCardId: Number(id) } });
    const subtotal = allServices.reduce((sum, s) => sum + Number(s.total), 0);
    const totalCost = allServices.reduce((sum, s) => sum + Number(s.estimatedCost), 0);

    await prisma.jobCard.update({
      where: { id: Number(id) },
      data: { subtotal, total: subtotal, totalCost }
    });

    res.status(201).json(jobService);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add service' });
  }
};

export const removeServiceFromJobCard = async (req: Request, res: Response) => {
  try {
    const { id, serviceId } = req.params; // serviceId is the JobCardService ID

    await prisma.jobCardService.delete({
      where: { id: Number(serviceId) }
    });

    // Update job card totals
    const allServices = await prisma.jobCardService.findMany({ where: { jobCardId: Number(id) } });
    const subtotal = allServices.reduce((sum, s) => sum + Number(s.total), 0);
    const totalCost = allServices.reduce((sum, s) => sum + Number(s.estimatedCost), 0);

    await prisma.jobCard.update({
      where: { id: Number(id) },
      data: { subtotal, total: subtotal, totalCost }
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove service' });
  }
};
