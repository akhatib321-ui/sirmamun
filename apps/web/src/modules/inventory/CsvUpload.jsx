import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { tokens, ui } from '../../shared/styles.js';

export default function CsvUpload({ onOpenMatching }) {
  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadLocations() {
      try {
        const res = await api.getLocations();
        const parentLocations = (res || []).filter((loc) => !loc.parentId);
        setLocations(parentLocations);
      } catch (err) {
        setError(err.message || 'Could not load locations');
      }
    }
    loadLocations();
  }, []);

  async function handleUpload() {
    if (!locationId || !reportDate || !file) {
      setError('Select location, report date, and CSV file first');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await api.uploadSalesCsv(locationId, reportDate, file);
      const reportId = res?.data?.reportId;
      setMessage(`Upload accepted. Item count: ${res?.data?.itemCount || 0}. Status: ${res?.data?.status || '-'}`);
      if (reportId) onOpenMatching(reportId);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 760 }}>
      <div style={{ ...ui.card, padding: 20 }}>
        <div style={{ fontFamily: tokens.fonts.heading, fontSize: 30, marginBottom: 6 }}>Upload Toast CSV</div>
        <div style={{ fontSize: 14, color: tokens.colors.muted, marginBottom: 16 }}>
          Upload the All Levels Product Mix CSV, then continue in Matching.
        </div>

        <label style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
          <span>Location</span>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)} style={ui.input}>
            <option value="">Select location</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
          <span>Report Date</span>
          <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} style={ui.input} />
        </label>

        <label
          style={{
            display: 'block',
            border: `2px dashed ${tokens.colors.border}`,
            borderRadius: 14,
            padding: '24px 16px',
            textAlign: 'center',
            background: '#fff',
            cursor: 'pointer',
            marginBottom: 14
          }}
        >
          <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
          <div style={{ fontWeight: 700 }}>{file ? file.name : 'Drop or choose CSV file'}</div>
          <div style={{ fontSize: 13, color: tokens.colors.muted, marginTop: 4 }}>Expected columns: Item, Qty sold, Gross sales, Net sales</div>
        </label>

        {error && <div style={{ ...ui.card, padding: 10, background: '#fff5f3', borderColor: '#f0c9c2', marginBottom: 10 }}>{error}</div>}
        {message && <div style={{ ...ui.card, padding: 10, background: '#eef8f2', borderColor: '#cbe7d6', marginBottom: 10 }}>{message}</div>}

        <button style={{ ...ui.button, background: tokens.colors.ink, color: '#fff' }} onClick={handleUpload} disabled={loading}>
          {loading ? 'Uploading...' : 'Upload CSV'}
        </button>
      </div>
    </div>
  );
}
