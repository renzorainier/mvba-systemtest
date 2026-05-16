'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search,
  Plus, 
  Clock,
  ChevronLeft,
  MoreVertical,
  Trash2,
  Save,
  Wand2 
} from 'lucide-react';

export default function ScheduleManagement() {
  const [viewMode, setViewMode] = useState('list'); 
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // --- EDITOR STATE ---
  const [currentScheduleName, setCurrentScheduleName] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('Kinder 1'); // Updated default grade
  
  const subjects = ['Math', 'Science', 'English', 'History', 'PE', 'Arts', 'Computer'];
  const [newClass, setNewClass] = useState({
    subject: '',
    day: 'Monday',
    startTime: '08:00',
    endTime: '09:00'
  });

  const [scheduleItems, setScheduleItems] = useState([]);

  // --- FETCH SCHEDULES ON MOUNT ---
  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/schedules');
      const data = await response.json();

      if (data.success) {
        setSchedules(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLERS ---
  
  // Clear the form to start a fresh schedule
  const handleCreateNew = () => {
    setCurrentScheduleName('');
    setSelectedGrade('Kinder 1');
    setScheduleItems([]);
    setError('');
    setViewMode('editor');
  };

  // Load an existing schedule into the editor to view/edit it
  const handleViewSchedule = (schedule) => {
    setCurrentScheduleName(schedule.name);
    setSelectedGrade(schedule.gradeLevel);
    setScheduleItems(schedule.items || []);
    setError('');
    setViewMode('editor');
  };

  const handleAddClass = () => {
    if (!newClass.subject) return;
    
    setScheduleItems([
      ...scheduleItems, 
      { ...newClass, id: Date.now().toString(), type: 'class' }
    ]);
  };

  const handleAutoGenerate = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const slots = [
      { start: '07:30', end: '08:30', type: 'class' },
      { start: '08:30', end: '09:30', type: 'class' },
      { start: '09:30', end: '10:00', type: 'recess' },
      { start: '10:00', end: '11:00', type: 'class' },
      { start: '11:00', end: '12:00', type: 'class' },
      { start: '12:00', end: '13:00', type: 'lunch' }, 
      { start: '13:00', end: '14:00', type: 'class' },
    ];

    let newItems = [];
    let idCounter = Date.now();

    days.forEach(day => {
      slots.forEach(slot => {
        if (slot.type === 'recess') {
          newItems.push({ id: (idCounter++).toString(), subject: 'RECESS', day, startTime: slot.start, endTime: slot.end, type: 'recess' });
        } else if (slot.type === 'lunch') {
          newItems.push({ id: (idCounter++).toString(), subject: 'LUNCH BREAK', day, startTime: slot.start, endTime: slot.end, type: 'lunch' });
        } else {
          const randomSub = subjects[Math.floor(Math.random() * subjects.length)];
          newItems.push({ id: (idCounter++).toString(), subject: randomSub, day, startTime: slot.start, endTime: slot.end, type: 'class' });
        }
      });
    });

    setScheduleItems(newItems);
  };

  // --- SAVE TO MONGODB ---
  const handleSaveSchedule = async () => {
    if (!currentScheduleName) {
      setError("Schedule name is required");
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      name: currentScheduleName,
      gradeLevel: selectedGrade,
      totalSubjects: scheduleItems.filter(i => i.type === 'class').length,
      items: scheduleItems
    };

    try {
      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to save schedule');

      // Refresh list and reset form
      fetchSchedules();
      setViewMode('list');
      setScheduleItems([]);
      setCurrentScheduleName('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredSchedules = schedules.filter(sch => 
    sch.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    sch.scheduleId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredSchedules.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedSchedules = filteredSchedules.slice(startIdx, startIdx + itemsPerPage);

  // Reset page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const renderTimeBlocks = (day) => {
    const dayItems = scheduleItems.filter(item => item.day === day);
    dayItems.sort((a, b) => a.startTime.localeCompare(b.startTime));

    return dayItems.map((item) => {
      let bgClass = "bg-blue-100 border-l-4 border-blue-600";
      let textClass = "text-blue-800";
      
      if (item.type === 'recess') {
        bgClass = "bg-orange-100 border-l-4 border-orange-400 opacity-90";
        textClass = "text-orange-800 uppercase tracking-widest text-center";
      } else if (item.type === 'lunch') {
        bgClass = "bg-gray-100 border-l-4 border-gray-400 opacity-90";
        textClass = "text-gray-700 uppercase tracking-widest text-center";
      }

      return (
        <div key={item.id} className={`${bgClass} p-2 mb-2 rounded shadow-sm text-xs relative group transition-all hover:shadow-md`}>
          <div className={`font-bold ${textClass}`}>{item.subject}</div>
          <div className="text-gray-600 mt-1">{item.startTime} - {item.endTime}</div>
          
          <button 
            onClick={() => setScheduleItems(scheduleItems.filter(i => i.id !== item.id))}
            className="absolute top-1 right-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 size={12} />
          </button>
        </div>
      );
    });
  };

  // List of grades for the dropdown
  const gradeLevels = ['Kinder 1', 'Kinder 2', 'Kinder 3', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-slate-800">
      <main className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto">
        
        {/* VIEW 1: SCHEDULE LIST */}
        {viewMode === 'list' && (
          <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
              <h1 className="text-2xl font-bold text-gray-800">Schedule Management</h1>
              <button 
                onClick={handleCreateNew}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Schedule
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Search schedules by name or ID..." 
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Schedule ID</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Schedule Name</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Grade Level</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Subjects</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Date Created</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {!loading && paginatedSchedules.length > 0 ? (
                      paginatedSchedules.map((sch) => (
                        <tr key={sch._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-blue-600">{sch.scheduleId}</td>
                          <td className="px-6 py-4 text-sm font-bold text-gray-900">{sch.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{sch.gradeLevel}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{sch.totalSubjects} Classes</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{new Date(sch.createdAt).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => handleViewSchedule(sch)}
                              className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded-full hover:bg-blue-50"
                              title="View/Edit Schedule"
                            >
                              <MoreVertical size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : loading ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">Loading schedules...</td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">No schedules found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between flex-wrap gap-4">
                <span className="text-sm text-gray-500">
                  Showing <span className="font-medium">{startIdx + 1}</span>-<span className="font-medium">{Math.min(startIdx + itemsPerPage, filteredSchedules.length)}</span> of <span className="font-medium">{filteredSchedules.length}</span> schedules
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages || 1}</span>
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: CREATE / EDIT SCHEDULE */}
        {viewMode === 'editor' && (
          <div className="animate-fade-in space-y-6">
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <button onClick={() => setViewMode('list')} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">Schedule Editor</h1>
                  <p className="text-sm text-gray-500">Define class times and subjects</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleAutoGenerate}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center shadow-sm transition-colors"
                >
                  <Wand2 className="w-4 h-4 mr-2" /> Auto-Generate
                </button>
                <button 
                  onClick={handleSaveSchedule}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-2 rounded-md text-sm font-medium flex items-center shadow-sm"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Schedule'}
                </button>
              </div>
            </div>

            {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Name *</label>
                <input 
                  type="text" 
                  value={currentScheduleName}
                  onChange={(e) => setCurrentScheduleName(e.target.value)}
                  placeholder="e.g. Kinder 1 - Morning Set A" 
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level *</label>
                <select 
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {gradeLevels.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="flex items-end pb-2">
                <span className="text-sm font-medium text-gray-500">
                  <Clock className="inline w-4 h-4 mr-1"/> Total Classes: {scheduleItems.filter(i => i.type === 'class').length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1 bg-white p-5 rounded-lg shadow-sm border border-gray-200 h-fit">
                <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Add Class</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Subject</label>
                    <select className="w-full border border-gray-300 rounded p-2 text-sm" value={newClass.subject} onChange={(e) => setNewClass({...newClass, subject: e.target.value})}>
                      <option value="">Select Subject...</option>
                      {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Day</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                        <button key={day} onClick={() => setNewClass({...newClass, day})} className={`text-xs py-1 rounded border ${newClass.day === day ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                          {day.substr(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Start</label>
                      <input type="time" value={newClass.startTime} onChange={(e) => setNewClass({...newClass, startTime: e.target.value})} className="w-full border border-gray-300 rounded p-1 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">End</label>
                      <input type="time" value={newClass.endTime} onChange={(e) => setNewClass({...newClass, endTime: e.target.value})} className="w-full border border-gray-300 rounded p-1 text-sm" />
                    </div>
                  </div>
                  <button onClick={handleAddClass} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md text-sm font-semibold transition-colors flex justify-center items-center">
                    <Plus className="w-4 h-4 mr-1" /> Add to Grid
                  </button>
                </div>
              </div>

              <div className="lg:col-span-3 bg-white p-5 rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
                <div className="min-w-[600px]">
                  <div className="grid grid-cols-5 gap-4 mb-4 text-center border-b pb-2">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(d => <div key={d} className="font-bold text-gray-700">{d}</div>)}
                  </div>
                  <div className="grid grid-cols-5 gap-4 h-[600px] overflow-y-auto">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                      <div key={day} className="bg-gray-50 rounded-lg p-2 min-h-[400px] border border-gray-100">
                        {scheduleItems.filter(i => i.day === day).length === 0 && <div className="text-center text-gray-300 text-xs mt-10 italic">Free Day</div>}
                        {renderTimeBlocks(day)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}