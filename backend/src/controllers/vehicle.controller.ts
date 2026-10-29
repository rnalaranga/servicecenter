import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

// Generate Vehicle Code
async function generateVehicleCode() {
  const lastVehicle = await prisma.vehicle.findFirst({
    orderBy: { id: 'desc' },
  });
  let nextNumber = (lastVehicle?.id || 0) + 1;
  let code = `VEH-${nextNumber.toString().padStart(6, '0')}`;
  while (await prisma.vehicle.findUnique({ where: { code } })) {
    nextNumber++;
    code = `VEH-${nextNumber.toString().padStart(6, '0')}`;
  }
  return code;
}

const vehicleSchema = z.object({
  customerId: z.number().or(z.string()).transform(v => Number(v)),
  registration: z.string().min(1, 'Registration number is required').transform(v => v.trim().toUpperCase()),
  make: z.string().optional().default('Unknown').transform(v => v?.trim() || 'Unknown'),
  model: z.string().optional().default('Unknown').transform(v => v?.trim() || 'Unknown'),
  variant: z.string().optional().nullable(),
  year: z.number().or(z.string()).transform(v => Number(v) || null).nullable().optional(),
  colour: z.string().optional().nullable(),
  fuelType: z.enum(['PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC', 'OTHER']).optional().nullable(),
  transmission: z.enum(['MANUAL', 'AUTOMATIC', 'CVT', 'OTHER']).optional().nullable(),
  engineNumber: z.string().optional().nullable(),
  vin: z.string().optional().nullable(), // mapped from chassisNo in frontend
  mileage: z.number().or(z.string()).transform(v => Number(v) || null).nullable().optional(),
  notes: z.string().optional().nullable(),
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
    
    // Check if registration already exists
    const existing = await prisma.vehicle.findUnique({
      where: { registration: data.registration }
    });

    if (existing) {
      // If it exists for the same customer, return it!
      if (existing.customerId === data.customerId) {
        return res.status(200).json(existing);
      }
      // If belongs to another customer, update owner to new customer
      const transferred = await prisma.vehicle.update({
        where: { id: existing.id },
        data: {
          customerId: data.customerId,
          make: data.make && data.make !== 'Unknown' ? data.make : existing.make,
          model: data.model && data.model !== 'Unknown' ? data.model : existing.model,
          year: data.year || existing.year,
          colour: data.colour || existing.colour,
          mileage: data.mileage || existing.mileage,
        }
      });
      return res.status(200).json(transferred);
    }

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
      return res.status(400).json({ error: error.errors[0]?.message || 'Validation Error' });
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

export const deleteVehicle = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            jobCards: true,
            invoices: true,
            maintenanceReminders: true
          }
        }
      }
    });

    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    if (vehicle._count.invoices > 0) {
      return res.status(400).json({
        error: `Cannot delete vehicle "${vehicle.registration}". It is linked to ${vehicle._count.invoices} invoice(s). Change or unlink the vehicle on those invoices first.`
      });
    }

    if (vehicle._count.jobCards > 0) {
      return res.status(400).json({
        error: `Cannot delete vehicle "${vehicle.registration}". It is linked to ${vehicle._count.jobCards} job card(s). Delete those job cards first.`
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.vehiclePhoto.deleteMany({ where: { vehicleId: id } });
      await tx.maintenanceReminder.deleteMany({ where: { vehicleId: id } });
      await tx.vehicle.delete({ where: { id } });
    });

    res.json({ message: `Vehicle "${vehicle.registration}" deleted successfully.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
};
