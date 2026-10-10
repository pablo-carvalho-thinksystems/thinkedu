import type { Invoice } from "./model.mjs";
export interface FamilyCharge {
  id: string;
  reference: string;
  status: string;
  due: string;
  amount: number;
  invoices: Invoice[];
}
export function consolidateInvoices(invoices: Invoice[]): FamilyCharge[];
