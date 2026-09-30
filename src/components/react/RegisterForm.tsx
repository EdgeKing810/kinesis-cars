import { useState, type SyntheticEvent } from 'react';
import { AppProvider, ApiError, useApp, type RegisterResponse } from '../../context/AppContext';
import { isValidEmail, isValidPassword, isValidUsername } from '../../lib/validation';
import { useMinDelay } from '../../lib/useMinDelay';
import Skeleton from './Skeleton';
import PasswordInput from './PasswordInput';

type Role = 'CLIENT' | 'MERCHANT';

const roles: { value: Role; title: string; description: string }[] = [
  { value: 'CLIENT', title: 'I want to rent cars', description: 'Browse the fleet and book vehicles for your trips.' },
  {
    value: 'MERCHANT',
    title: 'I want to list my fleet',
    description: 'Register as a merchant and manage vehicles & bookings.',
  },
];

function CarIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

function FleetIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M2 7h20" />
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <path d="M6 21v-4" />
      <path d="M18 21v-4" />
      <path d="M9 17h6" />
    </svg>
  );
}

function RegisterFormInner() {
  const { request, auth } = useApp();
  const ready = useMinDelay(450);
  const [role, setRole] = useState<Role>('CLIENT');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [registered, setRegistered] = useState<{ id: string; message: string } | null>(null);

  const inputClass = (field: string) => `input input-bordered mt-2 w-full ${errors[field] ? 'border-error' : ''}`;

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Full name is required.';
    if (!username.trim()) next.username = 'Username is required.';
    else if (!isValidUsername(username)) next.username = 'Username must be at least 8 characters.';
    if (!email.trim()) next.email = 'Email address is required.';
    else if (!isValidEmail(email)) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Password is required.';
    else if (!isValidPassword(password))
      next.password = 'Password needs 1 lowercase, 1 uppercase, 1 symbol and 8+ characters.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const result = await request<RegisterResponse>('auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim(),
          email_address: email.trim(),
          password,
          role,
        }),
      });
      setRegistered({ id: result.id, message: result.message });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <div className="mt-8 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-[4.25rem] w-full" />
        <Skeleton className="h-[4.25rem] w-full" />
        <Skeleton className="h-[4.25rem] w-full" />
        <Skeleton className="h-[4.25rem] w-full" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    );
  }

  if (auth) {
    return (
      <div className="py-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/15 text-brand-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h2 className="mt-5 text-xl font-bold text-white">You're already signed in</h2>
        <p className="mt-2 text-sm text-slate-400">You already have an account — head back to your dashboard.</p>
        <a href="/account" className="btn btn-primary mt-6">
          Go to your account
        </a>
      </div>
    );
  }

  if (registered) {
    return (
      <div className="py-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h2 className="mt-5 text-xl font-bold text-white">Check your email</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          We sent a verification link to <span className="font-medium text-white">{email}</span>. Click it to activate
          your account before signing in.
        </p>
        {registered.message && <p className="mt-2 text-sm text-emerald-400">{registered.message}</p>}
        <a href="/login" className="btn btn-primary mt-6">
          Go to sign in
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
      <div className="grid lg:grid-cols-2 gap-3" role="radiogroup" aria-label="Account type">
        {roles.map((roleOption) => (
          <button
            type="button"
            key={roleOption.value}
            onClick={() => setRole(roleOption.value)}
            aria-pressed={role === roleOption.value}
            className={`rounded-2xl border p-4 text-left transition ${
              role === roleOption.value
                ? 'border-brand-500/60 bg-brand-500/10'
                : 'border-white/10 bg-slate-950 hover:border-white/20'
            }`}
          >
            <div className="flex lg:flex-col items-center lg:items-start gap-3">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${role === roleOption.value ? 'bg-brand-500/20 text-brand-400' : 'bg-brand-500/15 text-brand-500'}`}
              >
                {roleOption.value === 'CLIENT' ? <CarIcon /> : <FleetIcon />}
              </span>
              <span className="block text-sm font-semibold text-white">{roleOption.title}</span>
            </div>
            <span className="mt-1 block text-xs leading-relaxed text-slate-400">{roleOption.description}</span>
          </button>
        ))}
      </div>

      <label className="block">
        <span className="text-sm font-medium text-slate-300">Full name</span>
        <input
          type="text"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          placeholder="Jane Doe"
          className={inputClass('name')}
        />
        {errors.name && <span className="mt-1 block text-xs text-red-400">{errors.name}</span>}
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-300">Username</span>
        <input
          type="text"
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          placeholder="8 characters minimum"
          className={inputClass('username')}
        />
        {errors.username && <span className="mt-1 block text-xs text-red-400">{errors.username}</span>}
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-300">Email address</span>
        <input
          type="email"
          name="email_address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@example.com"
          className={inputClass('email')}
        />
        {errors.email && <span className="mt-1 block text-xs text-red-400">{errors.email}</span>}
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-300">Password</span>
        <PasswordInput
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          placeholder="1 lowercase, 1 uppercase, 1 symbol, 8+ characters"
          className={inputClass('password')}
        />
        {errors.password && <span className="mt-1 block text-xs text-red-400">{errors.password}</span>}
      </label>

      {serverError && (
        <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {serverError}
        </p>
      )}

      <button type="submit" disabled={submitting} className="btn btn-primary w-full disabled:opacity-60">
        {submitting ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}

export default function RegisterForm() {
  return (
    <AppProvider>
      <RegisterFormInner />
    </AppProvider>
  );
}
