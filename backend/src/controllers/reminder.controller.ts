import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

export const getReminders = async (req: Request, res: Response) => {
  try {
    const { status, timeframe, search, customerId, vehicleId, jobCardId } = req.query;
    const where: any = {};

    if (customerId) where.customerId = Number(customerId);
    if (vehicleId) where.vehicleId = Number(vehicleId);
    if (jobCardId) where.jobCardId = Number(jobCardId);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekEnd = new Date(todayStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    if (timeframe === 'OVERDUE') {
      where.reminderDate = { lt: todayStart };
      where.status = { notIn: ['COMPLETED', 'CANCELLED'] };
    } else if (timeframe === 'DUE_THIS_WEEK') {
      where.reminderDate = { gte: todayStart, lte: weekEnd };
      where.status = { notIn: ['COMPLETED', 'CANCELLED'] };
    } else if (timeframe === 'SCHEDULED') {
      where.status = 'SCHEDULED';
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { serviceName: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { mobile: { contains: search } } },
        { vehicle: { registration: { contains: search } } },
        { vehicle: { make: { contains: search } } },
        { vehicle: { model: { contains: search } } },
      ];
    }

    const reminders = await prisma.maintenanceReminder.findMany({
      where,
      include: {
        customer: { select: { id: true, code: true, name: true, mobile: true, email: true } },
        vehicle: { select: { id: true, registration: true, make: true, model: true, colour: true } },
        jobCard: { select: { id: true, jobNumber: true, date: true } },
        followups: {
          orderBy: { contactDate: 'desc' },
          include: { createdBy: { select: { id: true, fullName: true } } }
        }
      },
      orderBy: { reminderDate: 'asc' }
    });

    const enriched = reminders.map(r => {
      const rDate = new Date(r.reminderDate);
      const isOverdue = rDate < todayStart && r.status !== 'COMPLETED' && r.status !== 'CANCELLED';
      const isDueToday = rDate.toDateString() === todayStart.toDateString();
      const isDueThisWeek = rDate >= todayStart && rDate <= weekEnd;

      return {
        ...r,
        isOverdue,
        isDueToday,
        isDueThisWeek,
        latestFollowup: r.followups.length > 0 ? r.followups[0] : null
      };
    });

    res.json(enriched);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch maintenance reminders' });
  }
};

export const getReminder = async (req: Request, res: Response) => {
  try {
    const reminder = await prisma.maintenanceReminder.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        customer: true,
        vehicle: true,
        jobCard: true,
        followups: {
          orderBy: { contactDate: 'desc' },
          include: { createdBy: { select: { id: true, fullName: true } } }
        }
      }
    });

    if (!reminder) return res.status(404).json({ error: 'Reminder not found' });
    res.json(reminder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch reminder' });
  }
};

const createReminderSchema = z.object({
  jobCardId: z.number().optional().nullable(),
  customerId: z.number().int(),
  vehicleId: z.number().int(),
  serviceName: z.string().min(1, 'Service name is required'),
  preset: z.enum([
    'SINGLE',
    'FOLLOWUP_1WK',
    'FOLLOWUP_2WK',
    'COATING_1YR',
    'COATING_2YR',
    'COATING_3YR',
    'COATING_5YR',
    'GENERAL_MAINTENANCE',
    'CUSTOM'
  ]).default('COATING_1YR'),
  startDate: z.string().or(z.date()).optional(),
  reminderDate: z.string().or(z.date()).optional(),
  intervalLabel: z.string().optional(),
  notes: z.string().optional().nullable(),
  customIntervals: z.array(z.object({
    reminderDate: z.string().or(z.date()),
    intervalLabel: z.string(),
    serviceName: z.string().optional()
  })).optional()
});

export const createReminderSchedule = async (req: Request, res: Response) => {
  try {
    const data = createReminderSchema.parse(req.body);
    const baseDate = data.startDate ? new Date(data.startDate) : new Date();

    const presetsMap: Record<string, { days?: number; months?: number; label: string; desc: string }[]> = {
      FOLLOWUP_1WK: [
        { days: 7, label: '1 Week', desc: `${data.serviceName} - 1-Week Initial Check & Hydrophobic Wash` }
      ],
      FOLLOWUP_2WK: [
        { days: 14, label: '2 Weeks', desc: `${data.serviceName} - 2-Weeks Follow-up Inspection & Wash` }
      ],
      COATING_1YR: [
        { days: 21, label: '3 Weeks', desc: `${data.serviceName} - 3-Week Initial Inspection & Wash` },
        { months: 6, label: '6 Months', desc: `${data.serviceName} - 6-Month Booster & Decon Wash` },
        { months: 12, label: '1 Year', desc: `${data.serviceName} - 1-Year Annual Inspection & Warranty Validation` },
      ],
      COATING_2YR: [
        { days: 21, label: '3 Weeks', desc: `${data.serviceName} - 3-Week Initial Inspection & Wash` },
        { months: 6, label: '6 Months', desc: `${data.serviceName} - 6-Month Booster & Decon Wash` },
        { months: 12, label: '1 Year', desc: `${data.serviceName} - 1-Year Annual Inspection & Re-boost` },
        { months: 18, label: '18 Months', desc: `${data.serviceName} - 18-Month Maintenance Inspection` },
        { months: 24, label: '2 Years', desc: `${data.serviceName} - 2-Year Warranty Inspection & Final Top-up` },
      ],
      COATING_3YR: [
        { days: 21, label: '3 Weeks', desc: `${data.serviceName} - 3-Week Initial Inspection & Wash` },
        { months: 6, label: '6 Months', desc: `${data.serviceName} - 6-Month Booster & Decon Wash` },
        { months: 12, label: '1 Year', desc: `${data.serviceName} - 1-Year Annual Inspection & Re-boost` },
        { months: 18, label: '18 Months', desc: `${data.serviceName} - 18-Month Maintenance Inspection` },
        { months: 24, label: '2 Years', desc: `${data.serviceName} - 2-Year Annual Re-boost` },
        { months: 30, label: '30 Months', desc: `${data.serviceName} - 30-Month Maintenance Inspection` },
        { months: 36, label: '3 Years', desc: `${data.serviceName} - 3-Year Warranty Inspection & Final Top-up` },
      ],
      COATING_5YR: [
        { days: 21, label: '3 Weeks', desc: `${data.serviceName} - 3-Week Initial Inspection & Wash` },
        { months: 6, label: '6 Months', desc: `${data.serviceName} - 6-Month Booster & Decon Wash` },
        { months: 12, label: '1 Year', desc: `${data.serviceName} - 1-Year Annual Inspection & Re-boost` },
        { months: 18, label: '18 Months', desc: `${data.serviceName} - 18-Month Maintenance Inspection` },
        { months: 24, label: '2 Years', desc: `${data.serviceName} - 2-Year Annual Re-boost` },
        { months: 30, label: '30 Months', desc: `${data.serviceName} - 30-Month Maintenance Inspection` },
        { months: 36, label: '3 Years', desc: `${data.serviceName} - 3-Year Annual Re-boost` },
        { months: 42, label: '42 Months', desc: `${data.serviceName} - 42-Month Maintenance Inspection` },
        { months: 48, label: '4 Years', desc: `${data.serviceName} - 4-Year Annual Re-boost` },
        { months: 54, label: '54 Months', desc: `${data.serviceName} - 54-Month Maintenance Inspection` },
        { months: 60, label: '5 Years', desc: `${data.serviceName} - 5-Year Final Warranty Inspection` },
      ],
      GENERAL_MAINTENANCE: [
        { months: 3, label: '3 Months', desc: `${data.serviceName} - 3-Month Fluid & Filter Check` },
        { months: 6, label: '6 Months', desc: `${data.serviceName} - 6-Month General Maintenance Service` },
      ],
    };

    if (presetsMap[data.preset]) {
      const scheduleItems = presetsMap[data.preset];
      const created = [];
      for (const item of scheduleItems) {
        const targetDate = new Date(baseDate);
        if (item.days) {
          targetDate.setDate(targetDate.getDate() + item.days);
        } else if (item.months) {
          targetDate.setMonth(targetDate.getMonth() + item.months);
        }

        const r = await prisma.maintenanceReminder.create({
          data: {
            jobCardId: data.jobCardId,
            customerId: data.customerId,
            vehicleId: data.vehicleId,
            serviceName: item.desc,
            reminderDate: targetDate,
            intervalLabel: item.label,
            status: 'PENDING',
            notes: data.notes
          }
        });
        created.push(r);
      }

      return res.status(201).json({ message: `Created ${created.length} periodic maintenance reminders`, reminders: created });
    }

    if (data.preset === 'CUSTOM' && data.customIntervals && data.customIntervals.length > 0) {
      const created = [];
      for (const item of data.customIntervals) {
        const r = await prisma.maintenanceReminder.create({
          data: {
            jobCardId: data.jobCardId,
            customerId: data.customerId,
            vehicleId: data.vehicleId,
            serviceName: item.serviceName || data.serviceName,
            reminderDate: new Date(item.reminderDate),
            intervalLabel: item.intervalLabel,
            status: 'PENDING',
            notes: data.notes
          }
        });
        created.push(r);
      }
      return res.status(201).json({ message: `Created ${created.length} custom reminders`, reminders: created });
    }

    // Single reminder
    const single = await prisma.maintenanceReminder.create({
      data: {
        jobCardId: data.jobCardId,
        customerId: data.customerId,
        vehicleId: data.vehicleId,
        serviceName: data.serviceName,
        reminderDate: new Date(data.reminderDate || baseDate),
        intervalLabel: data.intervalLabel || 'Scheduled',
        status: 'PENDING',
        notes: data.notes
      }
    });

    res.status(201).json({ message: 'Reminder created successfully', reminder: single });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation Error', details: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create reminder schedule' });
  }
};

export const updateReminder = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status, scheduledDate, notes, reminderDate } = req.body;

    const existing = await prisma.maintenanceReminder.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Reminder not found' });

    const updated = await prisma.$transaction(async (tx) => {
      const reminder = await tx.maintenanceReminder.update({
        where: { id },
        data: {
          status: status || undefined,
          scheduledDate: scheduledDate ? new Date(scheduledDate) : (scheduledDate === null ? null : undefined),
          notes: notes !== undefined ? notes : undefined,
          reminderDate: reminderDate ? new Date(reminderDate) : undefined,
        },
        include: {
          customer: true,
          vehicle: true,
          followups: { orderBy: { contactDate: 'desc' } }
        }
      });

      // Record a followup history entry if notes or status changed
      if (notes || status || scheduledDate) {
        let respLabel = status || 'UPDATE';
        if (status === 'COMPLETED') respLabel = 'COMPLETED';
        else if (status === 'SCHEDULED' || scheduledDate) respLabel = 'RESCHEDULED';

        await tx.reminderFollowup.create({
          data: {
            reminderId: id,
            channel: 'PHONE',
            contacted: true,
            response: respLabel,
            scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
            notes: notes || (status ? `Status updated to ${status}` : 'Reminder updated')
          }
        });
      }

      return reminder;
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update reminder' });
  }
};

export const deleteReminder = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await prisma.maintenanceReminder.delete({ where: { id } });
    res.json({ message: 'Reminder deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete reminder' });
  }
};

const followupSchema = z.object({
  channel: z.enum(['PHONE', 'WHATSAPP', 'SMS', 'IN_PERSON']).default('PHONE'),
  contacted: z.boolean().default(true),
  response: z.string().min(1, 'Customer response is required'),
  scheduledDate: z.string().or(z.date()).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const addFollowup = async (req: Request, res: Response) => {
  try {
    const reminderId = Number(req.params.id);
    const data = followupSchema.parse(req.body);

    const reminder = await prisma.maintenanceReminder.findUnique({
      where: { id: reminderId }
    });
    if (!reminder) return res.status(404).json({ error: 'Reminder not found' });

    let newStatus = reminder.status;
    if (data.scheduledDate || data.response === 'CONFIRMED_BOOKING' || data.response.toLowerCase().includes('booking')) {
      newStatus = 'SCHEDULED';
    } else if (data.response === 'COMPLETED' || data.response.toLowerCase().includes('completed')) {
      newStatus = 'COMPLETED';
    } else if (data.contacted) {
      newStatus = 'CONTACTED';
    }

    const scheduledDateObj = data.scheduledDate ? new Date(data.scheduledDate) : null;

    const result = await prisma.$transaction(async (tx) => {
      const followup = await tx.reminderFollowup.create({
        data: {
          reminderId,
          channel: data.channel,
          contacted: data.contacted,
          response: data.response,
          scheduledDate: scheduledDateObj,
          notes: data.notes,
        }
      });

      const updatedReminder = await tx.maintenanceReminder.update({
        where: { id: reminderId },
        data: {
          status: newStatus,
          scheduledDate: scheduledDateObj || reminder.scheduledDate,
        },
        include: {
          customer: true,
          vehicle: true,
          followups: { orderBy: { contactDate: 'desc' } }
        }
      });

      return { followup, reminder: updatedReminder };
    });

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation Error', details: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to record followup' });
  }
};
