import React, { useState, useRef } from 'react';
import { useCalendar } from '../CalendarContext';
import { Upload, FileJson, FileSpreadsheet, FileText, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export default function UploadModal({ onClose }: { onClose: () => void }) {
  const { addEvent } = useCalendar();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requiredFields = [
    { name: 'title', type: 'string', description: 'The title of the appointment' },
    { name: 'startTime', type: 'datetime', description: 'Start time (e.g., "2026-04-01T10:00:00" or "04/01/2026 10:00 AM")' },
    { name: 'endTime', type: 'datetime', description: 'End time (e.g., "2026-04-01T11:00:00" or "04/01/2026 11:00 AM")' },
  ];
  
  const optionalFields = [
    { name: 'description', type: 'string', description: 'Additional details about the appointment' },
    { name: 'sharedWith', type: 'string', description: 'Comma-separated email addresses' },
  ];

  const downloadExample = (format: 'json' | 'csv' | 'xlsx') => {
    const exampleData = [
      {
        title: 'Team Sync',
        startTime: '2026-04-01T10:00:00',
        endTime: '2026-04-01T11:00:00',
        description: 'Weekly team synchronization meeting',
        sharedWith: 'team@example.com, manager@example.com'
      },
      {
        title: 'Doctor Appointment',
        startTime: '2026-04-02T14:30:00',
        endTime: '2026-04-02T15:30:00',
        description: 'Annual checkup',
        sharedWith: ''
      }
    ];

    let content = '';
    let mimeType = '';
    let filename = `example_appointments.${format}`;

    if (format === 'json') {
      content = JSON.stringify(exampleData, null, 2);
      mimeType = 'application/json';
    } else if (format === 'csv') {
      content = Papa.unparse(exampleData);
      mimeType = 'text/csv';
    } else if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(exampleData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Appointments');
      XLSX.writeFile(wb, filename);
      return; // XLSX handles the download itself
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const processData = async (data: any[]) => {
    let successCount = 0;
    let errorCount = 0;

    for (const row of data) {
      try {
        if (!row.title || !row.startTime || !row.endTime) {
          throw new Error('Missing required fields');
        }

        const startTime = new Date(row.startTime);
        const endTime = new Date(row.endTime);

        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          throw new Error('Invalid date format');
        }

        const eventData: any = {
          title: String(row.title),
          startTime,
          endTime,
        };

        if (row.description) {
          eventData.description = String(row.description);
        }

        if (row.sharedWith) {
          eventData.sharedWith = String(row.sharedWith).split(',').map(e => e.trim()).filter(e => e);
        }

        await addEvent(eventData);
        successCount++;
      } catch (err) {
        console.error('Error processing row:', row, err);
        errorCount++;
      }
    }

    if (successCount > 0) {
      setSuccess(`Successfully uploaded ${successCount} appointment(s).`);
      if (errorCount > 0) {
        setError(`Failed to upload ${errorCount} appointment(s). Check the data format.`);
      }
    } else {
      setError('Failed to upload any appointments. Please check your file format.');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();

      if (fileExt === 'json') {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!Array.isArray(data)) {
          throw new Error('JSON file must contain an array of appointments.');
        }
        await processData(data);
      } else if (fileExt === 'csv' || fileExt === 'txt') {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            if (results.errors.length > 0) {
              setError('Error parsing CSV file.');
              setLoading(false);
              return;
            }
            await processData(results.data);
            setLoading(false);
          },
          error: (err: any) => {
            setError(`CSV parsing error: ${err.message}`);
            setLoading(false);
          }
        });
        return; // Papa.parse is asynchronous, so we return here to avoid setting loading to false prematurely
      } else if (fileExt === 'xlsx' || fileExt === 'xls') {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        await processData(data);
      } else {
        throw new Error('Unsupported file format. Please upload JSON, CSV, TXT, or Excel.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 relative max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        <h2 className="text-2xl font-bold text-slate-900 mb-2">Upload Appointments</h2>
        <p className="text-slate-500 mb-8">Import your calendar events from JSON, Excel, or CSV/TEXT files.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Required Fields</h3>
            <ul className="space-y-3 mb-6">
              {requiredFields.map(field => (
                <li key={field.name} className="flex flex-col">
                  <span className="font-mono text-sm font-medium text-slate-700">{field.name} <span className="text-slate-400 text-xs">({field.type})</span></span>
                  <span className="text-sm text-slate-500">{field.description}</span>
                </li>
              ))}
            </ul>

            <h3 className="text-lg font-semibold text-slate-900 mb-4">Optional Fields</h3>
            <ul className="space-y-3">
              {optionalFields.map(field => (
                <li key={field.name} className="flex flex-col">
                  <span className="font-mono text-sm font-medium text-slate-700">{field.name} <span className="text-slate-400 text-xs">({field.type})</span></span>
                  <span className="text-sm text-slate-500">{field.description}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Example Files</h3>
            <p className="text-sm text-slate-500 mb-4">Download an example file to see the required format.</p>
            
            <div className="space-y-3">
              <button 
                onClick={() => downloadExample('json')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
              >
                <FileJson className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="font-medium text-slate-900">JSON Format</div>
                  <div className="text-xs text-slate-500">.json</div>
                </div>
              </button>
              
              <button 
                onClick={() => downloadExample('xlsx')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-colors text-left"
              >
                <FileSpreadsheet className="h-5 w-5 text-green-500" />
                <div>
                  <div className="font-medium text-slate-900">Excel Format</div>
                  <div className="text-xs text-slate-500">.xlsx</div>
                </div>
              </button>
              
              <button 
                onClick={() => downloadExample('csv')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-orange-300 hover:bg-orange-50 transition-colors text-left"
              >
                <FileText className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="font-medium text-slate-900">CSV / TEXT Format</div>
                  <div className="text-xs text-slate-500">.csv, .txt</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Upload File</h3>
          
          <div className="flex items-center gap-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              accept=".json,.csv,.txt,.xlsx,.xls"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              Choose File
            </button>
            <span className="text-sm text-slate-500">
              {file ? file.name : 'No file chosen'}
            </span>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-start gap-2 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <p>{success}</p>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload Appointments
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
