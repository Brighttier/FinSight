import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Loader2,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import {
  parseExcelFile,
  parseTransactions,
  parseSubscriptions,
  parsePartners,
  generateTransactionTemplate,
  generateSubscriptionTemplate,
  generatePartnerTemplate,
  downloadTemplate,
} from '../services/excelService';
import { useAuth } from '../contexts/AuthContext';
import { addTransaction, addSubscription, addPartner } from '../services/firestoreService';
import toast from 'react-hot-toast';

type ImportType = 'transactions' | 'subscriptions' | 'partners';

interface ImportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportDataModal({ isOpen, onClose, onSuccess }: ImportDataModalProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importType, setImportType] = useState<ImportType>('transactions');
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [step, setStep] = useState<'select' | 'preview' | 'complete'>('select');

  const handleDownloadTemplate = () => {
    const templates = {
      transactions: { blob: generateTransactionTemplate(), name: 'finsight-transactions-template.xlsx' },
      subscriptions: { blob: generateSubscriptionTemplate(), name: 'finsight-subscriptions-template.xlsx' },
      partners: { blob: generatePartnerTemplate(), name: 'finsight-partners-template.xlsx' },
    };
    const { blob, name } = templates[importType];
    downloadTemplate(blob, name);
    toast.success('Template downloaded');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast.error('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    setFile(selectedFile);
    setParsing(true);
    setErrors([]);

    try {
      const data = await parseExcelFile(selectedFile);

      if (!user) {
        throw new Error('User not authenticated');
      }

      let parseResult;
      switch (importType) {
        case 'transactions':
          parseResult = parseTransactions(data, user.uid);
          break;
        case 'subscriptions':
          parseResult = parseSubscriptions(data, user.uid);
          break;
        case 'partners':
          parseResult = parsePartners(data, user.uid);
          break;
      }

      setPreviewData(parseResult.valid);
      setErrors(parseResult.errors);
      setStep('preview');
    } catch (err: any) {
      toast.error(err.message || 'Failed to parse file');
      setFile(null);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!previewData || previewData.length === 0) {
      toast.error('No valid data to import');
      return;
    }

    setImporting(true);

    try {
      let successCount = 0;

      for (const item of previewData) {
        switch (importType) {
          case 'transactions':
            await addTransaction(item);
            break;
          case 'subscriptions':
            await addSubscription(item);
            break;
          case 'partners':
            await addPartner(item);
            break;
        }
        successCount++;
      }

      toast.success(`Successfully imported ${successCount} ${importType}`);
      setStep('complete');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Failed to import data');
    } finally {
      setImporting(false);
    }
  };

  const resetModal = () => {
    setFile(null);
    setPreviewData(null);
    setErrors([]);
    setStep('select');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Import Data from Excel</h2>
          <button
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {step === 'select' && (
            <div className="space-y-6">
              {/* Data Type Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  What would you like to import?
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['transactions', 'subscriptions', 'partners'] as ImportType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setImportType(type)}
                      className={`p-3 border rounded-lg text-center capitalize transition-colors ${
                        importType === type
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Download Template */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Step 1: Download Template</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-500 mb-3">
                    Download the Excel template, fill in your data, then upload it.
                  </p>
                  <button
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-800 text-sm"
                  >
                    <Download size={16} />
                    Download {importType} Template
                  </button>
                </CardContent>
              </Card>

              {/* Upload File */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Step 2: Upload Your File</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
                  >
                    {parsing ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 size={32} className="text-indigo-600 animate-spin" />
                        <p className="text-sm text-slate-600">Parsing file...</p>
                      </div>
                    ) : (
                      <>
                        <FileSpreadsheet size={32} className="mx-auto text-slate-400 mb-2" />
                        <p className="text-sm text-slate-600">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Excel files (.xlsx, .xls)
                        </p>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              {/* File Info */}
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                <FileSpreadsheet size={16} />
                <span>{file?.name}</span>
              </div>

              {/* Errors */}
              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                    <AlertCircle size={16} />
                    <span>{errors.length} row(s) with errors (will be skipped)</span>
                  </div>
                  <ul className="text-sm text-red-600 max-h-32 overflow-y-auto space-y-1">
                    {errors.slice(0, 10).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                    {errors.length > 10 && (
                      <li className="text-red-500">...and {errors.length - 10} more</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Preview */}
              {previewData && previewData.length > 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-700 font-medium mb-3">
                    <CheckCircle size={16} />
                    <span>{previewData.length} valid {importType} ready to import</span>
                  </div>

                  {/* Preview Table */}
                  <div className="bg-white rounded border border-green-100 overflow-x-auto max-h-60">
                    <table className="min-w-full text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          {importType === 'transactions' && (
                            <>
                              <th className="px-3 py-2 text-left">Date</th>
                              <th className="px-3 py-2 text-left">Description</th>
                              <th className="px-3 py-2 text-left">Category</th>
                              <th className="px-3 py-2 text-left">Type</th>
                              <th className="px-3 py-2 text-right">Amount</th>
                            </>
                          )}
                          {importType === 'subscriptions' && (
                            <>
                              <th className="px-3 py-2 text-left">Name</th>
                              <th className="px-3 py-2 text-right">Cost</th>
                              <th className="px-3 py-2 text-left">Billing</th>
                              <th className="px-3 py-2 text-left">Next Date</th>
                            </>
                          )}
                          {importType === 'partners' && (
                            <>
                              <th className="px-3 py-2 text-left">Name</th>
                              <th className="px-3 py-2 text-left">Email</th>
                              <th className="px-3 py-2 text-right">Share %</th>
                              <th className="px-3 py-2 text-left">Role</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.slice(0, 5).map((item, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            {importType === 'transactions' && (
                              <>
                                <td className="px-3 py-2">{item.date}</td>
                                <td className="px-3 py-2">{item.description}</td>
                                <td className="px-3 py-2">{item.category}</td>
                                <td className="px-3 py-2 capitalize">{item.type}</td>
                                <td className="px-3 py-2 text-right">${item.amount.toLocaleString()}</td>
                              </>
                            )}
                            {importType === 'subscriptions' && (
                              <>
                                <td className="px-3 py-2">{item.name}</td>
                                <td className="px-3 py-2 text-right">${item.cost}</td>
                                <td className="px-3 py-2 capitalize">{item.billingCycle}</td>
                                <td className="px-3 py-2">{item.nextBillingDate}</td>
                              </>
                            )}
                            {importType === 'partners' && (
                              <>
                                <td className="px-3 py-2">{item.name}</td>
                                <td className="px-3 py-2">{item.email}</td>
                                <td className="px-3 py-2 text-right">{item.sharePercentage}%</td>
                                <td className="px-3 py-2">{item.role}</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {previewData.length > 5 && (
                      <div className="px-3 py-2 text-xs text-slate-500 bg-slate-50 border-t">
                        ...and {previewData.length - 5} more rows
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>No valid data found in the file</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center py-8">
              <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Import Complete!</h3>
              <p className="text-slate-600">
                Successfully imported {previewData?.length} {importType}.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
          {step === 'select' && (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={resetModal}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={importing || !previewData || previewData.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Import {previewData?.length || 0} {importType}
                  </>
                )}
              </button>
            </>
          )}

          {step === 'complete' && (
            <button
              onClick={handleClose}
              className="ml-auto px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-800"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
