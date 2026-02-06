"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify(formData),
    });

    const data = await res.json();

    if (data.success) {
      // Redirect to the Dashboard "Private World"
      router.push('/portal/dashboard');
    } else {
      setError(data.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-900">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-96">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">MVBA System Login</h2>

        {error && <div className="bg-red-100 text-red-600 p-2 text-sm rounded mb-4">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            className="w-full border p-2 rounded"
            onChange={(e) => setFormData({...formData, username: e.target.value})}
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full border p-2 rounded"
            onChange={(e) => setFormData({...formData, password: e.target.value})}
          />
          <button className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
// "use client";

// import { useState } from 'react';

// export default function Home() {
//   const [formData, setFormData] = useState({ name: '', studentId: '' });
//   const [status, setStatus] = useState('');

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setStatus('Saving...');

//     try {
//       const res = await fetch('/api/enroll', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(formData),
//       });

//       if (res.ok) {
//         setStatus('✅ Saved to Cloud!');
//         setFormData({ name: '', studentId: '' });
//       } else {
//         setStatus('❌ Error Saving');
//       }
//     } catch (err) {
//       setStatus('❌ Connection Failed');
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-100 flex items-center justify-center">
//       <div className="bg-white p-8 rounded-lg shadow-xl w-96">
//         <h1 className="text-2xl font-bold mb-6 text-blue-900">MBA Enrollment</h1>

//         <form onSubmit={handleSubmit} className="flex flex-col gap-4">
//           <div>
//             <label className="block text-sm font-medium text-gray-700">Student Name</label>
//             <input
//               type="text"
//               className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-black"
//               placeholder="e.g. Darwin Lapid"
//               value={formData.name}
//               onChange={(e) => setFormData({...formData, name: e.target.value})}
//               required
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700">Student ID</label>
//             <input
//               type="text"
//               className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-black"
//               placeholder="e.g. 2025-001"
//               value={formData.studentId}
//               onChange={(e) => setFormData({...formData, studentId: e.target.value})}
//               required
//             />
//           </div>

//           <button
//             type="submit"
//             className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200"
//           >
//             Enroll Student
//           </button>
//         </form>

//         <p className="mt-4 text-center text-sm font-semibold text-gray-600">
//           {status}
//         </p>
//       </div>
//     </div>
//   );
// }
