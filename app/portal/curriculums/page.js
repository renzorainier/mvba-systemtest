'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Plus, Search, PencilLine, Trash2, Save, X } from 'lucide-react';

const emptyForm = {
  curriculum_id: '',
  curriculum_name: '',
  description: '',
  effective_start_date: '',
  effective_end_date: '',
  subjects: [],
  subjectsText: '',
};

const toDateInput = (value) => (value ? String(value).slice(0, 10) : '');

export default function CurriculumsPage() {
  const [curriculums, setCurriculums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
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

  const startEdit = (curriculum) => {
    setEditingId(curriculum._id);
    setFormData({
      curriculum_id: curriculum.curriculum_id || '',
      curriculum_name: curriculum.curriculum_name || '',
      description: curriculum.description || '',
      effective_start_date: toDateInput(curriculum.effective_start_date),
      effective_end_date: toDateInput(curriculum.effective_end_date),
      subjects: Array.isArray(curriculum.subjects) ? curriculum.subjects : [],
      subjectsText: Array.isArray(curriculum.subjects) ? curriculum.subjects.map(s => s.subject_name || s).join(', ') : '',
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setError('');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      if (!formData.curriculum_name || !formData.effective_start_date || !formData.effective_end_date) {
        setError('Curriculum name and effective dates are required');
        return;
      }

      const payload = {
        ...formData,
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
      resetForm();
    } catch (saveError) {
      setError(saveError.message || 'Failed to save curriculum');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (curriculum) => {
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
        resetForm();
      }
    } catch (deleteError) {
      setError(deleteError.message || 'Failed to delete curriculum');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-800 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
              <BookOpen size={14} />
              Curriculum Catalog
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">Curriculum Management</h1>
            <p className="mt-1 text-sm text-slate-600">Define curriculum versions and keep them tied to grade-level assignments.</p>
          </div>
          <button onClick={resetForm} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-blue-700">
            <Plus size={18} />
            New Curriculum
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
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
                          <button onClick={() => startEdit(curriculum)} className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-900">
                            <PencilLine size={16} />
                            Edit
                          </button>
                          <button onClick={() => handleDelete(curriculum)} className="inline-flex items-center gap-1 font-medium text-red-600 hover:text-red-900">
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

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">{editingId ? 'Edit Curriculum' : 'New Curriculum'}</h2>
                <p className="text-sm text-slate-600">Use a stable code so grade assignments can reference it later.</p>
              </div>
              {editingId && (
                <button onClick={resetForm} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                  <X size={14} />
                  Clear
                </button>
              )}
            </div>

            {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            <div className="space-y-4">
              <div>
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
              <div>
                <label className="block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Optional summary of the curriculum content and scope"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:bg-blue-400"
              >
                <Save size={16} />
                {saving ? 'Saving...' : editingId ? 'Update Curriculum' : 'Save Curriculum'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}