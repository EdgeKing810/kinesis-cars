import { useState } from 'react';

export default function PasswordInput({
	value,
	onChange,
	placeholder,
	autoComplete,
	className = '',
}: {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	autoComplete?: string;
	className?: string;
}) {
	const [show, setShow] = useState(false);
	return (
		<div className="relative">
			<input
				type={show ? 'text' : 'password'}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				autoComplete={autoComplete}
				className={`${className} pr-11`}
			/>
			<button
				type="button"
				onClick={() => setShow((s) => !s)}
				aria-label={show ? 'Hide password' : 'Show password'}
				className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 transition hover:text-white"
			>
				{show ? (
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
						<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
						<path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
						<path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
						<line x1="2" x2="22" y1="2" y2="22" />
					</svg>
				) : (
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
						<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
						<circle cx="12" cy="12" r="3" />
					</svg>
				)}
			</button>
		</div>
	);
}