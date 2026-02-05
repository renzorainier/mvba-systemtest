"use client";
import { useState } from 'react';

export default function Home() {
  const [formData, setFormData] = useState({ name: '', studentId: '' });
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Saving...');

    try {
      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setStatus('✅ Saved to Cloud!');
        setFormData({ name: '', studentId: '' });
      } else {
        setStatus('❌ Error Saving');
      }
    } catch (err) {
      setStatus('❌ Connection Failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-xl w-96">
        <h1 className="text-2xl font-bold mb-6 text-blue-900">MBA Enrollment</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Student Name</label>
            <input
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-black"
              placeholder="e.g. Darwin Lapid"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Student ID</label>
            <input
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-black"
              placeholder="e.g. 2025-001"
              value={formData.studentId}
              onChange={(e) => setFormData({...formData, studentId: e.target.value})}
              required
            />
          </div>

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200"
          >
            Enroll Student
          </button>
        </form>

        <p className="mt-4 text-center text-sm font-semibold text-gray-600">
          {status}
        </p>
      </div>
    </div>
  );
}
