import React, { useEffect, useState } from 'react';

export default function MonthlyBalanceModal({ open, onClose, student }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !student) return;
    setLoading(true);
    setError(null);
    setData(null);

    const id = student.learnersReferenceNumber || student._id;

    fetch(`/api/financials/monthly/${id}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setData(j.data);
        else setError(j.error || 'Failed to load breakdown');
      })
      .catch((err) => setError(err.message || 'Failed to load breakdown'))
      .finally(() => setLoading(false));
  }, [open, student]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4">
      <div className="fixed inset-0 bg-black opacity-40" onClick={onClose}></div>
      <div className="bg-white rounded-lg shadow-lg z-10 max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Monthly Breakdown</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900">Close</button>
        </div>
        <div className="p-4 max-h-[80vh] overflow-y-auto">
          {loading && <div className="text-sm text-gray-500">Loading...</div>}
          {error && <div className="text-sm text-red-500">{error}</div>}

          {data && (
            <div>
              <div className="mb-4">
                <div className="text-sm text-gray-600">Student</div>
                <div className="font-medium">{data.student.firstName} {data.student.lastName} — {data.student.learnersReferenceNumber}</div>
                <div className="text-sm text-gray-600">Grade: {data.student.gradeLevel || 'N/A'}</div>
                <div className="text-sm text-gray-600">Remaining Balance: <span className="font-bold text-rose-600">{new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',minimumFractionDigits:0}).format(Number(data.student.remainingBalance||0))}</span></div>
                <div className="mt-3 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 md:grid-cols-2">
                  <div>Amount due before school start: <span className="font-semibold text-slate-900">{new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',minimumFractionDigits:0}).format(Number(data.settings?.amountDueBeforeSchool || 0))}</span></div>
                  <div>Monthly schedule: <span className="font-semibold text-slate-900">{data.settings?.monthlyPaymentMonths || 'Not set'}</span></div>
                  <div>Monthly count: <span className="font-semibold text-slate-900">{Number(data.settings?.monthlyPaymentCount || 0)}</span></div>
                  <div>Monthly amount: <span className="font-semibold text-slate-900">{new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',minimumFractionDigits:0}).format(Number(data.settings?.monthlyPaymentAmount || 0))}</span></div>
                </div>
              </div>

              <div className="space-y-2">
                {data.breakdownItems.map((m) => (
                  <div key={m.key || m.label} className="flex items-center justify-between border p-3 rounded">
                    <div>
                      <div className="font-medium">{m.label}</div>
                      <div className="text-sm text-gray-500">Expected: {new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',minimumFractionDigits:0}).format(m.expectedAmount)} • Paid: {new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',minimumFractionDigits:0}).format(m.paidAmount)}</div>
                      {m.allocations && m.allocations.length > 0 ? (
                        <div className="text-sm text-gray-600 mt-1">Payments: {m.allocations.map(a=>`${new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',minimumFractionDigits:0}).format(a.amount)} (${new Date(a.dateOfPayment).toLocaleDateString()})`).join(' • ')}</div>
                      ) : m.payments && m.payments.length > 0 && (
                        <div className="text-sm text-gray-600 mt-1">Payments: {m.payments.map(p=>`${new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',minimumFractionDigits:0}).format(p.amountPaid)} (${new Date(p.dateOfPayment).toLocaleDateString()})`).join(' • ')}</div>
                      )}
                    </div>
                    <div>
                      <span className={`px-2 py-1 rounded text-sm font-medium ${m.status==='paid'? 'bg-green-100 text-green-800' : m.status==='partial' ? 'bg-yellow-100 text-yellow-800' : m.status==='unpaid' ? 'bg-rose-100 text-rose-800' : 'bg-gray-100 text-gray-700'}`}>
                        {m.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
