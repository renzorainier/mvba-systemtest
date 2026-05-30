'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Plus, Search, PencilLine, Trash2, Save, X } from 'lucide-react';
import { useSchoolYearContext } from '@/components/SchoolYearContext';

const emptyForm = {
  curriculum_id: '',
  curriculum_name: '',
  description: '',
  effective_start_date: '',
  effective_end_date: '',
  schoolYear: '',
  subjects: [],
  subjectsText: '',
};

const toDateInput = (value) => (value ? String(value).slice(0, 10) : '');

export default function CurriculumsPage() {
  const { isHistorical, selectedSchoolYear } = useSchoolYearContext();
  const [curriculums, setCurriculums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState('');

  const fetchCurriculums = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/curriculums');
      const data = await response.json();
      if (data.success) {
        setCurriculums(data.data);
      }
    } catch (fetchError) {
      setError(fetchError.message || 'Failed to load curriculums');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurriculums();
  }, []);

  const filteredCurriculums = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return curriculums.filter((curriculum) =>
      [curriculum.curriculum_id, curriculum.curriculum_name, curriculum.description]
        .some((value) => String(value || '').toLowerCase().includes(query))
    );
  }, [curriculums, searchTerm]);

  const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '—');

  const formatSubjects = (curriculum) => {
    if (Array.isArray(curriculum.subjects) && curriculum.subjects.length > 0) {
      return curriculum.subjects
        .map((subject, index) => {
          if (typeof subject === 'string') {
            return subject.trim();
          }

          const subjectName = String(subject?.subject_name || '').trim();
          const subjectCode = String(subject?.code || '').trim();
          return `${index + 1}. ${subjectName}${subjectCode ? ` (${subjectCode})` : ''}`.trim();
        })
        .filter(Boolean);
    }

    return String(curriculum.subjectsText || curriculum.subjects || '')
      .split(',')
      .map((subject) => subject.trim())
      .filter(Boolean);
  };

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const printCurriculum = (curriculum) => {
    const subjects = formatSubjects(curriculum);
    const subjectColumns = subjects.length > 6 ? 2 : 1;
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      return;
    }

    const subjectRows = subjects.length > 0
      ? subjects.map((subject, index) => `
          <div class="subject-item">
            <span class="subject-index">${index + 1}</span>
            <span class="subject-value">${escapeHtml(subject)}</span>
          </div>
        `).join('')
      : '<div class="empty">No subjects listed.</div>';

    const receiptHtml = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Curriculum ${escapeHtml(curriculum.curriculum_id || curriculum.curriculum_name)}</title>
        <style>
          @page { size: letter portrait; margin: 8mm; }
          html, body { height: 100%; }
          body { font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color: #1f2937; padding: 0; margin: 0; box-sizing: border-box; background: #fff; }
          .page { min-height: 100vh; box-sizing: border-box; padding: 0; }
          .sheet { border: 1px solid #dbe4ee; border-radius: 16px; padding: 14px; box-sizing: border-box; background: #fff; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 12px; }
          .brand { font-weight: 800; font-size: 24px; letter-spacing: -0.03em; }
          .badge { background: #eff6ff; color: #1d4ed8; padding: 6px 10px; border-radius: 9999px; font-weight: 700; font-size: 12px; display: inline-block; }
          .meta { text-align: right; font-size: 13px; color: #64748b; line-height: 1.45; }
          .meta strong { color: #0f172a; }
          .title { margin: 0; font-size: 21px; line-height: 1.15; color: #0f172a; }
          .subtitle { margin: 3px 0 0; font-size: 13px; color: #475569; }
          .panel-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
          .panel { border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 12px; background: #f8fafc; }
          .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; color: #64748b; font-weight: 700; }
          .value { margin-top: 4px; font-size: 14px; font-weight: 700; color: #0f172a; word-break: break-word; }
          .section { margin-top: 11px; }
          .section-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
          .section-head h2 { margin: 0; font-size: 15px; color: #0f172a; }
          .section-head span { font-size: 11px; color: #64748b; font-weight: 600; }
          .description { border: 1px solid #e2e8f0; border-radius: 12px; padding: 11px 12px; background: #fff; font-size: 13px; line-height: 1.52; white-space: pre-wrap; min-height: 52px; max-height: 78px; overflow: hidden; }
          .subjects-grid { display: grid; grid-template-columns: repeat(${subjectColumns}, minmax(0, 1fr)); gap: 7px 12px; }
          .subject-item { display: flex; align-items: flex-start; gap: 8px; border-bottom: 1px solid #e5e7eb; padding: 7px 0; break-inside: avoid; }
          .subject-index { width: 18px; flex: 0 0 18px; font-size: 13px; font-weight: 800; color: #2563eb; }
          .subject-value { font-size: 13px; line-height: 1.42; color: #0f172a; font-weight: 600; }
          .empty { color: #64748b; padding: 8px 0; font-size: 13px; }
          .footer { margin-top: 12px; display: flex; justify-content: space-between; gap: 12px; align-items: flex-end; }
          .footer-note { font-size: 12px; color: #64748b; line-height: 1.35; }
          .printed { text-align: right; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="sheet">
            <div class="header">
              <div>
                <div class="brand">CURRICULUM RECORD</div>
                <div class="badge">Portrait Print View</div>
                <h1 class="title">${escapeHtml(curriculum.curriculum_name || 'Untitled Curriculum')}</h1>
                <p class="subtitle">All curriculum fields formatted for printing and review.</p>
              </div>
              <div class="meta">
                <div><strong>Curriculum ID:</strong> ${escapeHtml(curriculum.curriculum_id || '—')}</div>
                <div><strong>School Year:</strong> ${escapeHtml(curriculum.schoolYear || '—')}</div>
                <div><strong>Record ID:</strong> ${escapeHtml(curriculum._id || '—')}</div>
              </div>
            </div>

            <div class="panel-grid">
              <div class="panel">
                <div class="label">Effective Start</div>
                <div class="value">${formatDate(curriculum.effective_start_date)}</div>
              </div>
              <div class="panel">
                <div class="label">Effective End</div>
                <div class="value">${formatDate(curriculum.effective_end_date)}</div>
              </div>
              <div class="panel">
                <div class="label">Subject Count</div>
                <div class="value">${subjects.length}</div>
              </div>
              <div class="panel">
                <div class="label">School Year Status</div>
                <div class="value">${escapeHtml(curriculum.schoolYear === selectedSchoolYear ? 'Current' : 'Historical')}</div>
              </div>
            </div>

            <div class="section">
              <div class="section-head">
                <h2>Description</h2>
                <span>Curriculum overview and scope</span>
              </div>
              <div class="description">${escapeHtml(curriculum.description || 'No description provided.')}</div>
            </div>

            <div class="section">
              <div class="section-head">
                <h2>Subjects</h2>
                <span>Complete subject list</span>
              </div>
              <div class="subjects-grid">
                ${subjectRows}
              </div>
            </div>

            <div class="footer">
              <div class="footer-note">
                Printed curriculum summary generated from the system record.
              </div>
              <div class="printed">
                Printed on ${new Date().toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(receiptHtml);
    printWindow.document.close();

    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch (printError) {
        console.error('Print failed', printError);
      }
    }, 500);
  };

  const startEdit = (curriculum) => {
    if (isHistorical) {
      return;
    }

    setEditingId(curriculum._id);
    setIsFormOpen(true);
    setFormData({
      curriculum_id: curriculum.curriculum_id || '',
      curriculum_name: curriculum.curriculum_name || '',
      description: curriculum.description || '',
      effective_start_date: toDateInput(curriculum.effective_start_date),
      effective_end_date: toDateInput(curriculum.effective_end_date),
      schoolYear: curriculum.schoolYear || selectedSchoolYear || '',
      subjects: Array.isArray(curriculum.subjects) ? curriculum.subjects : [],
      subjectsText: Array.isArray(curriculum.subjects) ? curriculum.subjects.map(s => s.subject_name || s).join(', ') : '',
    });
  };

  const openNewForm = () => {
    if (isHistorical) {
      return;
    }

    setEditingId(null);
    setFormData(emptyForm);
    setError('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setFormData(emptyForm);
    setError('');
  };

  const handleSave = async () => {
    if (isHistorical) {
      return;
    }

    try {
      setSaving(true);
      setError('');

      if (!formData.curriculum_name || !formData.effective_start_date || !formData.effective_end_date) {
        setError('Curriculum name and effective dates are required');
        return;
      }

      const payload = {
        ...formData,
        schoolYear: selectedSchoolYear || formData.schoolYear,
        curriculum_id: formData.curriculum_id || `CUR-${Date.now()}`,
        subjects: formData.subjectsText
          ? formData.subjectsText.split(',').map(s => ({ subject_name: s.trim() })).filter(s => s.subject_name)
          : (formData.subjects || []),
      };

      const response = await fetch(editingId ? `/api/curriculums/${editingId}` : '/api/curriculums', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save curriculum');
      }

      await fetchCurriculums();
      closeForm();
    } catch (saveError) {
      setError(saveError.message || 'Failed to save curriculum');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (curriculum) => {
    if (isHistorical) {
      return;
    }

    if (!window.confirm(`Delete curriculum ${curriculum.curriculum_name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/curriculums/${curriculum._id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete curriculum');
      }

      await fetchCurriculums();
      if (editingId === curriculum._id) {
        closeForm();
      }
    } catch (deleteError) {
      setError(deleteError.message || 'Failed to delete curriculum');
    }
  };

  return (
    <div className="min-h-screen bg-white p-4 text-slate-800">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">Curriculum Management</h1>
            <p className="mt-1 text-sm text-slate-600">Define curriculum versions and keep them tied to grade-level assignments.</p>
          </div>
          <button onClick={openNewForm} disabled={isHistorical} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300">
            <Plus size={18} />
            New Curriculum
          </button>
        </div>

        {error && !isFormOpen && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>}

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search curriculums by code, name, or description..."
                className="block w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Code</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Effective Range</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {!loading && filteredCurriculums.length > 0 ? filteredCurriculums.map((curriculum) => (
                  <tr key={curriculum._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">{curriculum.curriculum_id}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                      {curriculum.curriculum_name}
                      <div className="mt-1 text-xs font-normal text-slate-500">{curriculum.description || 'No description'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {toDateInput(curriculum.effective_start_date)} to {toDateInput(curriculum.effective_end_date)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-3">
                        <button onClick={() => startEdit(curriculum)} disabled={isHistorical} className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-900 disabled:cursor-not-allowed disabled:text-blue-300 disabled:hover:text-blue-300">
                          <PencilLine size={16} />
                          Edit
                        </button>
                        <button onClick={() => printCurriculum(curriculum)} className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-slate-950">
                          <BookOpen size={16} />
                          Print
                        </button>
                        <button onClick={() => handleDelete(curriculum)} disabled={isHistorical} className="inline-flex items-center gap-1 font-medium text-red-600 hover:text-red-900 disabled:cursor-not-allowed disabled:text-red-300 disabled:hover:text-red-300">
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : loading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500">Loading curriculums...</td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500">No curriculums found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6">
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950">{editingId ? 'Edit Curriculum' : 'New Curriculum'}</h2>
                <p className="text-sm text-slate-600">Use a stable code so grade assignments can reference it later.</p>
              </div>
              <button onClick={closeForm} disabled={saving} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                <X size={14} />
                Close
              </button>
            </div>

            <div className="max-h-[calc(100vh-180px)] overflow-y-auto px-6 py-5">
              {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">School Year</label>
                  <input
                    type="text"
                    value={selectedSchoolYear || formData.schoolYear}
                    readOnly
                    disabled
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 focus:outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">Subjects</label>
                  <small className="text-xs text-slate-500">Add comma-separated subject names or provide objects.</small>
                  <textarea
                    value={formData.subjectsText || ''}
                    onChange={(e) => setFormData({ ...formData, subjectsText: e.target.value })}
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. Math, Science, English"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Curriculum Code</label>
                  <input
                    type="text"
                    value={formData.curriculum_id}
                    onChange={(e) => setFormData({ ...formData, curriculum_id: e.target.value })}
                    placeholder="CUR-2026-01"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Curriculum Name *</label>
                  <input
                    type="text"
                    value={formData.curriculum_name}
                    onChange={(e) => setFormData({ ...formData, curriculum_name: e.target.value })}
                    placeholder="e.g. Competency-Based Basic Curriculum"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Optional summary of the curriculum content and scope"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Effective Start *</label>
                  <input
                    type="date"
                    value={formData.effective_start_date}
                    onChange={(e) => setFormData({ ...formData, effective_start_date: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Effective End *</label>
                  <input
                    type="date"
                    value={formData.effective_end_date}
                    onChange={(e) => setFormData({ ...formData, effective_end_date: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving || isHistorical}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:bg-blue-400"
              >
                <Save size={16} />
                {saving ? 'Saving...' : editingId ? 'Update Curriculum' : 'Save Curriculum'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}