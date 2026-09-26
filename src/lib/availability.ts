import type { Blockout, Vehicle } from '../context/AppContext';

/**
 * A vehicle is available to rent starting now only if:
 *   - it is active, AND
 *   - today is not within a blockout period, AND
 *   - renting for its `min_rent_days` wouldn't overlap any blockout
 *     (e.g. a blockout starting shortly after today).
 */
export function isVehicleAvailable(
	vehicle: Pick<Vehicle, 'is_active' | 'min_rent_days'>,
	blockouts: Blockout[],
	now: Date = new Date(),
): boolean {
	if (!vehicle.is_active) return false;
	return findBlockingBlockout(vehicle, blockouts, now) === null;
}

/** Returns the blockout that makes the vehicle unavailable right now, if any. */
export function findBlockingBlockout(
	vehicle: Pick<Vehicle, 'is_active' | 'min_rent_days'>,
	blockouts: Blockout[],
	now: Date = new Date(),
): Blockout | null {
	if (!vehicle.is_active) return null;

	const rentEnd = new Date(now.getTime());
	rentEnd.setDate(rentEnd.getDate() + Math.max(1, vehicle.min_rent_days ?? 1));

	return (
		blockouts.find((b) => {
			const start = new Date(b.start_date);
			const end = new Date(b.end_date);
			return start <= rentEnd && end >= now;
		}) ?? null
	);
}