'use client';

import { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.entry';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function Invoices() {
  const [invoiceText, setInvoiceText] = useState('');
  const [file, setFile] = useState(null);
  const [fields, setFields] = useState(['customer name', 'price', 'quantity']);
  const [newField, setNewField] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    if (!f) {
      setInvoiceText('');
      return;
    }
    const arrayBuffer = await f.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it) => it.str).join(' ') + '\n';
    }
    setInvoiceText(text);
  };

  const addField = () => {
    if (newField.trim()) {
      setFields([...fields, newField.trim()]);
      setNewField('');
    }
  };

  const removeField = (field) => {
    setFields(fields.filter((f) => f !== field));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceText, fields }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    if (!result || typeof result !== 'object') return;
    const headers = fields.join(',');
    const values = fields.map((f) => JSON.stringify(result[f] || '')).join(',');
    const csvContent = `${headers}\n${values}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'invoice.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Invoice Extractor</h1>
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
        />
      </div>
      <div>
        <ul>
          {fields.map((field) => (
            <li key={field} style={{ marginBottom: '4px' }}>
              {field}{' '}
              <button onClick={() => removeField(field)}>remove</button>
            </li>
          ))}
        </ul>
        <input
          type="text"
          placeholder="Add field"
          value={newField}
          onChange={(e) => setNewField(e.target.value)}
        />
        <button onClick={addField}>Add Field</button>
      </div>
      <button onClick={handleSubmit} disabled={loading} style={{ marginTop: '1rem' }}>
        {loading ? 'Processing...' : 'Extract Fields'}
      </button>
      {result && (
        <div style={{ marginTop: '2rem' }}>
          <table border="1" cellPadding="4" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {fields.map((f) => (
                  <th key={f}>{f}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {fields.map((f) => (
                  <td key={f}>{result[f] || ''}</td>
                ))}
              </tr>
            </tbody>
          </table>
          <button onClick={exportCsv} style={{ marginTop: '1rem' }}>
            Export CSV
          </button>
        </div>
      )}
    </div>
  );
}
