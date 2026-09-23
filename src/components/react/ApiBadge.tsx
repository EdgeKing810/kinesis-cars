import { AppProvider, useApp } from '../../context/AppContext';

function ApiStatus() {
  const { apiUrl } = useApp();
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span className="truncate">API · {apiUrl}</span>
    </span>
  );
}

export default function ApiBadge() {
  return (
    <AppProvider>
      <ApiStatus />
    </AppProvider>
  );
}
