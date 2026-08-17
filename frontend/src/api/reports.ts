import { api } from './client';

export interface SalesReportSummary {
  totalRevenue: number;
  totalCollected: number;
  totalOutstanding: number;
  invoiceCount: number;
}

export interface SalesReportResponse {
  summary: SalesReportSummary;
  invoices: any[];
}

export const getSalesReports = async (startDate?: string, endDate?: string): Promise<SalesReportResponse> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const { data } = await api.get(`/reports/sales?${params.toString()}`);
  return data;
};

export interface InventoryReportSummary {
  totalInventoryValue: number;
  totalItems: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface InventoryReportResponse {
  summary: InventoryReportSummary;
  inventory: any[];
}

export const getInventoryReports = async (): Promise<InventoryReportResponse> => {
  const { data } = await api.get('/reports/inventory');
  return data;
};

export interface ProfitabilityReportResponse {
  totalRevenue: number;
  totalCogs: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
}

export const getProfitabilityReports = async (startDate?: string, endDate?: string): Promise<ProfitabilityReportResponse> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const { data } = await api.get(`/reports/profitability?${params.toString()}`);
  return data;
};

export interface FinancialReportResponse {
  cashIn: number;
  cashOut: number;
  vendorCashOut: number;
  expenseCashOut: number;
  netCashFlow: number;
  accountsReceivable: number;
  accountsPayable: number;
}

export const getFinancialReports = async (startDate?: string, endDate?: string): Promise<FinancialReportResponse> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const { data } = await api.get(`/reports/financial?${params.toString()}`);
  return data;
};
