import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

// Generate Vehicle Code
async function generateVehicleCode() {
  const lastVehicle = await prisma.vehicle.findFirst({
    orderBy: { id: 'desc' },
  });
  let nextNumber = 1;
  if (lastVehicle && lastVehicle.code.startsWith('VEH-')) {
    const lastNum = parseInt(lastVehicle.code.replace('VEH-', ''), 10);
    if (!isNaN(lastNum)) nextNumber = lastNum + 1;
  }
  return `VEH-${nextNumber.toString().padStart(6, '0')}`;
}

const vehicleSchema = z.object({
  customerId: z.number().or(z.string()).transform(v => Number(v)),
  registration: z.string().min(1),
  make: z.string().min(1),
  model: z.string().min(1),
  variant: z.string().optional(),
  year: z.number().or(z.string()).transform(v => Number(v) || null).nullable(),
  colour: z.string().optional(),
  fuelType: z.enum(['PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC', 'OTHER']).optional(),
  transmission: z.enum(['MANUAL', 'AUTOMATIC', 'CVT', 'OTHER']).optional(),
  engineNumber: z.string().optional(),
  vin: z.string().optional(), // mapped from chassisNo in frontend
  mileage: z.number().or(z.string()).transform(v => Number(v) || null).nullable(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const getVehicles = async (req: Request, res: Response) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: { name: true }
        },
        _count: {
          select: { jobCards: true }
        }
      }
    });

    const enriched = vehicles.map(v => ({
      ...v,
      customerName: v.customer.name,
      jobCount: v._count.jobCards,
      lastService: 'N/A' // Need job logic later
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
};

export const getVehicleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: Number(id) },
      include: {
        customer: { select: { name: true } }
      }
    });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    
    res.json({
      ...vehicle,
      customerName: vehicle.customer.name,
      jobCount: 0,
      lastService: 'N/A'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vehicle' });
  }
};

export const getVehiclesByCustomerId = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const vehicles = await prisma.vehicle.findMany({
      where: { customerId: Number(customerId) },
      orderBy: { createdAt: 'desc' },
    });
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
};

export const createVehicle = async (req: Request, res: Response) => {
  try {
    const data = vehicleSchema.parse(req.body);
    const code = await generateVehicleCode();

    const vehicle = await prisma.vehicle.create({
      data: {
        code,
        ...data,
      },
    });

    res.status(201).json(vehicle);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation Error', details: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
};

export const updateVehicle = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = vehicleSchema.parse(req.body);

    const vehicle = await prisma.vehicle.update({
      where: { id: Number(id) },
      data,
    });
    res.json(vehicle);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation Error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
};
