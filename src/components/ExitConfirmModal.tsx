import { X } from 'lucide-react';

interface ExitConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  accent?: 'cyan' | 'emerald';
}

export default function ExitConfirmModal({ open, onClose, onConfirm, accent = 'cyan' }: ExitConfirmModalProps) {
  if (!open) return null;

  const accentColor = accent === 'emerald' ? 'emerald' : 'cyan';
  const accentBg = accent === 'emerald' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-[#0891b2] hover:bg-[#0e7490]';
  const accentText = accent === 'emerald' ? 'text-emerald-600' : 'text-[#0891b2]';
  const accentRing = accent === 'emerald' ? 'ring-emerald-500/20' : 'ring-[#0891b2]/20';
  const accentIconBg = accent === 'emerald' ? 'bg-emerald-50' : 'bg-cyan-50';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" style={{ animation: 'fadeIn 0.2s ease-out both' }}>
      <div className="bg-white rounded-3xl p-6 max-w-xs w-full text-center shadow-premium-lg" style={{ animation: 'popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
        <div className={`relative mx-auto w-16 h-16 mb-4`}>
          <div className={`absolute inset-0 ${accentIconBg} rounded-full blur-lg opacity-60`} />
          <div className={`relative w-16 h-16 rounded-full ${accentIconBg} flex items-center justify-center`}>
            <X size={28} className={accentText} strokeWidth={2.5} />
          </div>
        </div>
        <h2 className="text-xl font-extrabold text-gray-900 mb-1">Close lesson?</h2>
        <p className="text-sm text-gray-400 mb-6 leading-relaxed">Your progress in this lesson won't be saved. Are you sure you want to close?</p>
        <div className="space-y-2.5">
          <button
            onClick={onConfirm}
            className={`w-full ${accentBg} text-white font-bold py-3.5 rounded-2xl shadow-premium-lg active:scale-95 transition-all`}
          >
            Yes, close
          </button>
          <button
            onClick={onClose}
            className="w-full text-gray-500 font-semibold py-3 rounded-2xl hover:bg-gray-50 transition active:scale-95"
          >
            Keep learning
          </button>
        </div>
      </div>
    </div>
  );
}
