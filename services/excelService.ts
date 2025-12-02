import * as XLSX from 'xlsx';
import { format, parse, isValid } from 'date-fns';
import type { Transaction, Subscription, Partner, ContractorTimesheetInput, ContractorAssignment, CurrencyCode } from '../types';
import { convertToUSD, getExchangeRate } from './currencyService';

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

// ============ TIMESHEET EXCEL FUNCTIONS ============

const TIMESHEET_COLUMNS = [
  'Contractor Name',
  'Customer Name',
  'Month (YYYY-MM)',
  'Standard Days Worked',
  'Overtime Days',
  'Overtime Hours',
  'Status (draft/submitted/approved)',
];

const TIMESHEET_SAMPLE = [
  ['John Doe', 'Acme Corp', '2024-12', 20, 2, 4, 'draft'],
  ['Jane Smith', 'TechCo', '2024-12', 18, 0, 0, 'submitted'],
];

export interface TimesheetUploadRow {
  contractorName: string;
  customerName: string;
  month: string;
  standardDaysWorked: number;
  overtimeDays: number;
  overtimeHours: number;
  status: 'draft' | 'submitted' | 'approved';
}

export interface TimesheetUploadResult {
  success: boolean;
  data?: TimesheetUploadRow[];
  errors?: string[];
  warnings?: string[];
}

/**
 * Generate and download the timesheet upload template Excel file
 */
export function generateTimesheetTemplate(): Blob {
  const ws = XLSX.utils.aoa_to_sheet([
    TIMESHEET_COLUMNS,
    ...TIMESHEET_SAMPLE,
  ]);

  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // Contractor Name
    { wch: 20 }, // Customer Name
    { wch: 15 }, // Month
    { wch: 20 }, // Standard Days
    { wch: 15 }, // Overtime Days
    { wch: 15 }, // Overtime Hours
    { wch: 25 }, // Status
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Timesheets');

  // Create instructions sheet
  const instructionsData = [
    ['Timesheet Bulk Upload Instructions'],
    [''],
    ['Column Descriptions:'],
    ['Contractor Name', 'Must match an existing contractor name exactly'],
    ['Customer Name', 'Must match an existing customer name exactly'],
    ['Month (YYYY-MM)', 'Format: YYYY-MM (e.g., 2024-12 for December 2024)'],
    ['Standard Days Worked', 'Number of standard working days (0-31, decimals allowed)'],
    ['Overtime Days', 'Number of overtime days (decimals allowed)'],
    ['Overtime Hours', 'Number of overtime hours (decimals allowed)'],
    ['Status', 'One of: draft, submitted, approved'],
    [''],
    ['Important Notes:'],
    ['- The contractor must have an active assignment with the specified customer'],
    ['- Duplicate entries for same contractor/customer/month will be flagged'],
    ['- Delete the sample rows (rows 2-3) before uploading your data'],
    ['- Names are case-insensitive but must match exactly'],
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
  wsInstructions['!cols'] = [{ wch: 25 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Parse uploaded Excel file and validate timesheet data
 */
export function parseTimesheetExcel(data: any[][]): TimesheetUploadResult {
  if (data.length < 2) {
    return {
      success: false,
      errors: ['File is empty or contains only headers'],
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const parsedRows: TimesheetUploadRow[] = [];

  // Skip header row
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 1;

    // Skip empty rows
    if (!row || row.every((cell: any) => !cell && cell !== 0)) {
      continue;
    }

    const contractorName = String(row[0] || '').trim();
    const customerName = String(row[1] || '').trim();
    const month = String(row[2] || '').trim();
    const standardDaysWorked = parseFloat(row[3]) || 0;
    const overtimeDays = parseFloat(row[4]) || 0;
    const overtimeHours = parseFloat(row[5]) || 0;
    const status = String(row[6] || 'draft').toLowerCase().trim() as 'draft' | 'submitted' | 'approved';

    const rowErrors: string[] = [];

    // Validate required fields
    if (!contractorName) {
      rowErrors.push('Contractor Name is required');
    }
    if (!customerName) {
      rowErrors.push('Customer Name is required');
    }
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      rowErrors.push('Month must be in YYYY-MM format');
    }

    // Validate status
    if (!['draft', 'submitted', 'approved'].includes(status)) {
      rowErrors.push('Status must be draft, submitted, or approved');
    }

    // Validate numeric values
    if (standardDaysWorked < 0 || standardDaysWorked > 31) {
      rowErrors.push('Standard Days must be between 0 and 31');
    }
    if (overtimeDays < 0) {
      rowErrors.push('Overtime Days cannot be negative');
    }
    if (overtimeHours < 0) {
      rowErrors.push('Overtime Hours cannot be negative');
    }

    if (rowErrors.length > 0) {
      errors.push(`Row ${rowNum}: ${rowErrors.join(', ')}`);
    } else {
      parsedRows.push({
        contractorName,
        customerName,
        month,
        standardDaysWorked,
        overtimeDays,
        overtimeHours,
        status,
      });
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  if (parsedRows.length === 0) {
    return {
      success: false,
      errors: ['No valid data rows found in the file'],
    };
  }

  return {
    success: true,
    data: parsedRows,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Match parsed timesheet rows to assignments and prepare for database insertion
 */
export function matchTimesheetsToAssignments(
  rows: TimesheetUploadRow[],
  assignments: ContractorAssignment[]
): {
  matched: { row: TimesheetUploadRow; assignment: ContractorAssignment }[];
  unmatched: { row: TimesheetUploadRow; reason: string }[];
} {
  const matched: { row: TimesheetUploadRow; assignment: ContractorAssignment }[] = [];
  const unmatched: { row: TimesheetUploadRow; reason: string }[] = [];

  rows.forEach((row) => {
    // Find matching assignment (case-insensitive)
    const assignment = assignments.find(
      (a) =>
        a.contractorName.toLowerCase() === row.contractorName.toLowerCase() &&
        a.customerName.toLowerCase() === row.customerName.toLowerCase() &&
        a.status === 'active'
    );

    if (!assignment) {
      // Check if names exist but assignment is not active
      const inactiveAssignment = assignments.find(
        (a) =>
          a.contractorName.toLowerCase() === row.contractorName.toLowerCase() &&
          a.customerName.toLowerCase() === row.customerName.toLowerCase()
      );

      if (inactiveAssignment) {
        unmatched.push({
          row,
          reason: `Assignment for ${row.contractorName} → ${row.customerName} is not active (status: ${inactiveAssignment.status})`,
        });
      } else {
        unmatched.push({
          row,
          reason: `No assignment found for ${row.contractorName} → ${row.customerName}`,
        });
      }
      return;
    }

    matched.push({ row, assignment });
  });

  return { matched, unmatched };
}

/**
 * Convert matched rows to timesheet input objects ready for database insertion
 */
export function convertToTimesheetInputs(
  matched: { row: TimesheetUploadRow; assignment: ContractorAssignment }[]
): ContractorTimesheetInput[] {
  return matched.map(({ row, assignment }) => {
    const standardDaysWorked = row.standardDaysWorked;
    const overtimeDays = row.overtimeDays;
    const overtimeHours = row.overtimeHours;
    const totalDaysWorked = standardDaysWorked + overtimeDays + overtimeHours / 8;

    // Get exchange rate for conversion
    const exchangeRate = getExchangeRate(assignment.internalCurrency);
    const internalDayRateUSD = convertToUSD(assignment.internalDayRate, assignment.internalCurrency);

    // Calculate costs
    const internalCost = totalDaysWorked * assignment.internalDayRate;
    const internalCostUSD = totalDaysWorked * internalDayRateUSD;
    const externalRevenue = totalDaysWorked * assignment.externalDayRate;
    const profit = externalRevenue - internalCostUSD;

    return {
      assignmentId: assignment.id,
      contractorId: assignment.contractorId,
      contractorName: assignment.contractorName,
      customerId: assignment.customerId,
      customerName: assignment.customerName,
      month: row.month,
      standardDaysWorked,
      overtimeDays,
      overtimeHours,
      internalDayRate: assignment.internalDayRate,
      internalCurrency: assignment.internalCurrency,
      internalDayRateUSD,
      externalDayRate: assignment.externalDayRate,
      externalCurrency: assignment.externalCurrency,
      exchangeRate,
      totalDaysWorked,
      internalCost,
      internalCostUSD,
      externalRevenue,
      profit,
      status: row.status,
    };
  });
}

/**
 * Export timesheets to Excel file
 */
export function exportTimesheetsToExcel(
  timesheets: any[],
  filename: string = 'timesheets_export.xlsx'
): void {
  const exportData = timesheets.map((ts) => ({
    'Contractor': ts.contractorName,
    'Customer': ts.customerName,
    'Month': ts.month,
    'Days Worked': ts.totalDaysWorked,
    'Standard Days': ts.standardDaysWorked,
    'Overtime Days': ts.overtimeDays,
    'Overtime Hours': ts.overtimeHours,
    'Internal Cost': ts.internalCost?.toFixed(2) || 0,
    'Internal Cost (USD)': ts.internalCostUSD?.toFixed(2) || 0,
    'External Revenue': ts.externalRevenue?.toFixed(2) || 0,
    'Profit': ts.profit?.toFixed(2) || 0,
    'Status': ts.status,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // Contractor
    { wch: 20 }, // Customer
    { wch: 12 }, // Month
    { wch: 12 }, // Days Worked
    { wch: 14 }, // Standard Days
    { wch: 14 }, // Overtime Days
    { wch: 14 }, // Overtime Hours
    { wch: 14 }, // Internal Cost
    { wch: 18 }, // Internal Cost USD
    { wch: 16 }, // External Revenue
    { wch: 12 }, // Profit
    { wch: 10 }, // Status
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Timesheets');
  XLSX.writeFile(wb, filename);
}
