import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import {
	AppProvider,
	ApiError,
	useApp,
	type DriverVerification,
	type KycVerificationResponse,
	type User,
	type UserFetchResponse,
	type UserRoleUpdateResponse,
	type UserResponse,
	type VerificationFetchResponse,
} from '../../context/AppContext';
import { useMinDelay } from '../../lib/useMinDelay';
import Skeleton from './Skeleton';

const PAGE_SIZE = 10;

function RoleBadge({ role }: { role: User['role'] }) {
	const styles: Record<User['role'], string> = {
		ADMIN: 'border-brand-500/30 bg-brand-500/15 text-brand-300',
		MERCHANT: 'border-brand-500/30 bg-brand-500/15 text-brand-400',
		CLIENT: 'border-sky-500/30 bg-sky-500/15 text-sky-300',
	};
	return (
		<span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[role]}`}>{role}</span>
	);
}

function StatusBadge({ status }: { status: DriverVerification['verification'] }) {
	const styles: Record<DriverVerification['verification'], string> = {
		PENDING: 'border-yellow-500/30 bg-yellow-500/15 text-yellow-300',
		APPROVED: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
		REJECTED: 'border-red-500/30 bg-red-500/15 text-red-300',
	};
	return (
		<span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}>{status}</span>
	);
}

function Initials({ name }: { name: string }) {
	const initials = name
		.split(/\s+/)
		.map((part) => part[0])
		.slice(0, 2)
		.join('')
		.toUpperCase();
	return (
		<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-xs font-bold text-brand-300">
			{initials}
		</span>
	);
}

function AdminUsersInner() {
	const { auth, request } = useApp();

	const ready = useMinDelay(450);
	const [checking, setChecking] = useState(true);
	const [isAdmin, setIsAdmin] = useState(false);
	const [accessError, setAccessError] = useState<string | null>(null);

	const [users, setUsers] = useState<User[]>([]);
	const [amount, setAmount] = useState(0);
	const [limit, setLimit] = useState(PAGE_SIZE);
	const [offset, setOffset] = useState(0);
	const [targetId, setTargetId] = useState('');
	const [targetIdInput, setTargetIdInput] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [updatingRole, setUpdatingRole] = useState<string | null>(null);
	const [roleMessage, setRoleMessage] = useState<string | null>(null);
	const [roleError, setRoleError] = useState<string | null>(null);

	const [kycTarget, setKycTarget] = useState<User | null>(null);
	const [kycVerification, setKycVerification] = useState<DriverVerification | null>(null);
	const [kycLoading, setKycLoading] = useState(false);
	const [kycMinElapsed, setKycMinElapsed] = useState(true);
	const [kycBusy, setKycBusy] = useState(false);
	const [kycError, setKycError] = useState<string | null>(null);
	const [kycMessage, setKycMessage] = useState<string | null>(null);
	const [lightbox, setLightbox] = useState<{ url: string; label: string } | null>(null);

	const fetchUsers = useCallback(async () => {
		if (!auth) return;
		setLoading(true);
		setError(null);
		try {
			const params = new URLSearchParams({
				id: auth.id,
				limit: String(limit),
				offset: String(offset),
			});
			if (targetId.trim()) params.set('target_id', targetId.trim());
			const res = await request<UserFetchResponse>(`user/fetch?${params}`);
			setUsers(res.users ?? []);
			setAmount(res.amount ?? 0);
		} catch (err) {
			setError(err instanceof ApiError ? err.message : 'Failed to load users.');
		} finally {
			setLoading(false);
		}
	}, [auth, request, limit, offset, targetId]);

	// Verify the current user is an ADMIN, then load the list.
	useEffect(() => {
		(async () => {
			if (!auth) return;
			setAccessError(null);
			try {
				const me = await request<UserResponse>(`user/me?id=${encodeURIComponent(auth.id)}`);
				setIsAdmin(me.user?.role === 'ADMIN');
			} catch (err) {
				setAccessError(err instanceof ApiError ? err.message : 'Failed to verify access.');
			} finally {
				setChecking(false);
			}
		})();
	}, [auth, request]);

	// Load users whenever pagination/search changes (and once we know we're admin).
	useEffect(() => {
		if (isAdmin) fetchUsers();
	}, [isAdmin, fetchUsers]);

	function goPrevious() {
		setOffset(Math.max(0, offset - 1));
	}

	function goNext() {
		if ((offset + 1) * limit < amount) setOffset(offset + 1);
	}

	function handleSearch(event: SyntheticEvent<HTMLFormElement>) {
		event.preventDefault();
		setTargetId(targetIdInput.trim());
		setOffset(0);
	}

	function clearSearch() {
		setTargetId('');
		setTargetIdInput('');
		setOffset(0);
	}

	async function updateRole(targetUserId: string, role: string) {
		if (!auth) return;
		setUpdatingRole(targetUserId);
		setRoleMessage(null);
		setRoleError(null);
		try {
			const res = await request<UserRoleUpdateResponse>('user/update/role', {
				method: 'PATCH',
				body: JSON.stringify({ id: auth.id, target_id: targetUserId, role }),
			});
			setRoleMessage(res.message ?? `Role updated to ${role}.`);
			await fetchUsers();
		} catch (err) {
			setRoleError(err instanceof ApiError ? err.message : 'Failed to update role.');
		} finally {
			setUpdatingRole(null);
		}
	}

	async function openKyc(user: User) {
		if (!auth) return;
		setKycTarget(user);
		setKycVerification(null);
		setKycError(null);
		setKycMessage(null);
		setKycLoading(true);
		setKycMinElapsed(false);
		window.setTimeout(() => setKycMinElapsed(true), 450);
		try {
			const res = await request<VerificationFetchResponse>(
				`user/verification/fetch?id=${encodeURIComponent(auth.id)}&target_id=${encodeURIComponent(user.id)}`,
			);
			setKycVerification(res.driver_verification ?? null);
		} catch (err) {
			if (err instanceof ApiError && err.status === 404) {
				setKycVerification(null);
			} else {
				setKycError(err instanceof ApiError ? err.message : 'Failed to load driver verification.');
			}
		} finally {
			setKycLoading(false);
		}
	}

	function closeKyc() {
		setKycTarget(null);
		setKycVerification(null);
		setKycError(null);
		setKycMessage(null);
	}

	async function reviewKyc(status: 'APPROVED' | 'REJECTED') {
		if (!auth || !kycTarget || !kycVerification) return;
		setKycBusy(true);
		setKycError(null);
		setKycMessage(null);
		try {
			const res = await request<KycVerificationResponse>('user/kyc/verification', {
				method: 'POST',
				body: JSON.stringify({
					id: auth.id,
					driver_verification_id: kycVerification.id,
					verification: status,
				}),
			});
			setKycMessage(res.message ?? `Driver verification ${status.toLowerCase()}.`);
			await openKyc(kycTarget);
		} catch (err) {
			setKycError(err instanceof ApiError ? err.message : 'Failed to update verification.');
		} finally {
			setKycBusy(false);
		}
	}

	if (ready && !checking && !auth) {
		return (
			<div className="rounded-3xl border border-white/10 bg-slate-900/50 p-8 text-center">
				<h1 className="text-2xl font-bold tracking-tight text-white">Admin</h1>
				<p className="mt-2 text-sm text-slate-400">Sign in to manage platform users.</p>
				<a
					href="/login"
					className="btn btn-primary mt-6"
				>
					Sign in
				</a>
			</div>
		);
	}

	if (!ready || checking) {
		return (
			<div className="space-y-6">
				<section className="rounded-3xl border border-white/10 bg-slate-900/50 p-8">
					<Skeleton className="h-7 w-48" />
					<div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
						<Skeleton className="h-12 w-full flex-1 rounded-xl" />
						<Skeleton className="h-12 w-28 rounded-xl" />
						<Skeleton className="h-12 w-32 rounded-xl" />
					</div>
					<div className="mt-6 space-y-3">
						{Array.from({ length: 5 }).map((_, i) => (
							<Skeleton key={i} className="h-15 w-full" />
						))}
					</div>
				</section>
			</div>
		);
	}

	if (accessError) {
		return (
			<div className="rounded-3xl border border-red-400/30 bg-red-400/10 p-6 text-center">
				<p className="text-sm text-red-300">{accessError}</p>
				<a
					href="/login"
					className="btn btn-error btn-sm mt-4"
				>
					Sign in again
				</a>
			</div>
		);
	}

	if (!isAdmin) {
		return (
			<div className="rounded-3xl border border-white/10 bg-slate-900/50 p-8 text-center">
				<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/15 text-brand-300">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
						<rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
						<path d="M7 11V7a5 5 0 0 1 10 0v4" />
					</svg>
				</div>
				<h1 className="mt-5 text-2xl font-bold tracking-tight text-white">Access denied</h1>
				<p className="mt-2 text-sm text-slate-400">Only administrators can manage users on the platform.</p>
				<a
					href="/"
					className="btn btn-outline btn-secondary mt-6"
				>
					Back to home
				</a>
			</div>
		);
	}

	const start = amount > 0 ? offset * limit + 1 : 0;
	const end = Math.min((offset + 1) * limit, amount);

	const showKycSkeleton = kycLoading || !kycMinElapsed;

	const kycPanelBody = kycTarget ? (
		<div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<h3 className="text-base font-semibold text-white">Driver verification — {kycTarget.name}</h3>
					<p className="mt-0.5 text-xs text-slate-500">@{kycTarget.username}</p>
				</div>
				<button type="button" onClick={closeKyc} className="btn btn-ghost btn-sm">
					Close
				</button>
			</div>

			{showKycSkeleton && (
				<div className="mt-4 space-y-3">
					<Skeleton className="h-4 w-48" />
					<Skeleton className="h-4 w-64" />
					<Skeleton className="h-4 w-56" />
				</div>
			)}

			{!showKycSkeleton && kycError && (
				<p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
					{kycError}
				</p>
			)}

			{!showKycSkeleton && !kycVerification && !kycError && (
				<p className="mt-4 text-sm text-slate-400">No driver verification submitted for this user.</p>
			)}

			{!showKycSkeleton && kycVerification && (
				<div className="mt-4">
					<div className="flex flex-wrap items-center gap-3">
						<StatusBadge status={kycVerification.verification} />
						{kycVerification.verified_at && (
							<span className="text-xs text-slate-500">
								Verified {new Date(kycVerification.verified_at).toLocaleString()}
							</span>
						)}
					</div>

					<dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
						<div>
							<dt className="text-slate-500">License number</dt>
							<dd className="text-white">{kycVerification.license_number}</dd>
						</div>
						<div>
							<dt className="text-slate-500">Country</dt>
							<dd className="text-white">{kycVerification.license_country}</dd>
						</div>
						<div>
							<dt className="text-slate-500">Issue date</dt>
							<dd className="text-white">{kycVerification.license_issue_date || '—'}</dd>
						</div>
						<div>
							<dt className="text-slate-500">Expiry date</dt>
							<dd className="text-white">{kycVerification.license_expiry_date || '—'}</dd>
						</div>
					</dl>

					<div className="mt-4 grid gap-4 sm:grid-cols-3">
						{[
							{ label: 'License front', url: kycVerification.license_front_image },
							{ label: 'License back', url: kycVerification.license_back_image },
							{ label: 'Selfie', url: kycVerification.selfie_image },
						].map((img) => (
							<div key={img.label}>
								<p className="text-xs font-medium uppercase tracking-wide text-slate-500">{img.label}</p>
								{img.url ? (
									<button
										type="button"
										onClick={() => setLightbox({ url: img.url, label: img.label })}
										className="mt-1 block w-full cursor-zoom-in"
										title={`View ${img.label} full size`}
									>
										<img
											src={img.url}
											alt={img.label}
											className="h-32 w-full rounded-xl border border-white/10 object-cover transition hover:opacity-80"
										/>
									</button>
								) : (
									<div className="mt-1 flex h-32 w-full items-center justify-center rounded-xl border border-white/10 text-xs text-slate-600">
										No image
									</div>
								)}
							</div>
						))}
					</div>

					{kycMessage && (
						<p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
							{kycMessage}
						</p>
					)}

					<div className="mt-5 flex flex-wrap gap-3">
						<button
							type="button"
							onClick={() => reviewKyc('APPROVED')}
							disabled={kycBusy}
							className="btn btn-primary"
						>
							{kycBusy ? 'Updating…' : 'Approve'}
						</button>
						<button
							type="button"
							onClick={() => reviewKyc('REJECTED')}
							disabled={kycBusy}
							className="btn btn-error"
						>
							Reject
						</button>
					</div>
				</div>
			)}
		</div>
	) : null;

	return (
		<>
			<div className="space-y-6">
			<section className="rounded-3xl border border-white/10 bg-slate-900/50 p-8">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<h1 className="text-2xl font-bold tracking-tight text-white">Manage users</h1>
						<p className="mt-1 text-sm text-slate-400">
							{targetId
								? `Searching for user ${targetId}`
								: 'All platform users, paginated.'}
						</p>
					</div>
					<button
						type="button"
						onClick={() => fetchUsers()}
						disabled={loading}
						className="btn btn-outline btn-info btn-sm disabled:cursor-not-allowed disabled:opacity-60"
					>
						Refresh
					</button>
				</div>

				<div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
					<form onSubmit={handleSearch} className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
						<label className="block flex-1">
							<span className="text-xs font-medium uppercase tracking-wide text-slate-500">User ID</span>
							<input
								type="text"
								value={targetIdInput}
								onChange={(e) => setTargetIdInput(e.target.value)}
								placeholder="Search by target_id"
								className="input input-bordered mt-1 w-full"
							/>
						</label>
						<button
							type="submit"
							className="btn btn-primary"
						>
							Fetch user
						</button>
					</form>

					<label className="block sm:w-32">
						<span className="text-xs font-medium uppercase tracking-wide text-slate-500">Per page</span>
						<select
							value={limit}
							onChange={(e) => {
								setLimit(Number(e.target.value));
								setOffset(0);
							}}
							className="select select-bordered mt-1 w-full"
						>
							<option value={5}>5</option>
							<option value={10}>10</option>
							<option value={25}>25</option>
						</select>
					</label>

					{targetId && (
						<button
							type="button"
							onClick={clearSearch}
							className="btn btn-outline btn-error btn-sm"
						>
							Clear search
						</button>
					)}
				</div>

				{error && (
					<p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
						{error}
					</p>
				)}

				<div className="mt-6 overflow-x-auto">
					<table className="w-full min-w-[44rem] text-left text-sm">
						<thead>
							<tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
								<th className="pb-3 pr-4 font-medium">User</th>
								<th className="pb-3 pr-4 font-medium">Username</th>
								<th className="pb-3 pr-4 font-medium">Email</th>
								<th className="pb-3 pr-4 font-medium">Role</th>
								<th className="pb-3 pr-4 font-medium">Status</th>
								<th className="pb-3 font-medium">Created</th>
								<th className="pb-3 font-medium"></th>
							</tr>
						</thead>
						<tbody>
							{loading &&
								Array.from({ length: 5 }).map((_, i) => (
									<tr key={i} className="border-b border-white/5">
										<td className="py-3 pr-4">
											<div className="flex items-center gap-3">
												<Skeleton className="h-9 w-9 rounded-lg" />
												<Skeleton className="h-4 w-40" />
											</div>
										</td>
										<td className="py-3 pr-4">
											<Skeleton className="h-4 w-24" />
										</td>
										<td className="py-3 pr-4">
											<Skeleton className="h-4 w-44" />
										</td>
										<td className="py-3 pr-4">
											<Skeleton className="h-5 w-16 rounded-full" />
										</td>
										<td className="py-3 pr-4">
											<Skeleton className="h-4 w-16" />
										</td>
										<td className="py-3">
											<Skeleton className="h-4 w-20" />
										</td>
									</tr>
								))}
							{!loading &&
								users.map((user) => (
									<>
								<tr key={user.id} className="border-b border-white/5">
									<td className="py-3 pr-4">
										<div className="flex items-center gap-3">
											{user.profile_picture ? (
												<img
													src={user.profile_picture}
													alt={`${user.name} avatar`}
													className="h-9 w-9 shrink-0 rounded-lg object-cover"
												/>
											) : (
												<Initials name={user.name} />
											)}
											<span className="font-medium text-white">{user.name}</span>
										</div>
									</td>
									<td className="py-3 pr-4 text-slate-400">@{user.username}</td>
									<td className="py-3 pr-4 text-slate-400">{user.email_address}</td>
									<td className="py-3 pr-4">
										{user.role === 'ADMIN' ? (
											<RoleBadge role={user.role} />
										) : (
											<select
												value={user.role}
												disabled={updatingRole === user.id}
												onChange={(e) => updateRole(user.id, e.target.value)}
												aria-label={`Change role for ${user.name}`}
												className="select select-bordered select-sm"
											>
												<option value="CLIENT">CLIENT</option>
												<option value="MERCHANT">MERCHANT</option>
												<option value="ADMIN">ADMIN</option>
											</select>
										)}
									</td>
									<td className="py-3 pr-4">
										{user.email_verified ? (
											<span className="text-xs font-medium text-emerald-400">Verified</span>
										) : (
											<span className="text-xs font-medium text-yellow-400">Unverified</span>
										)}
									</td>
									<td className="py-3 text-slate-500">
										{user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
									</td>
									<td className="py-3 pl-4 text-right">
										<button
											type="button"
											onClick={() => openKyc(user)}
											className="btn btn-outline btn-info btn-xs"
										>
											KYC
										</button>
									</td>
								</tr>
								{kycTarget?.id === user.id && (
									<tr className="border-b border-white/5 bg-slate-950/40">
										<td colSpan={7} className="px-4 py-4">
											{kycPanelBody}
										</td>
									</tr>
								)}
									</>
								))}
							{!loading && users.length === 0 && (
								<tr>
									<td colSpan={7} className="py-10 text-center text-slate-500">
										No users found.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>


				<div className="mt-6 flex flex-wrap items-center justify-between gap-4">
					<p className="text-sm text-slate-400">
						Showing <span className="font-medium text-white">{start}</span>–<span className="font-medium text-white">{end}</span> of{' '}
						<span className="font-medium text-white">{amount}</span> users
					</p>
					<div className="flex gap-3">
						<button
							type="button"
							onClick={goPrevious}
							disabled={offset === 0 || loading}
							className="btn btn-outline btn-info btn-sm disabled:cursor-not-allowed disabled:opacity-50"
						>
							Previous
						</button>
						<button
							type="button"
							onClick={goNext}
							disabled={(offset + 1) * limit >= amount || loading}
							className="btn btn-outline btn-info btn-sm disabled:cursor-not-allowed disabled:opacity-50"
						>
							Next
						</button>
					</div>
				</div>

				{roleMessage && (
					<p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
						{roleMessage}
					</p>
				)}
				{roleError && (
					<p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
						{roleError}
					</p>
				)}
			</section>
		</div>

		{lightbox && (
			<div
				className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
				onClick={() => setLightbox(null)}
			>
				<div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
					<img
						src={lightbox.url}
						alt={lightbox.label}
						className="max-h-[80vh] w-full rounded-2xl border border-white/10 object-contain"
					/>
					<div className="mt-3 flex items-center justify-between">
						<span className="text-sm text-slate-300">{lightbox.label}</span>
						<button type="button" onClick={() => setLightbox(null)} className="btn btn-ghost btn-sm">
							Close
						</button>
					</div>
				</div>
			</div>
		)}
		</>
	);
}

export default function AdminUsers() {
	return (
		<AppProvider>
			<AdminUsersInner />
		</AppProvider>
	);
}