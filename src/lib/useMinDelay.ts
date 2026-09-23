import { useEffect, useState } from 'react';

/**
 * Returns `true` once `ms` milliseconds have elapsed since mount.
 * Used to guarantee skeletons stay visible long enough that the swap to
 * real content feels like a deliberate transition instead of a jump.
 */
export function useMinDelay(ms: number): boolean {
	const [elapsed, setElapsed] = useState(false);
	useEffect(() => {
		const timer = window.setTimeout(() => setElapsed(true), ms);
		return () => window.clearTimeout(timer);
	}, [ms]);
	return elapsed;
}