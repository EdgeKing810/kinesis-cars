import { useState, type SyntheticEvent } from 'react';
import { useApp, type Fleet, type Vehicle } from '../../context/AppContext';
import { BODY_TYPES, CAR_MAKES, FUEL_TYPES, LOCATIONS, TRANSMISSIONS } from '../../lib/vehicles';

const inputClass = 'input input-bordered mt-1 w-full';

function ListInput({
	label,
	hint,
	items,
	onChange,
	placeholder,
	onUpload,
	uploading,
}: {
	label: string;
	hint?: string;
	items: string[];
	onChange: (items: string[]) => void;
	placeholder?: string;
	onUpload?: () => void;
	uploading?: boolean;
}) {
	function update(i: number, value: string) {
		const next = [...items];
		next[i] = value;
		onChange(next);
	}

	return (
		<div className="sm:col-span-2 lg:col-span-3">
			<span className="text-sm font-medium text-slate-300">
				{label}
				{hint && <span className="font-normal text-slate-500"> ({hint})</span>}
			</span>
			<div className="mt-2 space-y-2">
				{items.map((item, i) => (
					<div key={i} className="flex gap-2">
						<input
							type="text"
							value={item}
							onChange={(e) => update(i, e.target.value)}
							placeholder={placeholder}
							className={inputClass}
						/>
						<button
							type="button"
							onClick={() => onChange(items.filter((_, idx) => idx !== i))}
							className="btn btn-outline btn-error btn-sm shrink-0"
							aria-label="Remove item"
						>
							✕
						</button>
					</div>
				))}
				<div className="flex gap-2">
					<button type="button" onClick={() => onChange([...items, ''])} className="btn btn-outline btn-secondary btn-sm">
						+ Add
					</button>
					{onUpload && (
						<button type="button" onClick={onUpload} disabled={uploading} className="btn btn-outline btn-secondary btn-sm">
							{uploading ? 'Uploading…' : 'Upload image'}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}

export interface VehicleFormProps {
	fleets: Fleet[];
	initial?: Vehicle | null;
	submitLabel: string;
	onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

export default function VehicleForm({ fleets, initial, submitLabel, onSubmit }: VehicleFormProps) {
	const { upload, mediaUrl } = useApp();

	const [fleetId, setFleetId] = useState(initial?.fleet_id ?? '');
	const [nickname, setNickname] = useState(initial?.nickname ?? '');
	const [make, setMake] = useState(initial?.car_make ?? '');
	const [model, setModel] = useState(initial?.model ?? '');
	const [body, setBody] = useState(initial?.body_type ?? '');
	const [color, setColor] = useState(initial?.color ?? '');
	const [doors, setDoors] = useState(initial?.doors?.toString() ?? '4');
	const [seats, setSeats] = useState(initial?.seats?.toString() ?? '5');
	const [transmission, setTransmission] = useState(initial?.transmission ?? '');
	const [fuel, setFuel] = useState(initial?.fuel_type ?? '');
	const [mileage, setMileage] = useState(initial?.mileage_km?.toString() ?? '');
	const [registration, setRegistration] = useState(initial?.registration ?? '');
	const [price, setPrice] = useState(
		initial ? Math.round(initial.price_per_day_cents / 100).toString() : '',
	);
	const [minDays, setMinDays] = useState(initial?.min_rent_days?.toString() ?? '1');
	const [maxDays, setMaxDays] = useState(initial?.max_rent_days?.toString() ?? '999');
	const [location, setLocation] = useState(initial?.location ?? '');
	const [plate, setPlate] = useState(initial?.license_plate ?? '');
	const [options, setOptions] = useState<string[]>(initial?.options ?? []);
	const [additional, setAdditional] = useState<string[]>(initial?.additional ?? []);
	const [pictures, setPictures] = useState<string[]>(initial?.pictures ?? []);
	const [isActive, setIsActive] = useState(initial?.is_active ?? true);

	const [submitting, setSubmitting] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handlePictureUpload() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'image/*';
		input.onchange = async () => {
			const file = input.files?.[0];
			if (!file) return;
			setUploading(true);
			setError(null);
			try {
				const res = await upload(file, 'PUBLIC');
				const url = mediaUrl(res.path);
				setPictures((prev) => [...prev, url]);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Upload failed.');
			} finally {
				setUploading(false);
			}
		};
		input.click();
	}

	async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		const required = { car_make: make, model, body_type: body, color, transmission, fuel_type: fuel, location };
		const missing = Object.entries(required).find(([, v]) => !v);
		if (missing) {
			setError(`${missing[0]} is required.`);
			return;
		}
		if (!doors || !seats || !mileage || !registration || !price) {
			setError('Doors, seats, mileage, registration and price are required.');
			return;
		}

		const payload: Record<string, unknown> = {
			fleet_id: fleetId || null,
			nickname: nickname || null,
			car_make: make,
			model,
			body_type: body,
			color,
			doors: Number(doors),
			seats: Number(seats),
			transmission,
			fuel_type: fuel,
			mileage_km: Number(mileage),
			registration,
			price_per_day_cents: Math.round(Number(price) * 100),
			min_rent_days: Number(minDays) || 1,
			max_rent_days: Number(maxDays) || 999,
			location,
			license_plate: plate || '',
			options: options.map((s) => s.trim()).filter(Boolean),
			additional: additional.map((s) => s.trim()).filter(Boolean),
			pictures: pictures.map((s) => s.trim()).filter(Boolean),
			is_active: isActive,
		};

		setSubmitting(true);
		try {
			await onSubmit(payload);
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6" noValidate>
			{error && (
				<p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</p>
			)}

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<label className="block">
					<span className="text-sm font-medium text-slate-300">Fleet <span className="font-normal text-slate-500">(optional)</span></span>
					<select value={fleetId} onChange={(e) => setFleetId(e.target.value)} className={inputClass}>
						<option value="">No fleet</option>
						{fleets.map((f) => (
							<option key={f.id} value={f.id}>{f.name}</option>
						))}
					</select>
				</label>
				<label className="block">
					<span className="text-sm font-medium text-slate-300">Nickname <span className="font-normal text-slate-500">(optional)</span></span>
					<input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} className={inputClass} placeholder="e.g. The BMW M340i" />
				</label>
				<label className="block">
					<span className="text-sm font-medium text-slate-300">License plate <span className="font-normal text-slate-500">(optional)</span></span>
					<input type="text" value={plate} onChange={(e) => setPlate(e.target.value)} className={inputClass} placeholder="e.g. 5545 JU 17" />
				</label>

				<label className="block">
					<span className="text-sm font-medium text-slate-300">Make *</span>
					<select value={make} onChange={(e) => setMake(e.target.value)} className={inputClass}>
						<option value="">Select make</option>
						{CAR_MAKES.map((m) => (
							<option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
						))}
					</select>
				</label>
				<label className="block">
					<span className="text-sm font-medium text-slate-300">Model *</span>
					<input type="text" value={model} onChange={(e) => setModel(e.target.value)} className={inputClass} placeholder="e.g. 118i" />
				</label>
				<label className="block">
					<span className="text-sm font-medium text-slate-300">Color *</span>
					<input type="text" value={color} onChange={(e) => setColor(e.target.value)} className={inputClass} placeholder="e.g. Grey" />
				</label>

				<label className="block">
					<span className="text-sm font-medium text-slate-300">Body type *</span>
					<select value={body} onChange={(e) => setBody(e.target.value)} className={inputClass}>
						<option value="">Select body</option>
						{BODY_TYPES.map((b) => (
							<option key={b} value={b}>{b.replace(/_/g, ' ')}</option>
						))}
					</select>
				</label>
				<label className="block">
					<span className="text-sm font-medium text-slate-300">Transmission *</span>
					<select value={transmission} onChange={(e) => setTransmission(e.target.value)} className={inputClass}>
						<option value="">Select transmission</option>
						{TRANSMISSIONS.map((t) => (
							<option key={t} value={t}>{t}</option>
						))}
					</select>
				</label>
				<label className="block">
					<span className="text-sm font-medium text-slate-300">Fuel type *</span>
					<select value={fuel} onChange={(e) => setFuel(e.target.value)} className={inputClass}>
						<option value="">Select fuel</option>
						{FUEL_TYPES.map((f) => (
							<option key={f} value={f}>{f.replace(/_/g, ' ')}</option>
						))}
					</select>
				</label>

				<label className="block">
					<span className="text-sm font-medium text-slate-300">Doors *</span>
					<input type="number" min={1} max={8} value={doors} onChange={(e) => setDoors(e.target.value)} className={inputClass} />
				</label>
				<label className="block">
					<span className="text-sm font-medium text-slate-300">Seats *</span>
					<input type="number" min={1} max={12} value={seats} onChange={(e) => setSeats(e.target.value)} className={inputClass} />
				</label>
				<label className="block">
					<span className="text-sm font-medium text-slate-300">Mileage (km) *</span>
					<input type="number" min={0} value={mileage} onChange={(e) => setMileage(e.target.value)} className={inputClass} />
				</label>

				<label className="block">
					<span className="text-sm font-medium text-slate-300">Registration (yyyy-mm) *</span>
					<input type="month" value={registration} onChange={(e) => setRegistration(e.target.value)} className={inputClass} />
				</label>
				<label className="block">
					<span className="text-sm font-medium text-slate-300">Price per day (Rs) *</span>
					<input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} placeholder="e.g. 3000" />
				</label>
				<label className="block">
					<span className="text-sm font-medium text-slate-300">Location *</span>
					<select value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass}>
						<option value="">Select location</option>
						{LOCATIONS.map((l) => (
							<option key={l} value={l}>{l}</option>
						))}
					</select>
				</label>

				<label className="block">
					<span className="text-sm font-medium text-slate-300">Min rent days</span>
					<input type="number" min={1} value={minDays} onChange={(e) => setMinDays(e.target.value)} className={inputClass} />
				</label>
				<label className="block">
					<span className="text-sm font-medium text-slate-300">Max rent days</span>
					<input type="number" min={1} value={maxDays} onChange={(e) => setMaxDays(e.target.value)} className={inputClass} />
				</label>
				<label className="flex items-center gap-2 pt-6">
					<input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="checkbox checkbox-sm" />
					<span className="text-sm font-medium text-slate-300">Active (available to rent)</span>
				</label>

				<ListInput
					label="Options"
					hint="optional"
					items={options}
					onChange={setOptions}
					placeholder="e.g. A/C"
				/>
				<ListInput
					label="Additional features"
					hint="optional"
					items={additional}
					onChange={setAdditional}
					placeholder="e.g. Yellow DRLs"
				/>
				<ListInput
					label="Pictures"
					hint="optional"
					items={pictures}
					onChange={setPictures}
					placeholder="https://…"
					onUpload={handlePictureUpload}
					uploading={uploading}
				/>
			</div>

			<button type="submit" disabled={submitting} className="btn btn-primary w-full disabled:opacity-60">
				{submitting ? 'Saving…' : submitLabel}
			</button>
		</form>
	);
}