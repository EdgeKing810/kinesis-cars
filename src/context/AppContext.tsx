import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react';

const DEFAULT_API_URL = 'https://api.kinesis.world/x/cars/';
const AUTH_STORAGE_KEY = 'kinesis.auth';

/** Error thrown by `request` whenever the API response is not successful. */
export class ApiError extends Error {
	constructor(
		public readonly status: number,
		message: string,
	) {
		super(message);
		this.name = 'ApiError';
	}
}

/** The API wraps every response as `{ status, message, ...data }`. */
export interface ApiEnvelope {
	status?: number;
	message?: string;
	[key: string]: unknown;
}

export interface AuthSession {
	id: string;
	jwt: string;
}

/** Response of POST /auth/login and POST /auth/jwt. */
export interface AuthResponse extends ApiEnvelope {
	status: number;
	message: string;
	id: string;
	jwt?: string;
}

/** Response of POST /auth/register. */
export interface RegisterResponse extends ApiEnvelope {
	status: number;
	message: string;
	id: string;
}

/** A platform user as returned by GET /user/me. */
export interface User {
	id: string;
	name: string;
	username: string;
	email_address: string;
	email_verified: boolean;
	role: 'ADMIN' | 'MERCHANT' | 'CLIENT';
	profile_picture: string;
	otp_enabled: boolean;
	otp_verified: boolean;
	created_at?: string;
	updated_at?: string;
}

/** Response of GET /user/me?id={}. */
export interface UserResponse extends ApiEnvelope {
	status: number;
	message: string;
	id: string;
	user?: User;
}

/** Response of GET /user/fetch?id&target_id&limit&offset (admin only). */
export interface UserFetchResponse extends ApiEnvelope {
	status: number;
	message: string;
	users: User[];
	amount: number;
}

/** OTP setup payload returned by PATCH /auth/otp/generate. */
export interface OtpSetup {
	base32: string;
	auth_url: string;
	/** Base64-encoded PNG QR code. */
	qr_code: string;
	recovery_codes: string[];
}

/** Response of PATCH /auth/otp/generate. */
export interface OtpGenerateResponse extends ApiEnvelope {
	status: number;
	message: string;
	id: string;
	otp?: OtpSetup;
}

/** Response of PATCH /auth/otp/verify and PATCH /auth/otp/disable. */
export interface OtpMutationResponse extends ApiEnvelope {
	status: number;
	message: string;
	id: string;
}

/** Response of POST /upload (media service, not under the /x/cars/ base). */
export interface UploadResponse extends ApiEnvelope {
	status: number;
	message: string;
	/** Relative media path, e.g. `uploads/abc.png`. Build a full URL with `mediaUrl()`. */
	path: string;
	id: string;
	file_type: string;
	file_size: number;
	security: string;
	access_token?: string;
}

/** Response of PATCH /user/update. */
export interface UserUpdateResponse extends ApiEnvelope {
	status: number;
	message: string;
	id: string;
}

/** Response of PATCH /user/forget/password and PATCH /user/reset/password. */
export interface PasswordResetResponse extends ApiEnvelope {
	status: number;
	message: string;
	id: string;
}

/** Response of PATCH /user/update/role (admin only). */
export interface UserRoleUpdateResponse extends ApiEnvelope {
	status: number;
	message: string;
	id: string;
}

/** A driver verification record (1 per user). */
export interface DriverVerification {
	id: string;
	user_id: string;
	license_number: string;
	license_country: string;
	license_issue_date: string;
	license_expiry_date: string;
	license_front_image: string;
	license_back_image: string;
	selfie_image: string;
	verification: 'PENDING' | 'APPROVED' | 'REJECTED';
	verified_at: string;
}

/** Response of POST /user/verification. */
export interface VerificationCreateResponse extends ApiEnvelope {
	status: number;
	message: string;
	id: string;
}

/** Response of GET /user/verification/fetch?id&target_id. */
export interface VerificationFetchResponse extends ApiEnvelope {
	status: number;
	message: string;
	driver_verification?: DriverVerification;
}

/** Response of POST /user/kyc/verification (admin only). */
export interface KycVerificationResponse extends ApiEnvelope {
	status: number;
	message: string;
	id: string;
}

/** Response of DELETE /user/delete?id={user_id}. */
export interface UserDeleteResponse extends ApiEnvelope {
	status: number;
	message: string;
	id: string;
}

/** A fleet groups several vehicles (owned by a merchant/admin). */
export interface Fleet {
	id: string;
	owner_id: string;
	name: string;
	agency: string;
	created_at?: string;
	updated_at?: string;
}

/** Response of POST /fleet/create, PUT /fleet/update and DELETE /fleet/delete. */
export interface FleetMutationResponse extends ApiEnvelope {
	status: number;
	message: string;
	id: string;
}

/** Response of GET /fleet/fetch (public). */
export interface FleetFetchResponse extends ApiEnvelope {
	status: number;
	message: string;
	fleets: Fleet[];
	amount: number;
}

/** A vehicle listing. */
export interface Vehicle {
	id: string;
	owner_id: string;
	fleet_id: string;
	nickname: string;
	car_make: string;
	model: string;
	body_type: string;
	color: string;
	doors: number;
	seats: number;
	transmission: string;
	fuel_type: string;
	mileage_km: number;
	registration: string;
	price_per_day_cents: number;
	min_rent_days: number;
	max_rent_days: number;
	location: string;
	license_plate: string;
	options: string[];
	additional: string[];
	pictures: string[];
	is_active: boolean;
	created_at?: string;
	updated_at?: string;
}

/** Response of POST /vehicle/create and PUT /vehicle/update. */
export interface VehicleMutationResponse extends ApiEnvelope {
	status: number;
	message: string;
	id: string;
}

/** Response of GET /vehicle/fetch (public). */
export interface VehicleFetchResponse extends ApiEnvelope {
	status: number;
	message: string;
	vehicles: Vehicle[];
	amount: number;
}

/** A blockout period for a vehicle. */
export interface Blockout {
	id: string;
	vehicle_id: string;
	start_date: string;
	end_date: string;
	reason: 'BOOKING' | 'MAINTENANCE' | 'FLEET_HOLD' | 'UNAVAILABLE';
	booking_id: string;
	note: string;
	created_at?: string;
}

/** Response of POST /blockout/create and DELETE /blockout/delete. */
export interface BlockoutMutationResponse extends ApiEnvelope {
	status: number;
	message: string;
	id: string;
}

/** Response of GET /blockout/fetch. */
export interface BlockoutFetchResponse extends ApiEnvelope {
	status: number;
	message: string;
	blockouts: Blockout[];
	amount: number;
}

/** Financial breakdown of a booking (MUR, cents). */
export interface FinancialSnapshot {
	daily_rate_cents: number;
	total_days: number;
	subtotal_cents: number;
	insurance_fee_cents: number;
	deposit_cents: number;
	tax_cents: number;
	total_amount_cents: number;
	currency: string;
}

/** A vehicle booking. */
export interface Booking {
	id: string;
	client_id: string;
	vehicle_id: string;
	merchant_id: string;
	start_date: string;
	end_date: string;
	pickup_location: string;
	dropoff_location: string;
	status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'CHECKED_OUT' | 'CHECKED_IN' | 'CANCELLED' | 'REFUNDED' | 'COMPLETED';
	financial_snapshot: FinancialSnapshot;
	created_at?: string;
	updated_at?: string;
}

/** Response of POST /booking/create. */
export interface BookingCreateResponse extends ApiEnvelope {
	status: number;
	message: string;
	id: string;
	financial_snapshot?: FinancialSnapshot;
}

/** Response of PATCH /booking/status and PATCH /booking/cancel. */
export interface BookingMutationResponse extends ApiEnvelope {
	status: number;
	message: string;
	id: string;
	new_status?: string;
}

/** Response of GET /booking/fetch. */
export interface BookingFetchResponse extends ApiEnvelope {
	status: number;
	message: string;
	bookings: Booking[];
	amount: number;
}

/** Response of POST /payment/intent. */
export interface PaymentIntentResponse extends ApiEnvelope {
	status: number;
	message: string;
	id: string;
	session_id?: string;
	client_secret?: string;
}

/** Response of PATCH /payment/refund. */
export interface PaymentRefundResponse extends ApiEnvelope {
	status: number;
	message: string;
	id: string;
	refund_id?: string;
	refund_status?: string;
}

/** A payment transaction. */
export interface PaymentTransaction {
	id: string;
	booking_id: string;
	user_id: string;
	provider: string;
	transaction_id: string;
	client_secret: string;
	amount_cents: number;
	currency: string;
	status: 'PENDING' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
	failure_reason: string;
	created_at?: string;
	updated_at?: string;
}

/** Response of GET /payment/fetch. NOTE: the array key is `bookings`. */
export interface PaymentFetchResponse extends ApiEnvelope {
	status: number;
	message: string;
	bookings: PaymentTransaction[];
	amount: number;
}

function normalizeBaseUrl(raw: string): string {
	const trimmed = raw.trim();
	return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

function resolveApiUrl(): string {
	const raw = import.meta.env.PUBLIC_API_URL;
	return raw && raw.trim() ? normalizeBaseUrl(raw) : DEFAULT_API_URL;
}

/**
 * Origin of the media service — the API host WITHOUT the `/x/cars/` path
 * (media URLs are `<origin>/<path>`). Prefer PUBLIC_MEDIA_ORIGIN, then derive
 * from an absolute API URL, then the page origin.
 */
function resolveMediaOrigin(): string {
	const raw = import.meta.env.PUBLIC_MEDIA_ORIGIN;
	if (raw && raw.trim()) return raw.trim().replace(/\/+$/, '');
	try {
		return new URL(resolveApiUrl()).origin;
	} catch {
		try {
			return window.location.origin;
		} catch {
			return '';
		}
	}
}

/**
 * Origin for the upload POST (lives at `/upload`, not under the API base).
 * PUBLIC_UPLOAD_ORIGIN overrides; an empty value means "relative" (dev, where
 * `/upload` is proxied to the API host to avoid CORS). Falls back to the
 * media origin when not configured.
 */
function resolveUploadOrigin(): string {
	const raw = import.meta.env.PUBLIC_UPLOAD_ORIGIN;
	if (raw === undefined || raw === null) return resolveMediaOrigin();
	return raw.trim().replace(/\/+$/, '');
}

/** Parse an API envelope, honoring the body `status` over the HTTP status. */
async function parseEnvelope<T extends ApiEnvelope>(response: Response): Promise<T> {
	let body: T;
	try {
		body = (await response.json()) as T;
	} catch {
		throw new ApiError(response.status, `Unexpected response (${response.status} ${response.statusText})`);
	}
	// The API may return HTTP 200 with a non-2xx `status` field in the JSON
	// body, so the body `status` takes precedence when present.
	const status = typeof body?.status === 'number' ? body.status : response.status;
	const ok = response.ok && status >= 200 && status < 300;
	if (!ok) {
		throw new ApiError(status, body?.message ?? `Request failed (${status})`);
	}
	return body;
}

export interface AppContextValue {
	/** Normalized base URL of the Kinesis Cars REST API (from PUBLIC_API_URL). */
	apiUrl: string;
	/** Build an absolute URL for a relative API path, e.g. `api('vehicles')`. */
	api: (path: string) => string;
	/**
	 * JSON request helper against the API base URL.
	 * Attaches `Authorization: Bearer <jwt>` when a session exists and throws an
	 * `ApiError` (carrying the API `message`) on any non-successful response.
	 */
	request: <T extends ApiEnvelope>(path: string, init?: RequestInit) => Promise<T>;
	/** The authenticated session (id + jwt), persisted to localStorage. */
	auth: AuthSession | null;
	/** Sign in via POST /auth/login (auth_data = username or email). */
	login: (authData: string, password: string, otpCode?: string) => Promise<AuthResponse>;
	/** Reauthenticate via POST /auth/jwt using the stored session. */
	reauthenticate: () => Promise<AuthResponse>;
	/** Clear the stored session. */
	logout: () => void;
	/** Upload a file to the media service. Returns the media response. */
	upload: (file: File, security?: 'PUBLIC' | 'PRIVATE') => Promise<UploadResponse>;
	/** Build a public URL for an uploaded media `path`. */
	mediaUrl: (path: string) => string;
	/**
	 * Build the correct display URL for an upload response: PRIVATE media use
	 * `<origin>/media/stream?media_id=…&access_token=…`, PUBLIC media use
	 * `<origin>/<path>`.
	 */
	mediaUrlFromUpload: (media: UploadResponse) => string;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
	const apiUrl = useMemo(() => resolveApiUrl(), []);

	const [auth, setAuth] = useState<AuthSession | null>(() => {
		try {
			const raw = localStorage.getItem(AUTH_STORAGE_KEY);
			if (!raw) return null;
			const parsed = JSON.parse(raw) as AuthSession;
			return parsed && typeof parsed.id === 'string' && typeof parsed.jwt === 'string' ? parsed : null;
		} catch {
			return null;
		}
	});

	useEffect(() => {
		try {
			if (auth) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
			else localStorage.removeItem(AUTH_STORAGE_KEY);
		} catch {
			// Ignore storage errors (private mode, etc.).
		}
	}, [auth]);

	const api = useCallback((path: string) => `${apiUrl}${path.replace(/^\/+/, '')}`, [apiUrl]);

	const mediaOrigin = useMemo(() => resolveMediaOrigin(), []);
	const uploadOrigin = useMemo(() => resolveUploadOrigin(), []);

	const mediaUrl = useCallback(
		(path: string) => `${mediaOrigin}/${path.replace(/^\/+/, '')}`,
		[mediaOrigin],
	);

	const request = useCallback(
		async <T extends ApiEnvelope,>(path: string, init: RequestInit = {}): Promise<T> => {
			const headers = new Headers(init.headers);
			// The API expects `Content-Type: application/json` on requests (e.g.
			// DELETE), even when there is no body.
			if (!headers.has('Content-Type')) {
				headers.set('Content-Type', 'application/json');
			}
			if (auth?.jwt) {
				headers.set('Authorization', `Bearer ${auth.jwt}`);
			}

			const response = await fetch(api(path), { ...init, headers });
			return parseEnvelope<T>(response);
		},
		[api, auth?.jwt],
	);

	const upload = useCallback(
		async (file: File, security: 'PUBLIC' | 'PRIVATE' = 'PUBLIC'): Promise<UploadResponse> => {
			const formData = new FormData();
			formData.append('file', file);

			const headers = new Headers();
			if (auth?.jwt) {
				headers.set('Authorization', `Bearer ${auth.jwt}`);
			}

			const response = await fetch(`${uploadOrigin}/upload?security=${security}&project_id=kinesis_cars`, {
				method: 'POST',
				headers,
				body: formData,
			});
			return parseEnvelope<UploadResponse>(response);
		},
		[uploadOrigin, auth?.jwt],
	);

	const mediaUrlFromUpload = useCallback(
		(media: UploadResponse) => {
			const security = media.security || 'PUBLIC';
			if (security === 'PRIVATE') {
				return `${mediaOrigin}/media/stream?media_id=${encodeURIComponent(media.id)}&access_token=${encodeURIComponent(
					media.access_token ?? '',
				)}`;
			}
			return `${mediaOrigin}/${(media.path || '').replace(/^\/+/, '')}`;
		},
		[mediaOrigin],
	);

	const login = useCallback(
		async (authData: string, password: string, otpCode?: string) => {
			const result = await request<AuthResponse>('auth/login', {
				method: 'POST',
				body: JSON.stringify({
					auth_data: authData,
					password,
					otp_code: otpCode ?? '',
				}),
			});
			if (result.id && result.jwt) {
				setAuth({ id: result.id, jwt: result.jwt });
			}
			return result;
		},
		[request],
	);

	const reauthenticate = useCallback(async () => {
		if (!auth) throw new ApiError(401, 'No active session.');
		const result = await request<AuthResponse>('auth/jwt', {
			method: 'POST',
			body: JSON.stringify({ id: auth.id }),
		});
		if (result.id && result.jwt) {
			setAuth({ id: result.id, jwt: result.jwt });
		}
		return result;
	}, [auth, request]);

	const logout = useCallback(() => setAuth(null), []);

	const value = useMemo<AppContextValue>(
		() => ({ apiUrl, api, request, auth, login, reauthenticate, logout, upload, mediaUrl, mediaUrlFromUpload }),
		[apiUrl, api, request, auth, login, reauthenticate, logout, upload, mediaUrl, mediaUrlFromUpload],
	);

	return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
	const context = useContext(AppContext);
	if (!context) {
		throw new Error('useApp must be used within an <AppProvider>.');
	}
	return context;
}