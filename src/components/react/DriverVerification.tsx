import { useCallback, useEffect, useRef, useState, type ChangeEvent, type SyntheticEvent } from 'react';
import {
	AppProvider,
	ApiError,
	useApp,
	type DriverVerification,
	type VerificationCreateResponse,
	type VerificationFetchResponse,
} from '../../context/AppContext';
import { useMinDelay } from '../../lib/useMinDelay';
import Skeleton from './Skeleton';

const inputClass = 'input input-bordered mt-2 w-full';

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

function ImageUploadField({
	label,
	value,
	required,
	uploading,
	onUpload,
}: {
	label: string;
	value: string;
	required?: boolean;
	uploading: boolean;
	onUpload: (file: File) => void;
}) {
	const inputRef = useRef<HTMLInputElement>(null);

	function handleChange(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (file) onUpload(file);
		event.target.value = '';
	}

	return (
		<div>
			<span className="text-sm font-medium text-slate-300">
				{label}
				{required && <span className="text-red-400"> *</span>}
			</span>
			<div className="mt-2 flex items-center gap-3">
				{value ? (
					<img src={value} alt={label} className="h-16 w-16 rounded-xl border border-white/10 object-cover" />
				) : (
					<span className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/10 text-slate-600">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
							<rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
							<circle cx="9" cy="9" r="2" />
							<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
						</svg>
					</span>
				)}
				<button
					type="button"
					onClick={() => inputRef.current?.click()}
					disabled={uploading}
					className="btn btn-outline btn-secondary btn-sm"
				>
					{uploading ? 'Uploading…' : value ? 'Replace' : 'Upload'}
				</button>
				<input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
			</div>
		</div>
	);
}

function DriverVerificationInner() {
	const { auth, request, upload, mediaUrlFromUpload } = useApp();
	const ready = useMinDelay(1000);

	const [existing, setExisting] = useState<DriverVerification | null>(null);
	const [loaded, setLoaded] = useState(false);
	const [fetchError, setFetchError] = useState<string | null>(null);

	const [licenseNumber, setLicenseNumber] = useState('');
	const [licenseCountry, setLicenseCountry] = useState('');
	const [issueDate, setIssueDate] = useState('');
	const [expiryDate, setExpiryDate] = useState('');
	const [frontImage, setFrontImage] = useState('');
	const [backImage, setBackImage] = useState('');
	const [selfieImage, setSelfieImage] = useState('');

	const [uploading, setUploading] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [serverError, setServerError] = useState<string | null>(null);
	const [serverMessage, setServerMessage] = useState<string | null>(null);
	const [errors, setErrors] = useState<Record<string, string>>({});

	const fetchVerification = useCallback(async () => {
		if (!auth) return;
		setFetchError(null);
		try {
			const res = await request<VerificationFetchResponse>(
				`user/verification/fetch?id=${encodeURIComponent(auth.id)}&target_id=${encodeURIComponent(auth.id)}`,
			);
			setExisting(res.driver_verification ?? null);
		} catch (err) {
			if (err instanceof ApiError && err.status === 404) {
				setExisting(null);
			} else {
				setFetchError(err instanceof ApiError ? err.message : 'Failed to load driver verification.');
			}
		} finally {
			setLoaded(true);
		}
	}, [auth, request]);

	useEffect(() => {
		fetchVerification();
	}, [fetchVerification]);

	async function handleUpload(field: 'front' | 'back' | 'selfie', file: File) {
		setUploading(field);
		setServerError(null);
		try {
			const res = await upload(file, 'PRIVATE');
			const url = mediaUrlFromUpload(res);
			if (field === 'front') setFrontImage(url);
			else if (field === 'back') setBackImage(url);
			else setSelfieImage(url);
		} catch (err) {
			setServerError(err instanceof ApiError ? err.message : 'Upload failed. Please try again.');
		} finally {
			setUploading(null);
		}
	}

	function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
		event.preventDefault();
		const next: Record<string, string> = {};
		if (!licenseNumber.trim()) next.license_number = 'License number is required.';
		if (!licenseCountry.trim()) next.license_country = 'License country is required.';
		if (!issueDate) next.license_issue_date = 'Issue date is required.';
		if (!frontImage) next.front = 'Upload the front of your license.';
		if (!selfieImage) next.selfie = 'Upload a selfie.';
		setErrors(next);
		if (Object.keys(next).length > 0) return;

		setServerError(null);
		setServerMessage(null);
		setSubmitting(true);
		void (async () => {
			try {
				const res = await request<VerificationCreateResponse>('user/verification', {
					method: 'POST',
					body: JSON.stringify({
						id: auth?.id,
						license_number: licenseNumber.trim(),
						license_country: licenseCountry.trim(),
						license_issue_date: issueDate,
						license_expiry_date: expiryDate,
						license_front_image: frontImage,
						license_back_image: backImage,
						selfie_image: selfieImage,
					}),
				});
				setServerMessage(res.message ?? 'Driver verification submitted for review.');
				await fetchVerification();
			} catch (err) {
				setServerError(err instanceof ApiError ? err.message : 'Submission failed. Please try again.');
			} finally {
				setSubmitting(false);
			}
		})();
	}

	if (!auth) {
		return (
			<div className="rounded-3xl border border-white/10 bg-slate-900/50 p-8 text-center">
				<h1 className="text-2xl font-bold tracking-tight text-white">Driver verification</h1>
				<p className="mt-2 text-sm text-slate-400">Sign in to submit your driver license for verification.</p>
				<a href="/login" className="btn btn-primary mt-6">Sign in</a>
			</div>
		);
	}

	if (!ready) {
		return (
			<div className="rounded-3xl border border-white/10 bg-slate-900/50 p-8">
				<Skeleton className="h-7 w-48" />
				<Skeleton className="mt-4 h-5 w-full" />
				<Skeleton className="mt-6 h-11 w-full" />
				<Skeleton className="mt-4 h-11 w-full" />
				<Skeleton className="mt-4 h-16 w-full" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<section className="rounded-3xl border border-white/10 bg-slate-900/50 p-8">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<h1 className="text-2xl font-bold tracking-tight text-white">Driver verification</h1>
						<p className="mt-1 text-sm text-slate-400">
							Submit your driver license to get verified and start renting.
						</p>
					</div>
					{loaded && existing && (
						<div className="flex items-center gap-3">
							<span className="text-sm text-slate-400">Status:</span>
							<StatusBadge status={existing.verification} />
						</div>
					)}
				</div>

				{loaded && !existing && !fetchError && (
					<p className="mt-4 rounded-xl border border-slate-600/30 bg-slate-800/40 px-4 py-3 text-sm text-slate-400">
						You haven't submitted a driver verification yet.
					</p>
				)}
				{fetchError && (
					<p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
						{fetchError}
					</p>
				)}

				<form onSubmit={handleSubmit} className="mt-6 space-y-6" noValidate>
					<div className="grid gap-6 sm:grid-cols-2">
						<label className="block">
							<span className="text-sm font-medium text-slate-300">License number</span>
							<input
								type="text"
								value={licenseNumber}
								onChange={(e) => setLicenseNumber(e.target.value)}
								placeholder="e.g. 12345678"
								className={errors.license_number ? `${inputClass} border-error` : inputClass}
							/>
							{errors.license_number && (
								<span className="mt-1 block text-xs text-red-400">{errors.license_number}</span>
							)}
						</label>
						<label className="block">
							<span className="text-sm font-medium text-slate-300">License country</span>
							<input
								type="text"
								value={licenseCountry}
								onChange={(e) => setLicenseCountry(e.target.value)}
								placeholder="e.g. Mauritius"
								className={errors.license_country ? `${inputClass} border-error` : inputClass}
							/>
							{errors.license_country && (
								<span className="mt-1 block text-xs text-red-400">{errors.license_country}</span>
							)}
						</label>
						<label className="block">
							<span className="text-sm font-medium text-slate-300">Issue date</span>
							<input
								type="date"
								value={issueDate}
								onChange={(e) => setIssueDate(e.target.value)}
								className={errors.license_issue_date ? `${inputClass} border-error` : inputClass}
							/>
							{errors.license_issue_date && (
								<span className="mt-1 block text-xs text-red-400">{errors.license_issue_date}</span>
							)}
						</label>
						<label className="block">
							<span className="text-sm font-medium text-slate-300">
								Expiry date <span className="font-normal text-slate-500">(optional)</span>
							</span>
							<input
								type="date"
								value={expiryDate}
								onChange={(e) => setExpiryDate(e.target.value)}
								className={inputClass}
							/>
						</label>
					</div>

					<div className="grid gap-6 sm:grid-cols-3">
						<ImageUploadField
							label="License front"
							required
							value={frontImage}
							uploading={uploading === 'front'}
							onUpload={(file) => handleUpload('front', file)}
						/>
						<ImageUploadField
							label="License back"
							value={backImage}
							uploading={uploading === 'back'}
							onUpload={(file) => handleUpload('back', file)}
						/>
						<ImageUploadField
							label="Selfie"
							required
							value={selfieImage}
							uploading={uploading === 'selfie'}
							onUpload={(file) => handleUpload('selfie', file)}
						/>
					</div>

					{(errors.front || errors.selfie) && (
						<p className="text-xs text-red-400">{errors.front ?? errors.selfie}</p>
					)}

					<p className="text-xs text-slate-500">
						Uploaded documents are stored privately and only viewable by administrators.
					</p>

					{serverError && (
						<p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
							{serverError}
						</p>
					)}
					{serverMessage && (
						<p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
							{serverMessage}
						</p>
					)}

					<button type="submit" disabled={submitting} className="btn btn-primary w-full disabled:opacity-60">
						{submitting ? 'Submitting…' : 'Submit driver verification'}
					</button>
				</form>
			</section>
		</div>
	);
}

export default function DriverVerification() {
	return (
		<AppProvider>
			<DriverVerificationInner />
		</AppProvider>
	);
}