import { useCallback, useEffect, useState } from 'react';
import {
  AppProvider,
  ApiError,
  useApp,
  type OtpGenerateResponse,
  type OtpMutationResponse,
  type OtpSetup,
  type User,
  type UserDeleteResponse,
  type UserResponse,
} from '../../context/AppContext';
import { useMinDelay } from '../../lib/useMinDelay';
import Skeleton from './Skeleton';
import EditProfile from './EditProfile';

function RoleBadge({ role }: { role: User['role'] }) {
  const styles: Record<User['role'], string> = {
    ADMIN: 'border-brand-500/30 bg-brand-500/15 text-brand-300',
    MERCHANT: 'border-brand-500/30 bg-brand-500/15 text-brand-400',
    CLIENT: 'border-sky-500/30 bg-sky-500/15 text-sky-300',
  };
  return <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[role]}`}>{role}</span>;
}

function InitialsAvatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/15 text-xl font-bold text-brand-400">
      {initials}
    </span>
  );
}

function AccountPanelInner() {
  const { auth, request, logout } = useApp();
  const ready = useMinDelay(1000);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; sessionExpired?: boolean } | null>(null);

  const [otpSetup, setOtpSetup] = useState<OtpSetup | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [confirmDisable, setConfirmDisable] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      const res = await request<UserResponse>(`user/me?id=${encodeURIComponent(auth.id)}`);
      if (res.user) setProfile(res.user);
    } catch (err) {
      setError({
        message: err instanceof ApiError ? err.message : 'Failed to load your profile.',
        sessionExpired: err instanceof ApiError && err.status === 403,
      });
    } finally {
      setLoading(false);
    }
  }, [auth, request]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  async function handleGenerateOtp() {
    if (!auth) return;
    setOtpBusy(true);
    setOtpError(null);
    setOtpMessage(null);
    setOtpCode('');
    try {
      const res = await request<OtpGenerateResponse>('auth/otp/generate', {
        method: 'PATCH',
        body: JSON.stringify({ id: auth.id }),
      });
      setOtpSetup(res.otp ?? null);
      setOtpMessage(res.message ?? 'Scan the QR code with your authenticator app.');
    } catch (err) {
      setOtpError(err instanceof ApiError ? err.message : 'Failed to generate two-factor setup.');
    } finally {
      setOtpBusy(false);
    }
  }

  async function handleVerifyOtp() {
    if (!auth) return;
    if (!otpCode.trim()) {
      setOtpError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setOtpBusy(true);
    setOtpError(null);
    try {
      const res = await request<OtpMutationResponse>('auth/otp/verify', {
        method: 'PATCH',
        body: JSON.stringify({ id: auth.id, otp_code: otpCode.trim() }),
      });
      setOtpMessage(res.message ?? 'Two-factor authentication is now enabled.');
      setOtpSetup(null);
      setOtpCode('');
      await fetchProfile();
    } catch (err) {
      setOtpError(err instanceof ApiError ? err.message : 'Failed to enable two-factor authentication.');
    } finally {
      setOtpBusy(false);
    }
  }

  async function handleDisableOtp() {
    if (!auth) return;
    setOtpBusy(true);
    setOtpError(null);
    setConfirmDisable(false);
    try {
      const res = await request<OtpMutationResponse>('auth/otp/disable', {
        method: 'PATCH',
        body: JSON.stringify({ id: auth.id }),
      });
      setOtpMessage(res.message ?? 'Two-factor authentication has been disabled.');
      setOtpSetup(null);
      await fetchProfile();
    } catch (err) {
      setOtpError(err instanceof ApiError ? err.message : 'Failed to disable two-factor authentication.');
    } finally {
      setOtpBusy(false);
    }
  }

  function handleSignOut() {
    logout();
    window.location.href = '/';
  }

  async function handleDeleteAccount() {
    if (!auth) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await request<UserDeleteResponse>(`user/delete?id=${encodeURIComponent(auth.id)}`, {
        method: 'DELETE',
      });
      setDeleted(true);
      logout();
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Failed to delete your account.');
      setDeleting(false);
    }
  }

  if (deleted) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-8 text-center">
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
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </div>
        <h2 className="mt-5 text-xl font-bold text-white">Account deleted</h2>
        <p className="mt-2 text-sm text-slate-400">We're sorry to see you go. Taking you back home…</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="space-y-6">
        <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-8">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-9 w-24" />
          </div>
          <div className="mt-6 flex items-start gap-8">
            <Skeleton className="h-16 w-16 rounded-2xl" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-7 w-52" />
              <Skeleton className="h-6 w-72" />
              <div className="grid gap-3 pt-3 sm:grid-cols-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-32" />
              </div>
            </div>
          </div>
        </section>
        <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-8">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="mt-4 h-11 w-full" />
        </section>
      </div>
    );
  }

  if (!auth) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">Your account</h1>
        <p className="mt-2 text-sm text-slate-400">Sign in to view your profile and security settings.</p>
        <a href="/login" className="btn btn-primary mt-6">
          Sign in
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile */}
      <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-white">Your account</h1>
          <button type="button" onClick={handleSignOut} className="btn btn-outline btn-error btn-sm">
            Sign out
          </button>
        </div>

        {loading && (
          <div className="mt-6 flex items-start gap-8">
            <Skeleton className="h-16 w-16 rounded-2xl" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-7 w-52" />
              <Skeleton className="h-6 w-72" />
              <div className="grid gap-3 pt-3 sm:grid-cols-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-32" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            <p>{error.message}</p>
            {error.sessionExpired && (
              <a href="/login" className="btn btn-error btn-sm mt-2">
                Sign in again
              </a>
            )}
          </div>
        )}

        {!loading && profile && (
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
            {profile.profile_picture ? (
              <img
                src={profile.profile_picture}
                alt={`${profile.name} avatar`}
                className="h-16 w-16 rounded-2xl object-cover"
              />
            ) : (
              <InitialsAvatar name={profile.name} />
            )}

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-semibold text-white">{profile.name}</h2>
                <RoleBadge role={profile.role} />
                {profile.email_verified ? (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                    Email verified
                  </span>
                ) : (
                  <span className="rounded-full border border-yellow-500/30 bg-yellow-500/15 px-2.5 py-0.5 text-xs font-semibold text-yellow-300">
                    Email unverified
                  </span>
                )}
              </div>
              <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Username</dt>
                  <dd className="mt-0.5 text-white">@{profile.username}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Email</dt>
                  <dd className="mt-0.5 text-white">{profile.email_address}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </section>

      {profile && <EditProfile profile={profile} onSaved={fetchProfile} />}

      {profile && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-900/50 p-8">
          <div>
            <h2 className="text-lg font-semibold text-white">Driver verification</h2>
            <p className="mt-1 text-sm text-slate-400">Submit your driver license to get verified and start renting.</p>
          </div>
          <a href="/verification" className="btn btn-primary">
            Manage
          </a>
        </section>
      )}

      {profile?.role === 'ADMIN' && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-brand-500/20 bg-gradient-to-br from-brand-500/10 to-slate-950 p-8">
          <div>
            <h2 className="text-lg font-semibold text-white">Administrator</h2>
            <p className="mt-1 text-sm text-slate-400">Manage users on the platform.</p>
          </div>
          <a href="/admin/users" className="btn btn-primary">
            Manage users
          </a>
        </section>
      )}

{(profile?.role === 'ADMIN' || profile?.role === 'MERCHANT') && (
				<section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-900/50 p-8">
					<div>
						<h2 className="text-lg font-semibold text-white">Fleets</h2>
						<p className="mt-1 text-sm text-slate-400">Group your vehicles into fleets for easy management.</p>
					</div>
					<a href="/fleets" className="btn btn-primary">
						Manage fleets
					</a>
				</section>
			)}

			{(profile?.role === 'ADMIN' || profile?.role === 'MERCHANT') && (
				<section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-900/50 p-8">
					<div>
						<h2 className="text-lg font-semibold text-white">Vehicles</h2>
						<p className="mt-1 text-sm text-slate-400">List, add and manage the vehicles in your fleet.</p>
					</div>
					<a href="/vehicles" className="btn btn-primary">
						Manage vehicles
					</a>
				</section>
			)}

			{/* Security / two-factor */}
      <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-8">
        <h2 className="text-lg font-semibold text-white">Security</h2>

        {profile && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
            <div>
              <p className="font-medium text-white">Two-factor authentication</p>
              <p className="mt-1 text-sm text-slate-400">
                {profile.otp_enabled
                  ? 'Enabled — an OTP code is required when signing in.'
                  : 'Disabled — add an extra layer of security to your account.'}
              </p>
            </div>
            {!profile.otp_enabled ? (
              <button
                type="button"
                onClick={handleGenerateOtp}
                disabled={otpBusy}
                className="btn btn-primary disabled:opacity-60"
              >
                {otpBusy && !otpSetup ? 'Generating…' : 'Enable 2FA'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDisable(true)}
                disabled={otpBusy}
                className="btn btn-outline btn-error btn-sm disabled:opacity-60"
              >
                Disable 2FA
              </button>
            )}
          </div>
        )}

        {confirmDisable && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-red-400/30 bg-red-400/10 p-5">
            <p className="text-sm text-red-200">Disable two-factor authentication for this account?</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirmDisable(false)} className="btn btn-outline btn-sm">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisableOtp}
                disabled={otpBusy}
                className="btn btn-error disabled:opacity-60"
              >
                {otpBusy ? 'Disabling…' : 'Yes, disable'}
              </button>
            </div>
          </div>
        )}

        {otpSetup && (
          <div className="mt-4 rounded-2xl border border-brand-500/30 bg-slate-950/60 p-6">
            <h3 className="text-base font-semibold text-white">Scan to set up 2FA</h3>
            <p className="mt-1 text-sm text-slate-400">
              Scan the QR code with Google Authenticator, Authy or similar, then activate below.
            </p>

            <div className="mt-5 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
              {otpSetup.qr_code ? (
                <img
                  src={`data:image/png;base64,${otpSetup.qr_code}`}
                  alt="QR code for your authenticator app"
                  className="h-40 w-40 rounded-xl border border-white/10 bg-white p-2"
                />
              ) : (
                <div className="flex h-40 w-40 items-center justify-center rounded-xl border border-white/10 text-sm text-slate-500">
                  No QR code
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Manual setup key</p>
                  <code className="mt-1 block break-all rounded-lg bg-slate-950 px-3 py-2 text-sm text-brand-400">
                    {otpSetup.base32}
                  </code>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Recovery codes</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Save these codes somewhere safe — they can’t be viewed again.
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {otpSetup.recovery_codes.map((code) => (
                      <code key={code} className="rounded-lg bg-slate-950 px-2 py-1 text-center text-xs text-slate-300">
                        {code}
                      </code>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
              <label className="block sm:max-w-xs sm:flex-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Authentication code</span>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6-digit code from your app"
                  className="input input-bordered mt-1 w-full"
                />
              </label>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={otpBusy}
                  className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {otpBusy ? 'Activating…' : 'Activate 2FA'}
                </button>
                {otpSetup.auth_url && (
                  <a
                    href={otpSetup.auth_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-info"
                  >
                    Open in authenticator
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {otpMessage && (
          <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {otpMessage}
          </p>
        )}
        {otpError && (
          <p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            {otpError}
          </p>
        )}
      </section>

      {/* Danger zone */}
      <section className="rounded-3xl border border-red-500/20 bg-slate-900/50 p-8">
        <h2 className="text-lg font-semibold text-white">Danger zone</h2>
        <p className="mt-1 text-sm text-slate-400">
          Permanently delete your account, driver verification and bookings. This cannot be undone.
        </p>

        {confirmDelete ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-red-400/30 bg-red-400/10 p-5">
            <p className="text-sm text-red-200">Are you sure? This will permanently delete your account.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="btn btn-outline btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="btn btn-error btn-sm disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="btn btn-outline btn-error mt-4">
            Delete account
          </button>
        )}

        {deleteError && (
          <p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            {deleteError}
          </p>
        )}
      </section>
    </div>
  );
}

export default function AccountPanel() {
  return (
    <AppProvider>
      <AccountPanelInner />
    </AppProvider>
  );
}
