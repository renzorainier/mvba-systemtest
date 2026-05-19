'use client';

import { useEffect, useMemo, useState } from 'react';
import { LibraryBig, Plus, Search, PencilLine, Trash2, Save, X } from 'lucide-react';
import { useSchoolYearContext } from '@/components/SchoolYearContext';

const gradeLevels = ['Kinder 1', 'Kinder 2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

const emptyForm = {
  gl_curriculum_id: '',
  school_year_id: '',
  grade_level: '',
  curriculum_id: '',
  is_default: false,
};

export default function CurriculumAssignmentsPage() {
  const { isHistorical } = useSchoolYearContext();
  const [assignments, setAssignments] = useState([]);
  const [curriculums, setCurriculums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assignmentsRes, curriculumsRes] = await Promise.all([
        fetch('/api/grade-level-curriculums'),
        fetch('/api/curriculums'),
      ]);

      const [assignmentsData, curriculumsData] = await Promise.all([
        assignmentsRes.json(),
        curriculumsRes.json(),
      ]);

      if (assignmentsData.success) setAssignments(assignmentsData.data);
      if (curriculumsData.success) setCurriculums(curriculumsData.data);
    } catch (fetchError) {
      setError(fetchError.message || 'Failed to load curriculum assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredAssignments = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return assignments.filter((assignment) => {
      const curriculum = assignment.curriculum_id || {};
      return [
        assignment.gl_curriculum_id,
        assignment.school_year_id,
        assignment.grade_level,
        curriculum.curriculum_name,
        curriculum.curriculum_id,
      ].some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [assignments, searchTerm]);

  const resetForm = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setError('');
  };

  const startEdit = (assignment) => {
    if (isHistorical) {
      return;
    }

    setEditingId(assignment._id);
    setFormData({
      gl_curriculum_id: assignment.gl_curriculum_id || '',
      school_year_id: assignment.school_year_id || '',
      grade_level: assignment.grade_level || '',
      curriculum_id: assignment.curriculum_id?._id || assignment.curriculum_id || '',
      is_default: Boolean(assignment.is_default),
    });
  };

  const handleSave = async () => {
    if (isHistorical) {
      return;
    }

    try {
      setSaving(true);
      setError('');

      if (!formData.school_year_id || !formData.grade_level || !formData.curriculum_id) {
        setError('School year, grade level, and curriculum are required');
        return;
      }

      const payload = {
        ...formData,
        gl_curriculum_id: formData.gl_curriculum_id || `GLC-${Date.now()}`,
      };

      const response = await fetch(editingId ? `/api/grade-level-curriculums/${editingId}` : '/api/grade-level-curriculums', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save assignment');
      }

      await fetchData();
      resetForm();
    } catch (saveError) {
      setError(saveError.message || 'Failed to save assignment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (assignment) => {
    if (isHistorical) {
      return;
    }

    if (!window.confirm(`Delete grade-level curriculum ${assignment.gl_curriculum_id}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/grade-level-curriculums/${assignment._id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete assignment');
      }

      await fetchData();
      if (editingId === assignment._id) {
        resetForm();
      }
    } catch (deleteError) {
      setError(deleteError.message || 'Failed to delete assignment');
    }
  };

  const selectedCurriculum = curriculums.find((curriculum) => curriculum._id === formData.curriculum_id);

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-800 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
              <LibraryBig size={14} />
              Grade-Level Curriculum Matrix
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">Grade-Level Curriculum Assignment</h1>
            <p className="mt-1 text-sm text-slate-600">Assign a curriculum to each grade level and school year, then reuse it when creating sections.</p>
          </div>
          <button onClick={resetForm} disabled={isHistorical} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300">
            <Plus size={18} />
            New Assignment
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(420px,1fr)] xl:items-start">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by grade level, school year, curriculum, or assignment ID..."
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
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Assignment ID</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">School Year</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Grade Level</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Curriculum</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Default</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {!loading && filteredAssignments.length > 0 ? filteredAssignments.map((assignment) => {
                    const curriculum = assignment.curriculum_id || {};
                    return (
                      <tr key={assignment._id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-medium text-blue-600">{assignment.gl_curriculum_id}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{assignment.school_year_id}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">{assignment.grade_level}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          <div
                            className="max-w-[280px] truncate font-medium text-slate-900"
                            title={curriculum.curriculum_name || curriculum.curriculum_id || 'Unknown curriculum'}
                          >
                            {curriculum.curriculum_name || curriculum.curriculum_id || 'Unknown curriculum'}
                          </div>
                          <div className="mt-1 max-w-[280px] truncate text-xs text-slate-500" title={curriculum.curriculum_id || ''}>
                            {curriculum.curriculum_id || ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{assignment.is_default ? 'Yes' : 'No'}</td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-3">
                            <button onClick={() => startEdit(assignment)} disabled={isHistorical} className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-900 disabled:cursor-not-allowed disabled:text-blue-300 disabled:hover:text-blue-300">
                              <PencilLine size={16} />
                              Edit
                            </button>
                            <button onClick={() => handleDelete(assignment)} disabled={isHistorical} className="inline-flex items-center gap-1 font-medium text-red-600 hover:text-red-900 disabled:cursor-not-allowed disabled:text-red-300 disabled:hover:text-red-300">
                              <Trash2 size={16} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : loading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-slate-500">Loading assignments...</td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-slate-500">No grade-level curriculum assignments found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-6 xl:min-w-[420px]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">{editingId ? 'Edit Assignment' : 'New Assignment'}</h2>
                <p className="text-sm text-slate-600">Match a curriculum to one grade level in one school year.</p>
              </div>
              {editingId && (
                <button onClick={resetForm} disabled={isHistorical} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                  <X size={14} />
                  Clear
                </button>
              )}
            </div>

            {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Assignment Code</label>
                <input
                  type="text"
                  value={formData.gl_curriculum_id}
                  onChange={(e) => setFormData({ ...formData, gl_curriculum_id: e.target.value })}
                  placeholder="GLC-2026-G1"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700">School Year *</label>
                  <input
                    type="text"
                    value={formData.school_year_id}
                    onChange={(e) => setFormData({ ...formData, school_year_id: e.target.value })}
                    placeholder="2025-2026"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Grade Level *</label>
                  <select
                    value={formData.grade_level}
                    onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select grade level</option>
                    {gradeLevels.map((gradeLevel) => (
                      <option key={gradeLevel} value={gradeLevel}>{gradeLevel}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Curriculum *</label>
                <select
                  value={formData.curriculum_id}
                  onChange={(e) => setFormData({ ...formData, curriculum_id: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select curriculum</option>
                  {curriculums.map((curriculum) => (
                    <option key={curriculum._id} value={curriculum._id}>
                      {curriculum.curriculum_name} | {curriculum.curriculum_id}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Mark this assignment as default for the selected grade level and school year.
              </label>
              <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-700">
                <div className="font-medium text-slate-900">Preview</div>
                <div className="mt-2 space-y-1 text-slate-600">
                  <div>School Year: {formData.school_year_id || 'Not set'}</div>
                  <div>Grade Level: {formData.grade_level || 'Not set'}</div>
                  <div>Curriculum: {selectedCurriculum ? `${selectedCurriculum.curriculum_name} (${selectedCurriculum.curriculum_id})` : 'Not selected'}</div>
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={saving || isHistorical}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:bg-blue-400"
              >
                <Save size={16} />
                {saving ? 'Saving...' : editingId ? 'Update Assignment' : 'Save Assignment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}