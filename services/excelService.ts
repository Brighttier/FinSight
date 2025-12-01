import * as XLSX from 'xlsx';
import { format, parse, isValid } from 'date-fns';
import type { Transaction, Subscription, Partner } from '../types';

// Template column definitions
const TRANSACTION_COLUMNS = [
  'Date (YYYY-MM-DD)',
  'Description',
  'Category',
  'Type (revenue/expense)',
  'Amount',
  'Status (draft/posted)',
];

const SUBSCRIPTION_COLUMNS = [
  'Name',
  'Cost',
  'Billing Cycle (monthly/annual)',
  'Next Billing Date (YYYY-MM-DD)',
  'Category',
  'Status (active/cancelled/paused)',
];

const PARTNER_COLUMNS = [
  'Name',
  'Email',
  'Share Percentage (0-100)',
  'Role',
  'Status (active/inactive)',
];

// Sample data for templates
const TRANSACTION_SAMPLE = [
  ['2024-01-15', 'Client Project Payment', 'Income', 'revenue', 5000, 'posted'],
  ['2024-01-20', 'Office Supplies', 'Operations', 'expense', 250, 'posted'],
  ['2024-01-25', 'Software License', 'Technology', 'expense', 99, 'draft'],
];

const SUBSCRIPTION_SAMPLE = [
  ['Adobe Creative Cloud', 54.99, 'monthly', '2024-02-01', 'Software', 'active'],
  ['AWS Hosting', 150, 'monthly', '2024-02-05', 'Infrastructure', 'active'],
  ['Annual Insurance', 2400, 'annual', '2024-12-01', 'Insurance', 'active'],
];

const PARTNER_SAMPLE = [
  ['John Smith', 'john@example.com', 40, 'Partner', 'active'],
  ['Jane Doe', 'jane@example.com', 30, 'Director', 'active'],
  ['Bob Wilson', 'bob@example.com', 30, 'Partner', 'inactive'],
];

// Generate Excel template with sample data
export function generateTransactionTemplate(): Blob {
  const ws = XLSX.utils.aoa_to_sheet([
    TRANSACTION_COLUMNS,
    ...TRANSACTION_SAMPLE,
  ]);

  // Set column widths
  ws['!cols'] = [
    { wch: 15 }, // Date
    { wch: 30 }, // Description
    { wch: 15 }, // Category
    { wch: 20 }, // Type
    { wch: 12 }, // Amount
    { wch: 18 }, // Status
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

  // Add instructions sheet
  const instructions = [
    ['FinSight Transaction Import Template'],
    [''],
    ['Instructions:'],
    ['1. Fill in your transaction data starting from row 2'],
    ['2. Keep the header row (row 1) unchanged'],
    ['3. Date format: YYYY-MM-DD (e.g., 2024-01-15)'],
    ['4. Type must be: revenue or expense'],
    ['5. Status must be: draft or posted'],
    ['6. Amount should be a positive number'],
    ['7. Delete the sample data rows before uploading'],
    [''],
    ['Categories (suggestions):'],
    ['- Income, Sales, Consulting, Projects'],
    ['- Operations, Marketing, Payroll, Technology'],
    ['- Utilities, Rent, Insurance, Travel'],
  ];
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions['!cols'] = [{ wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function generateSubscriptionTemplate(): Blob {
  const ws = XLSX.utils.aoa_to_sheet([
    SUBSCRIPTION_COLUMNS,
    ...SUBSCRIPTION_SAMPLE,
  ]);

  ws['!cols'] = [
    { wch: 25 }, // Name
    { wch: 12 }, // Cost
    { wch: 25 }, // Billing Cycle
    { wch: 25 }, // Next Billing Date
    { wch: 15 }, // Category
    { wch: 25 }, // Status
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Subscriptions');

  const instructions = [
    ['FinSight Subscription Import Template'],
    [''],
    ['Instructions:'],
    ['1. Fill in your subscription data starting from row 2'],
    ['2. Keep the header row (row 1) unchanged'],
    ['3. Cost should be a positive number'],
    ['4. Billing Cycle: monthly or annual'],
    ['5. Next Billing Date format: YYYY-MM-DD'],
    ['6. Status: active, cancelled, or paused'],
    ['7. Delete the sample data rows before uploading'],
  ];
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions['!cols'] = [{ wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function generatePartnerTemplate(): Blob {
  const ws = XLSX.utils.aoa_to_sheet([
    PARTNER_COLUMNS,
    ...PARTNER_SAMPLE,
  ]);

  ws['!cols'] = [
    { wch: 25 }, // Name
    { wch: 30 }, // Email
    { wch: 25 }, // Share Percentage
    { wch: 15 }, // Role
    { wch: 20 }, // Status
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Partners');

  const instructions = [
    ['FinSight Partner Import Template'],
    [''],
    ['Instructions:'],
    ['1. Fill in your partner data starting from row 2'],
    ['2. Keep the header row (row 1) unchanged'],
    ['3. Share Percentage: 0-100 (total should equal 100)'],
    ['4. Status: active or inactive'],
    ['5. Email must be a valid email address'],
    ['6. Delete the sample data rows before uploading'],
  ];
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions['!cols'] = [{ wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Download helper
export function downloadTemplate(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Parse uploaded Excel file
export async function parseExcelFile(file: File): Promise<any[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
        resolve(jsonData);
      } catch (err) {
        reject(new Error('Failed to parse Excel file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

// Parse date string to YYYY-MM-DD format
function parseDate(value: any): string | null {
  if (!value) return null;

  // If it's already a string in correct format
  if (typeof value === 'string') {
    const parsed = parse(value, 'yyyy-MM-dd', new Date());
    if (isValid(parsed)) {
      return format(parsed, 'yyyy-MM-dd');
    }
    // Try other formats
    const formats = ['MM/dd/yyyy', 'dd/MM/yyyy', 'yyyy/MM/dd', 'M/d/yyyy'];
    for (const fmt of formats) {
      const p = parse(value, fmt, new Date());
      if (isValid(p)) {
        return format(p, 'yyyy-MM-dd');
      }
    }
  }

  // If it's an Excel serial date number
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }

  return null;
}

// Validate and parse transactions from Excel data
export function parseTransactions(data: any[][], userId: string): { valid: Omit<Transaction, 'id'>[]; errors: string[] } {
  const valid: Omit<Transaction, 'id'>[] = [];
  const errors: string[] = [];

  // Skip header row
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0 || !row[0]) continue; // Skip empty rows

    const date = parseDate(row[0]);
    const description = String(row[1] || '').trim();
    const category = String(row[2] || '').trim();
    const type = String(row[3] || '').toLowerCase().trim();
    const amount = parseFloat(row[4]);
    const status = String(row[5] || 'draft').toLowerCase().trim();

    const rowErrors: string[] = [];

    if (!date) rowErrors.push('Invalid date format');
    if (!description) rowErrors.push('Description is required');
    if (!category) rowErrors.push('Category is required');
    if (!['revenue', 'expense'].includes(type)) rowErrors.push('Type must be revenue or expense');
    if (isNaN(amount) || amount <= 0) rowErrors.push('Amount must be a positive number');
    if (!['draft', 'posted'].includes(status)) rowErrors.push('Status must be draft or posted');

    if (rowErrors.length > 0) {
      errors.push(`Row ${i + 1}: ${rowErrors.join(', ')}`);
    } else {
      valid.push({
        userId,
        date: date!,
        description,
        category,
        type: type as 'revenue' | 'expense',
        amount,
        status: status as 'draft' | 'posted',
      });
    }
  }

  return { valid, errors };
}

// Validate and parse subscriptions from Excel data
export function parseSubscriptions(data: any[][], userId: string): { valid: Omit<Subscription, 'id'>[]; errors: string[] } {
  const valid: Omit<Subscription, 'id'>[] = [];
  const errors: string[] = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0 || !row[0]) continue;

    const name = String(row[0] || '').trim();
    const cost = parseFloat(row[1]);
    const billingCycle = String(row[2] || '').toLowerCase().trim();
    const nextBillingDate = parseDate(row[3]);
    const category = String(row[4] || '').trim();
    const status = String(row[5] || 'active').toLowerCase().trim();

    const rowErrors: string[] = [];

    if (!name) rowErrors.push('Name is required');
    if (isNaN(cost) || cost <= 0) rowErrors.push('Cost must be a positive number');
    if (!['monthly', 'annual'].includes(billingCycle)) rowErrors.push('Billing cycle must be monthly or annual');
    if (!nextBillingDate) rowErrors.push('Invalid next billing date format');
    if (!['active', 'cancelled', 'paused'].includes(status)) rowErrors.push('Status must be active, cancelled, or paused');

    if (rowErrors.length > 0) {
      errors.push(`Row ${i + 1}: ${rowErrors.join(', ')}`);
    } else {
      valid.push({
        userId,
        name,
        cost,
        billingCycle: billingCycle as 'monthly' | 'annual',
        nextBillingDate: nextBillingDate!,
        category: category || 'General',
        status: status as 'active' | 'cancelled' | 'paused',
      });
    }
  }

  return { valid, errors };
}

// Validate and parse partners from Excel data
export function parsePartners(data: any[][], userId: string): { valid: Omit<Partner, 'id'>[]; errors: string[] } {
  const valid: Omit<Partner, 'id'>[] = [];
  const errors: string[] = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0 || !row[0]) continue;

    const name = String(row[0] || '').trim();
    const email = String(row[1] || '').trim();
    const sharePercentage = parseFloat(row[2]);
    const role = String(row[3] || '').trim();
    const status = String(row[4] || 'active').toLowerCase().trim();

    const rowErrors: string[] = [];

    if (!name) rowErrors.push('Name is required');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) rowErrors.push('Valid email is required');
    if (isNaN(sharePercentage) || sharePercentage <= 0 || sharePercentage > 100) {
      rowErrors.push('Share percentage must be between 1 and 100');
    }
    if (!role) rowErrors.push('Role is required');
    if (!['active', 'inactive'].includes(status)) rowErrors.push('Status must be active or inactive');

    if (rowErrors.length > 0) {
      errors.push(`Row ${i + 1}: ${rowErrors.join(', ')}`);
    } else {
      valid.push({
        userId,
        name,
        email,
        sharePercentage,
        role,
        status: status as 'active' | 'inactive',
      });
    }
  }

  return { valid, errors };
}
