import { useState } from 'react';

export function ExportFlightLogButton({ onExport }: { onExport: () => void }) {
  const [status, setStatus] = useState('');
  return (
    <div className="mt-3">
      <button type="button" className="retro-btn-secondary w-full min-h-11 px-3 text-[10px] text-[#00F0FF]"
        onClick={() => {
          try { onExport(); setStatus('Flight log download started.'); }
          catch { setStatus('Export failed. Please try again.'); }
        }}>
        Export Flight Log
      </button>
      <p role="status" className="text-[9px] text-[#A0AEC0] mt-1 leading-relaxed">{status}</p>
    </div>
  );
}
