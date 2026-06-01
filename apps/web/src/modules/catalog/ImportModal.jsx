import { useState, useRef } from 'react';
import { api } from '../../api.js';
import { tokens as C, ui } from '../../shared/styles.js';

const CSV_TEMPLATE = [
  'name,unit,pkg_size,qty_bought,total_paid,purchase_date,source,notes',
  'Oatly Full Fat Oat Milk,oz,64,30,158.10,2026-02-01,Amazon Fresh,64oz carton',
  'Vanilla syrup,pump,1,1,,,,Manual update',
  'Espresso (double shot),shot,1,1,,,,',
].join('\n');

const s = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  modal: {
    background: C.white,
    borderRadius: 16,
    padding: 24,
    width: 'min(700px, 94vw)',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: C.shadows.pop,
  },
  title: {
    fontFamily: C.fonts.heading,
    fontSize: 22,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: C.fonts.body,
    fontSize: 13,
    color: C.colors.muted,
    marginBottom: 16,
    lineHeight: 1.5,
  },
  help: {
    ...ui.card,
    background: C.cream,
    padding: 12,
    marginBottom: 14,
    fontSize: 12,
    color: C.textSecond,
    lineHeight: 1.55,
  },
  dropzone: (dragging, hasFile) => ({
    border: `2px dashed ${dragging ? C.gold : hasFile ? C.colors.success : C.colors.border}`,
    borderRadius: 12,
    padding: '26px 18px',
    textAlign: 'center',
    cursor: 'pointer',
    background: dragging ? '#fff8e8' : hasFile ? '#eef9f1' : C.cream,
    marginBottom: 14,
  }),
  actions: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 16,
  },
};

function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <div style={{ ...ui.card, borderColor: '#f3c7c2', background: '#fff4f2', color: C.colors.danger, padding: 12, marginBottom: 12 }}>
      {message}
    </div>
  );
}

function ResultBox({ result }) {
  if (!result) return null;
  const hasErrors = !!result?.hasErrors;
  return (
    <div style={{ ...ui.card, borderColor: hasErrors ? '#f3c7c2' : '#b9e5c7', background: hasErrors ? '#fff4f2' : '#eef9f1', padding: 12, marginBottom: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: hasErrors ? C.colors.danger : C.colors.success }}>
        {hasErrors ? 'Import completed with warnings' : 'Import successful'}
      </div>
      <>
        <div style={{ fontSize: 12 }}>Ingredients created: {result.summary.created}</div>
        <div style={{ fontSize: 12 }}>Ingredients updated: {result.summary.updated}</div>
        <div style={{ fontSize: 12 }}>Costs added: {result.summary.costsAdded}</div>
        <div style={{ fontSize: 12 }}>Rows skipped: {result.summary.skipped}</div>
      </>
      {result.errors?.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 11, color: C.colors.danger }}>
          {result.errors.slice(0, 5).map((e, i) => (
            <div key={i}>- {e}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function CsvTab({ locationId, onDone }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const downloadTemplate = () => {
    const a = document.createElement('a');
    a.href = 'data:text/csv,' + encodeURIComponent(CSV_TEMPLATE);
    a.download = 'baladi_ingredients_template.csv';
    a.click();
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.importIngredientsCsv(locationId, file);
      setResult(res.data);
    } catch (e) {
      setError(e.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={s.help}>
        Fallback upload for ingredients and costs. Use this when AI Intake is not suitable. Required columns: name, unit.
      </div>
      <button style={{ ...ui.button, background: C.brandSoft, marginBottom: 12 }} onClick={downloadTemplate}>Download CSV template</button>

      <div
        style={s.dropzone(dragging, !!file)}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const dropped = e.dataTransfer.files[0];
          if (dropped) {
            setFile(dropped);
            setError('');
            setResult(null);
          }
        }}
      >
        <div style={{ fontSize: 28 }}>{file ? 'CSV Ready' : 'Drop CSV here'}</div>
        <div style={{ color: C.colors.muted, fontSize: 12 }}>{file ? file.name : 'or click to browse'}</div>
      </div>
      <input
        ref={fileRef}
        type='file'
        accept='.csv'
        style={{ display: 'none' }}
        onChange={(e) => {
          setFile(e.target.files[0]);
          setError('');
          setResult(null);
        }}
      />

      <ErrorBox message={error} />
      <ResultBox result={result} />

      <div style={s.actions}>
        {result ? (
          <button style={{ ...ui.button, background: C.colors.ink, color: '#fff' }} onClick={onDone}>Done and refresh</button>
        ) : (
          <button style={{ ...ui.button, background: C.colors.ink, color: '#fff', opacity: (!file || loading) ? 0.5 : 1 }} disabled={!file || loading} onClick={handleImport}>
            {loading ? 'Importing...' : 'Import ingredients'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ImportModal({ locationId, onClose, onDone }) {
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.title}>Spreadsheet Import</div>
        <div style={s.subtitle}>Admin fallback: upload ingredients CSV with optional cost data.</div>

        <CsvTab locationId={locationId} onDone={onDone} />

        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 8 }}>
          <button style={{ ...ui.button, background: '#fff', border: `1px solid ${C.colors.border}` }} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
