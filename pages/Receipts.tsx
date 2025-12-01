import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import {
  Upload,
  Image,
  FileText,
  Trash2,
  Download,
  Search,
  Loader2,
  X,
} from 'lucide-react';
import { useReceipts } from '../hooks/useReceipts';
import { PageLoader, EmptyState } from '../components/ui/Loading';

const Receipts = () => {
  const { receipts, loading, uploading, upload, remove } = useReceipts();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredReceipts = receipts.filter((r) =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await upload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await upload(e.target.files[0]);
      e.target.value = '';
    }
  };

  const getFileIcon = (name: string) => {
    if (name.toLowerCase().endsWith('.pdf')) {
      return <FileText className="w-8 h-8 text-red-500" />;
    }
    return <Image className="w-8 h-8 text-indigo-500" />;
  };

  const isImage = (name: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    return imageExtensions.some((ext) => name.toLowerCase().endsWith(ext));
  };

  if (loading) {
    return <PageLoader message="Loading receipts..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Receipts
        </h2>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="animate-spin h-4 w-4" />
          ) : (
            <Upload size={18} />
          )}
          Upload Receipt
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*,.pdf"
          className="hidden"
        />
      </div>

      {/* Upload Zone */}
      <Card>
        <CardContent className="p-6">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-slate-300 hover:border-slate-400'
            }`}
          >
            <Upload
              className={`mx-auto h-12 w-12 ${
                dragActive ? 'text-indigo-500' : 'text-slate-400'
              }`}
            />
            <p className="mt-2 text-sm text-slate-600">
              Drag and drop a receipt here, or{' '}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                browse
              </button>
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Supports JPEG, PNG, GIF, WebP, and PDF (max 10MB)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      {receipts.length > 0 && (
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search receipts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}

      {/* Receipts Grid */}
      {filteredReceipts.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={<Image className="w-6 h-6 text-slate-400" />}
              title={receipts.length === 0 ? 'No receipts yet' : 'No matching receipts'}
              description={
                receipts.length === 0
                  ? 'Upload your first receipt to get started'
                  : 'Try a different search term'
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredReceipts.map((receipt) => (
            <Card
              key={receipt.path}
              className="group cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedReceipt(receipt.url)}
            >
              <CardContent className="p-4">
                <div className="aspect-square bg-slate-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                  {isImage(receipt.name) ? (
                    <img
                      src={receipt.url}
                      alt={receipt.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getFileIcon(receipt.name)
                  )}
                </div>
                <p className="text-sm font-medium text-slate-900 truncate">
                  {receipt.name.split('_').slice(1).join('_') || receipt.name}
                </p>
                <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={receipt.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 flex items-center justify-center gap-1 text-xs text-slate-600 hover:text-slate-900 py-1 bg-slate-100 rounded"
                  >
                    <Download size={12} />
                    Download
                  </a>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this receipt?')) {
                        remove(receipt.path);
                      }
                    }}
                    className="flex items-center justify-center gap-1 text-xs text-red-600 hover:text-red-700 py-1 px-2 bg-red-50 rounded"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Receipt Preview Modal */}
      {selectedReceipt && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedReceipt(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button
              onClick={() => setSelectedReceipt(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300"
            >
              <X size={24} />
            </button>
            {selectedReceipt.toLowerCase().endsWith('.pdf') ? (
              <iframe
                src={selectedReceipt}
                className="w-full h-[80vh] rounded-lg"
                title="Receipt Preview"
              />
            ) : (
              <img
                src={selectedReceipt}
                alt="Receipt"
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Receipts;
