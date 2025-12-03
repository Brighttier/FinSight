import * as XLSX from 'xlsx';
import type { Candidate, CandidateInput, CandidateAvailability, CurrencyCode } from '../types';

// Template column headers mapping
const CANDIDATE_COLUMNS = [
  { key: 'name', header: 'Name', required: true },
  { key: 'email', header: 'Email', required: true },
  { key: 'phone', header: 'Phone', required: false },
  { key: 'currentCompany', header: 'Current Company', required: false },
  { key: 'currentRole', header: 'Current Role', required: false },
  { key: 'experience', header: 'Years of Experience', required: false },
  { key: 'skills', header: 'Skills (comma-separated)', required: false },
  { key: 'currentSalary', header: 'Current Salary', required: false },
  { key: 'currentSalaryCurrency', header: 'Current Salary Currency', required: false },
  { key: 'expectedSalary', header: 'Expected Salary', required: false },
  { key: 'expectedSalaryCurrency', header: 'Expected Salary Currency', required: false },
  { key: 'noticePeriod', header: 'Notice Period', required: false },
  { key: 'location', header: 'Location', required: false },
  { key: 'preferredLocations', header: 'Preferred Locations (comma-separated)', required: false },
  { key: 'education', header: 'Education', required: false },
  { key: 'linkedinUrl', header: 'LinkedIn URL', required: false },
  { key: 'portfolioUrl', header: 'Portfolio URL', required: false },
  { key: 'source', header: 'Source', required: false },
  { key: 'availability', header: 'Availability', required: false },
  { key: 'notes', header: 'Notes', required: false },
];

export interface ParsedCandidate extends CandidateInput {
  rowNumber: number;
  errors: string[];
}

export interface ParseResult {
  valid: ParsedCandidate[];
  invalid: ParsedCandidate[];
  totalRows: number;
}

/**
 * Download the candidate import template as an Excel file
 */
export function downloadCandidateTemplate(): void {
  // Create template data with headers and one example row
  const templateData = [
    CANDIDATE_COLUMNS.map(col => col.header),
    [
      'John Doe',
      'john.doe@email.com',
      '+1-555-0123',
      'Acme Corp',
      'Senior Developer',
      '5',
      'React, Node.js, TypeScript',
      '120000',
      'USD',
      '150000',
      'USD',
      '30 days',
      'New York, NY',
      'NYC, Remote',
      'BS Computer Science',
      'https://linkedin.com/in/johndoe',
      'https://github.com/johndoe',
      'LinkedIn',
      'available',
      'Great communication skills',
    ],
  ];

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(templateData);

  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // Name
    { wch: 25 }, // Email
    { wch: 15 }, // Phone
    { wch: 20 }, // Current Company
    { wch: 20 }, // Current Role
    { wch: 18 }, // Years of Experience
    { wch: 30 }, // Skills
    { wch: 15 }, // Current Salary
    { wch: 22 }, // Current Salary Currency
    { wch: 15 }, // Expected Salary
    { wch: 23 }, // Expected Salary Currency
    { wch: 15 }, // Notice Period
    { wch: 20 }, // Location
    { wch: 25 }, // Preferred Locations
    { wch: 25 }, // Education
    { wch: 35 }, // LinkedIn URL
    { wch: 35 }, // Portfolio URL
    { wch: 15 }, // Source
    { wch: 15 }, // Availability
    { wch: 30 }, // Notes
  ];

  // Create workbook and add worksheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Candidates');

  // Add a notes sheet with instructions
  const notesData = [
    ['Candidate Import Template Instructions'],
    [''],
    ['Required Fields:'],
    ['- Name: Full name of the candidate'],
    ['- Email: Valid email address (must be unique)'],
    [''],
    ['Optional Fields:'],
    ['- Phone: Phone number in any format'],
    ['- Current Company: Current employer name'],
    ['- Current Role: Current job title'],
    ['- Years of Experience: Numeric value (e.g., 5)'],
    ['- Skills: Comma-separated list (e.g., "React, Node.js, TypeScript")'],
    ['- Current Salary: Numeric value without currency symbol (e.g., 120000)'],
    ['- Current Salary Currency: Currency code (USD, INR, EUR, GBP, CAD, AUD, SGD)'],
    ['- Expected Salary: Numeric value without currency symbol'],
    ['- Expected Salary Currency: Currency code'],
    ['- Notice Period: Text (e.g., "30 days", "Immediate", "2 weeks")'],
    ['- Location: Current location'],
    ['- Preferred Locations: Comma-separated list'],
    ['- Education: Educational background'],
    ['- LinkedIn URL: Full LinkedIn profile URL'],
    ['- Portfolio URL: Portfolio or GitHub URL'],
    ['- Source: Where the candidate was found (LinkedIn, Referral, Job Board, etc.)'],
    ['- Availability: One of: available, not_looking, placed, blacklisted'],
    ['- Notes: Any additional notes'],
    [''],
    ['Tips:'],
    ['- Delete the example row before importing'],
    ['- Duplicate emails will be skipped during import'],
    ['- Leave cells empty for fields you don\'t have data for'],
  ];
  const notesWs = XLSX.utils.aoa_to_sheet(notesData);
  notesWs['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, notesWs, 'Instructions');

  // Generate and download the file
  XLSX.writeFile(wb, 'candidate_import_template.xlsx');
}

/**
 * Parse an Excel file and extract candidate data
 */
export async function parseCandidateExcel(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Get the first sheet (should be "Candidates")
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
          defval: '',
          raw: false,
        });

        const valid: ParsedCandidate[] = [];
        const invalid: ParsedCandidate[] = [];

        jsonData.forEach((row, index) => {
          const candidate = parseRow(row, index + 2); // +2 for header row and 1-based index

          if (candidate.errors.length === 0) {
            valid.push(candidate);
          } else {
            invalid.push(candidate);
          }
        });

        resolve({
          valid,
          invalid,
          totalRows: jsonData.length,
        });
      } catch (error) {
        reject(new Error('Failed to parse Excel file. Please ensure it\'s a valid .xlsx file.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse a single row from the Excel file
 */
function parseRow(row: Record<string, any>, rowNumber: number): ParsedCandidate {
  const errors: string[] = [];

  // Get values using header names
  const name = getString(row, 'Name');
  const email = getString(row, 'Email');
  const phone = getString(row, 'Phone');
  const currentCompany = getString(row, 'Current Company');
  const currentRole = getString(row, 'Current Role');
  const experienceStr = getString(row, 'Years of Experience');
  const skillsStr = getString(row, 'Skills (comma-separated)');
  const currentSalaryStr = getString(row, 'Current Salary');
  const currentSalaryCurrency = getString(row, 'Current Salary Currency');
  const expectedSalaryStr = getString(row, 'Expected Salary');
  const expectedSalaryCurrency = getString(row, 'Expected Salary Currency');
  const noticePeriod = getString(row, 'Notice Period');
  const location = getString(row, 'Location');
  const preferredLocationsStr = getString(row, 'Preferred Locations (comma-separated)');
  const education = getString(row, 'Education');
  const linkedinUrl = getString(row, 'LinkedIn URL');
  const portfolioUrl = getString(row, 'Portfolio URL');
  const source = getString(row, 'Source');
  const availabilityStr = getString(row, 'Availability');
  const notes = getString(row, 'Notes');

  // Validate required fields
  if (!name) {
    errors.push('Name is required');
  }
  if (!email) {
    errors.push('Email is required');
  } else if (!isValidEmail(email)) {
    errors.push('Invalid email format');
  }

  // Parse numeric fields
  const experience = experienceStr ? parseFloat(experienceStr) : undefined;
  if (experienceStr && (isNaN(experience!) || experience! < 0)) {
    errors.push('Years of Experience must be a valid number');
  }

  const currentSalary = currentSalaryStr ? parseFloat(currentSalaryStr.replace(/[,\s]/g, '')) : undefined;
  if (currentSalaryStr && (isNaN(currentSalary!) || currentSalary! < 0)) {
    errors.push('Current Salary must be a valid number');
  }

  const expectedSalary = expectedSalaryStr ? parseFloat(expectedSalaryStr.replace(/[,\s]/g, '')) : undefined;
  if (expectedSalaryStr && (isNaN(expectedSalary!) || expectedSalary! < 0)) {
    errors.push('Expected Salary must be a valid number');
  }

  // Parse comma-separated fields
  const skills = skillsStr ? skillsStr.split(',').map(s => s.trim()).filter(Boolean) : undefined;
  const preferredLocations = preferredLocationsStr
    ? preferredLocationsStr.split(',').map(s => s.trim()).filter(Boolean)
    : undefined;

  // Validate availability
  const validAvailability = ['available', 'not_looking', 'placed', 'blacklisted'];
  const availability = availabilityStr?.toLowerCase() as CandidateAvailability | undefined;
  if (availabilityStr && !validAvailability.includes(availabilityStr.toLowerCase())) {
    errors.push(`Invalid availability. Must be one of: ${validAvailability.join(', ')}`);
  }

  // Validate currency codes
  const validCurrencies = ['USD', 'INR', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD'];
  if (currentSalaryCurrency && !validCurrencies.includes(currentSalaryCurrency.toUpperCase())) {
    errors.push(`Invalid current salary currency. Must be one of: ${validCurrencies.join(', ')}`);
  }
  if (expectedSalaryCurrency && !validCurrencies.includes(expectedSalaryCurrency.toUpperCase())) {
    errors.push(`Invalid expected salary currency. Must be one of: ${validCurrencies.join(', ')}`);
  }

  const candidate: ParsedCandidate = {
    name: name || '',
    email: email || '',
    phone: phone || undefined,
    currentCompany: currentCompany || undefined,
    currentRole: currentRole || undefined,
    experience: experience,
    skills: skills?.length ? skills : undefined,
    currentSalary: currentSalary,
    currentSalaryCurrency: currentSalaryCurrency?.toUpperCase() as CurrencyCode | undefined,
    expectedSalary: expectedSalary,
    expectedSalaryCurrency: expectedSalaryCurrency?.toUpperCase() as CurrencyCode | undefined,
    noticePeriod: noticePeriod || undefined,
    location: location || undefined,
    preferredLocations: preferredLocations?.length ? preferredLocations : undefined,
    education: education || undefined,
    linkedinUrl: linkedinUrl || undefined,
    portfolioUrl: portfolioUrl || undefined,
    source: source || undefined,
    availability: availability || undefined,
    notes: notes || undefined,
    rowNumber,
    errors,
  };

  return candidate;
}

/**
 * Helper to get string value from row
 */
function getString(row: Record<string, any>, key: string): string {
  const value = row[key];
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Export candidates to Excel file
 */
export function exportCandidatesToExcel(
  candidates: Candidate[],
  filename: string = 'candidates_export.xlsx'
): void {
  // Create header row
  const headers = CANDIDATE_COLUMNS.map(col => col.header);

  // Create data rows
  const data = candidates.map(candidate => [
    candidate.name || '',
    candidate.email || '',
    candidate.phone || '',
    candidate.currentCompany || '',
    candidate.currentRole || '',
    candidate.experience?.toString() || '',
    candidate.skills?.join(', ') || '',
    candidate.currentSalary?.toString() || '',
    candidate.currentSalaryCurrency || '',
    candidate.expectedSalary?.toString() || '',
    candidate.expectedSalaryCurrency || '',
    candidate.noticePeriod || '',
    candidate.location || '',
    candidate.preferredLocations?.join(', ') || '',
    candidate.education || '',
    candidate.linkedinUrl || '',
    candidate.portfolioUrl || '',
    candidate.source || '',
    candidate.availability || '',
    candidate.notes || '',
  ]);

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

  // Set column widths
  ws['!cols'] = CANDIDATE_COLUMNS.map(() => ({ wch: 20 }));

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Candidates');

  // Download
  XLSX.writeFile(wb, filename);
}
