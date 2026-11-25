import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { errMsg } from '../api/client';
import Logo from '../components/Logo';
import { FormInput } from '../components/ui';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      setError('Username dan password wajib diisi.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await login(form.username.trim(), form.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.status === 401 ? 'Username atau password salah.' : errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-8">
        <Logo className="mb-2" />
        <h1 className="text-center text-lg font-semibold">Sign in</h1>
        {error && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-600">{error}</p>}
        <FormInput label="Username" autoFocus autoComplete="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <FormInput label="Password" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="btn-primary w-full" disabled={busy}>
          {busy && <Loader2 size={16} className="animate-spin" />} Sign in
        </button>
        <p className="text-center text-xs text-ink-muted">Demo: admin / Admin123!</p>
      </form>
    </div>
  );
}
