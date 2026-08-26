import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getDashboardData = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);
    weekAgo.setHours(0, 0, 0, 0);

    // 1. KPI: Today's Sales
    const todayInvoices = await prisma.invoice.findMany({
      where: { date: { gte: today }, status: { not: 'CANCELLED' } }
    });
    const todaySales = todayInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);

    // 2. KPI: Open Job Cards
    const openJobCardsCount = await prisma.jobCard.count({
      where: { status: { notIn: ['COMPLETED', 'DELIVERED', 'CANCELLED'] } }
    });

    // 3. KPI: Customer Outstanding
    const unpaidInvoices = await prisma.invoice.findMany({
      where: { balance: { gt: 0 }, status: { not: 'CANCELLED' } }
    });
    const customerOutstanding = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.balance), 0);

    // 4. KPI: Vehicles in Shop
    const vehiclesInShopCount = await prisma.jobCard.count({
      where: { status: { in: ['IN_PROGRESS', 'WAITING_FOR_PARTS', 'APPROVED', 'INSPECTION', 'COMPLETED'] } }
    });

    // 5. KPI: Today's Payments
    const todayPayments = await prisma.customerPayment.findMany({
      where: { date: { gte: today } }
    });
    const todaysPaymentsTotal = todayPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    // 6. KPI: Completed Today
    const completedTodayCount = await prisma.jobCard.count({
      where: { status: 'COMPLETED', updatedAt: { gte: today } } // Assuming completion updates the timestamp today
    });

    // 7. KPI: Vendor Outstanding
    const unpaidPurchases = await prisma.purchase.findMany({
      where: { balance: { gt: 0 }, status: { not: 'CANCELLED' } }
    });
    const vendorOutstanding = unpaidPurchases.reduce((sum, p) => sum + Number(p.balance), 0);

    // 8. KPI: Low Stock Alerts
    const products = await prisma.product.findMany({
      include: { stockLevels: true }
    });
    
    const lowStockItems: { name: string; stock: number; unit: string; min: number }[] = [];
    products.forEach(p => {
      const currentStock = p.stockLevels.reduce((sum, sl) => sum + Number(sl.quantity), 0);
      if (currentStock <= Number(p.reorderLevel)) {
        lowStockItems.push({
          name: p.name,
          stock: currentStock,
          unit: p.unitId ? 'unit' : 'pcs', // Need to fetch unit symbol if needed, simplified for now
          min: Number(p.reorderLevel)
        });
      }
    });

    // Sales Chart Data (Last 7 days)
    const salesData = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekAgo);
      d.setDate(d.getDate() + i);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);

      const dayInvoices = await prisma.invoice.findMany({
        where: {
          date: { gte: d, lt: nextD },
          status: { not: 'CANCELLED' }
        },
        include: {
          items: { include: { product: true } },
          jobCards: {
            include: { jobCard: { include: { materials: { include: { product: true } } } } }
          }
        }
      });

      let daySales = 0;
      let dayCost = 0;

      dayInvoices.forEach(inv => {
        daySales += Number(inv.total);
        inv.items.forEach(item => {
          if (item.product) dayCost += Number(item.quantity) * Number(item.product.avgCost || 0);
        });
        inv.jobCards.forEach(jc => {
          jc.jobCard.materials.forEach(mat => {
            if (mat.product) dayCost += Number(mat.quantity) * Number(mat.product.avgCost || 0);
          });
        });
      });

      salesData.push({
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        sales: daySales,
        cost: dayCost
      });
    }

    // Job Status Distribution
    const jobStatusGroups = await prisma.jobCard.groupBy({
      by: ['status'],
      _count: { id: true },
      where: { status: { not: 'CANCELLED' } }
    });

    const statusColors: Record<string, string> = {
      'IN_PROGRESS': '#D97706',
      'COMPLETED': '#16A34A',
      'WAITING_FOR_PARTS': '#DC2626',
      'INSPECTION': '#7C3AED',
      'APPROVED': '#2563EB',
      'DRAFT': '#9CA3AF',
      'DELIVERED': '#059669',
      'WAITING_FOR_CUSTOMER': '#F59E0B'
    };

    const statusLabels: Record<string, string> = {
      'IN_PROGRESS': 'In Progress',
      'COMPLETED': 'Completed',
      'WAITING_FOR_PARTS': 'Waiting Parts',
      'INSPECTION': 'Inspection',
      'APPROVED': 'Approved',
      'DRAFT': 'Draft',
      'DELIVERED': 'Delivered',
      'WAITING_FOR_CUSTOMER': 'Waiting Customer'
    };

    const jobStatusData = jobStatusGroups.map(g => ({
      name: statusLabels[g.status] || g.status,
      value: g._count.id,
      color: statusColors[g.status] || '#9CA3AF'
    })).filter(x => x.value > 0);

    // Service Revenue (simplified: just grouping invoice items for now, ideally group by actual services)
    // Here we query job card services for completed jobs in the last 30 days
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    
    const jcServices = await prisma.jobCardService.findMany({
      where: {
        jobCard: {
          date: { gte: last30Days },
          status: { not: 'CANCELLED' }
        }
      },
      include: { service: true }
    });

    const serviceRevMap: Record<string, number> = {};
    jcServices.forEach(jcs => {
      const name = jcs.service?.name || 'Other';
      if (!serviceRevMap[name]) serviceRevMap[name] = 0;
      serviceRevMap[name] += Number(jcs.total);
    });

    const serviceRevenueData = Object.entries(serviceRevMap)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6); // top 6

    // Recent Jobs
    const recentJobsData = await prisma.jobCard.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        vehicle: true,
        services: { include: { service: true } }
      }
    });

    const recentJobs = recentJobsData.map(j => {
      const serviceNames = j.services.map(s => s.service?.name).join(', ');
      
      let timeDiff = (new Date().getTime() - j.createdAt.getTime()) / 3600000;
      let timeStr = `${Math.floor(timeDiff)}h ago`;
      if (timeDiff > 24) {
        timeStr = `${Math.floor(timeDiff/24)}d ago`;
      }
      if (timeDiff < 1) {
        timeStr = 'Just now';
      }

      return {
        id: j.jobNumber,
        customer: j.customer.name,
        vehicle: `${j.vehicle.make} ${j.vehicle.model} · ${j.vehicle.registration}`,
        service: serviceNames || 'No Services',
        status: j.status,
        priority: j.priority,
        time: timeStr
      };
    });

    // Recent Invoices
    const recentInvoicesData = await prisma.invoice.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { customer: true }
    });

    const recentInvoices = recentInvoicesData.map(inv => {
      let dateStr = 'Today';
      const invDate = inv.date;
      invDate.setHours(0,0,0,0);
      if (invDate.getTime() < today.getTime()) {
        dateStr = 'Yesterday';
        if (today.getTime() - invDate.getTime() > 86400000) {
           dateStr = invDate.toLocaleDateString();
        }
      }

      return {
        id: inv.invoiceNumber,
        customer: inv.customer.name,
        amount: Number(inv.total),
        status: inv.status,
        date: dateStr
      };
    });

    res.json({
      kpis: {
        todaySales,
        openJobCardsCount,
        customerOutstanding,
        vehiclesInShopCount,
        todaysPaymentsTotal,
        completedTodayCount,
        vendorOutstanding,
        lowStockCount: lowStockItems.length
      },
      salesData,
      jobStatusData,
      serviceRevenueData,
      recentJobs,
      recentInvoices,
      lowStockItems: lowStockItems.slice(0, 5) // Send max 5
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};
