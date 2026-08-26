import { api } from './client'

export interface DashboardData {
  kpis: {
    todaySales: number
    openJobCardsCount: number
    customerOutstanding: number
    vehiclesInShopCount: number
    todaysPaymentsTotal: number
    completedTodayCount: number
    vendorOutstanding: number
    lowStockCount: number
  }
  salesData: {
    day: string
    sales: number
    cost: number
  }[]
  jobStatusData: {
    name: string
    value: number
    color: string
  }[]
  serviceRevenueData: {
    name: string
    revenue: number
  }[]
  recentJobs: {
    id: string
    customer: string
    vehicle: string
    service: string
    status: string
    priority: string
    time: string
  }[]
  recentInvoices: {
    id: string
    customer: string
    amount: number
    status: string
    date: string
  }[]
  lowStockItems: {
    name: string
    stock: number
    unit: string
    min: number
  }[]
}

export const getDashboardData = async (): Promise<DashboardData> => {
  const response = await api.get('/dashboard')
  return response.data
}
