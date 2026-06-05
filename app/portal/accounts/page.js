"use client";
import { useEffect, useState } from 'react';
import {
  UserCog,
  RefreshCw,
  Plus,
  Copy,
  Check,
  ShieldCheck,
  ShieldOff,
  ShieldAlert,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { FieldError } from '@/components/FieldError';
import { validateName } from '@/lib/validation';

const ROLE_COLORS = {
  Admin: 'bg-purple-100 text-purple-800',
  'Sub-Admin': 'bg-orange-100 text-orange-800',
  Registrar: 'bg-blue-100 text-blue-800',
  Cashier: 'bg-green-100 text-green-800',
};

const CODE_STATUS_CONFIG = {
  none: { label: 'Not Generated', icon: ShieldOff, color: 'text-gray-400' },
  active: { label: 'Active (Unused)', icon: ShieldCheck, color: 'text-emerald-600' },
  used: { label: 'Used', icon: ShieldAlert, color: 'text-amber-500' },
};

function RecoveryCodeModal({ code, onClose }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-[1.75rem] bg-white p-8 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Recovery Code Generated</h2>
            <p className="text-sm text-slate-500 mt-1">This code will only be shown once.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 mb-3">One-Time Recovery Code</p>
          <p className="text-2xl font-mono font-bold tracking-[0.3em] text-slate-900 break-all">{code}</p>
        </div>

        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 leading-relaxed">
          <strong>Store this code securely.</strong> Once you close this window, the code cannot be retrieved. Give it directly to the user in a secure manner. The code can only be used once to reset the password.
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {copied ? <><Check size={16} className="text-emerald-600" /> Copied!</> : <><Copy size={16} /> Copy Code</>}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            I've saved the code
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateAccountModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ username: '', fullName: '', role: 'Registrar', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const updateField = (key, value) => {
    setForm((p) => ({ ...p, [key]: value }));
    setFieldErrors((p) => (p[key] ? { ...p, [key]: undefined } : p));
  };

  const validate = () => {
    const errors = {};
    const nameError = validateName(form.fullName, 'Full name');
    if (nameError) errors.fullName = nameError;
    if (!form.username.trim()) errors.username = 'Username is required.';
    if (!form.role) errors.role = 'Role is required.';
    if (!form.password) errors.password = 'Password is required.';
    else if (form.password.length < 8) errors.password = 'Password must be at least 8 characters.';
    if (!form.confirm) errors.confirm = 'Please confirm the password.';
    else if (form.password !== form.confirm) errors.confirm = 'Passwords do not match.';
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, fullName: form.fullName, role: form.role, password: form.password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onCreated(data.data);
        onClose();
      } else if (res.status === 409) {
        setFieldErrors((p) => ({ ...p, username: data.message || 'Username already taken.' }));
      } else {
        setError(data.message || 'Failed to create account.');
      }
    } catch {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (hasError) =>
    `w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-white ${
      hasError ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-[1.75rem] bg-white p-8 shadow-2xl">
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Create Account</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Full Name <span className="text-red-600">*</span></label>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => updateField('fullName', e.target.value)}
              className={inputClass(fieldErrors.fullName)}
            />
            <FieldError message={fieldErrors.fullName} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Username <span className="text-red-600">*</span></label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => updateField('username', e.target.value)}
              className={inputClass(fieldErrors.username)}
            />
            <FieldError message={fieldErrors.username} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Role <span className="text-red-600">*</span></label>
            <select
              value={form.role}
              onChange={(e) => updateField('role', e.target.value)}
              className={inputClass(fieldErrors.role)}
            >
              <option value="Admin">Admin</option>
              <option value="Sub-Admin">Sub-Admin</option>
              <option value="Registrar">Registrar</option>
              <option value="Cashier">Cashier</option>
            </select>
            <FieldError message={fieldErrors.role} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Password <span className="text-red-600">*</span></label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                className={`${inputClass(fieldErrors.password)} pr-11`}
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <FieldError message={fieldErrors.password} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Confirm Password <span className="text-red-600">*</span></label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.confirm}
              onChange={(e) => updateField('confirm', e.target.value)}
              className={inputClass(fieldErrors.confirm)}
            />
            <FieldError message={fieldErrors.confirm} />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[#0E3B68] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1a4d80] transition-colors disabled:opacity-60"
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [currentUserName, setCurrentUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generatingId, setGeneratingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [generatedCode, setGeneratedCode] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchAccounts = async () => {
    try {
      setError('');
      const res = await fetch('/api/admin/accounts');
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load accounts.');
      setAccounts(data.data);
      setCurrentUserName(data.currentUserName || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, []);

  const generateCode = async (id) => {
    setGeneratingId(id);
    try {
      const res = await fetch(`/api/admin/accounts/${id}/recovery-code`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setGeneratedCode(data.plaintext);
        setAccounts((prev) =>
          prev.map((a) =>
            a._id === id
              ? { ...a, recoveryCodeStatus: 'active', recoveryCodeCreatedAt: new Date().toISOString(), recoveryCodeUsedAt: null }
              : a
          )
        );
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setGeneratingId(null);
    }
  };

  const toggleActive = async (account) => {
    setTogglingId(account._id);
    try {
      const res = await fetch(`/api/admin/accounts/${account._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !account.isActive }),
      });
      if (res.ok) {
        setAccounts((prev) =>
          prev.map((a) => (a._id === account._id ? { ...a, isActive: !a.isActive } : a))
        );
      }
    } catch {
      // silently fail
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-white p-4 text-slate-800 lg:p-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0E3B68]">
              <UserCog className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Account Management</h1>
              <p className="text-sm text-slate-500">Manage user accounts and recovery codes</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0E3B68] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1a4d80] transition-colors shadow-sm"
          >
            <Plus size={16} />
            Create Account
          </button>
        </div>

        {/* Info banner */}
        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-800 leading-relaxed">
          <strong>Recovery codes</strong> allow users to regain access to their accounts without internet connectivity. Generate a code per user, record it securely, and hand it directly to the user. Each code is single-use and immediately invalidated after a password reset.
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="text-sm text-slate-500 py-8 text-center">Loading accounts...</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-widest text-slate-500">Name</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-widest text-slate-500">Username</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-widest text-slate-500">Role</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-widest text-slate-500">Status</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-widest text-slate-500">Recovery Code</th>
                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-widest text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.map((account) => {
                  const codeConfig = CODE_STATUS_CONFIG[account.recoveryCodeStatus] || CODE_STATUS_CONFIG.none;
                  const StatusIcon = codeConfig.icon;
                  const isSelf = account.fullName === currentUserName;
                  return (
                    <tr key={account._id} className="bg-white hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {account.fullName}
                        {isSelf && <span className="ml-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">You</span>}
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-600">{account.username}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${ROLE_COLORS[account.role] || 'bg-gray-100 text-gray-700'}`}>
                          {account.role}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${account.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                          {account.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className={`inline-flex items-center gap-1.5 text-xs font-semibold ${codeConfig.color}`}>
                          <StatusIcon size={14} />
                          {codeConfig.label}
                        </div>
                        {account.recoveryCodeCreatedAt && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {account.recoveryCodeStatus === 'used' ? 'Used' : 'Generated'}{' '}
                            {new Date(account.recoveryCodeUsedAt || account.recoveryCodeCreatedAt).toLocaleDateString()}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => generateCode(account._id)}
                            disabled={generatingId === account._id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-wait"
                          >
                            <RefreshCw size={13} className={generatingId === account._id ? 'animate-spin' : ''} />
                            {account.recoveryCodeStatus === 'none' ? 'Generate Code' : 'Regenerate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleActive(account)}
                            disabled={togglingId === account._id || (isSelf && account.isActive)}
                            title={isSelf && account.isActive ? 'You cannot deactivate your own account' : undefined}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                              account.isActive
                                ? 'border-red-200 text-red-700 hover:bg-red-50'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {account.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {accounts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">No accounts found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {generatedCode && (
        <RecoveryCodeModal code={generatedCode} onClose={() => setGeneratedCode(null)} />
      )}

      {showCreate && (
        <CreateAccountModal
          onClose={() => setShowCreate(false)}
          onCreated={(newAccount) => setAccounts((prev) => [...prev, { ...newAccount, recoveryCodeStatus: 'none' }])}
        />
      )}
    </div>
  );
}
