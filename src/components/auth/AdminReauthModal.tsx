import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Lock, Eye, EyeOff, Loader2, AlertCircle, X } from 'lucide-react';

interface AdminReauthModalProps {
  isOpen: boolean;
  actionTitle: string;
  actionDescription: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export const AdminReauthModal: React.FC<AdminReauthModalProps> = ({
  isOpen,
  actionTitle,
  actionDescription,
  onConfirm,
  onClose,
}) => {
  const { reauthenticateAdmin } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Vui lòng nhập mật khẩu Quản trị viên của bạn.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const isValid = await reauthenticateAdmin(password.trim());
      if (isValid) {
        await onConfirm();
        onClose();
      } else {
        setErrorMsg('Mật khẩu Quản trị viên không chính xác. Thao tác bị từ chối.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Xác thực danh tính thất bại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#001f3f]">{actionTitle}</h3>
              <p className="text-[11px] text-slate-500">Xác thực danh tính Quản trị viên</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed mb-4">
          {actionDescription}
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nhập mật khẩu tài khoản Admin của bạn để xác nhận *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mật khẩu của bạn..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#D4AF37]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="px-5 py-2 bg-[#001f3f] text-[#D4AF37] hover:bg-[#002e5c] rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang kiểm tra...</span>
                </>
              ) : (
                <span>Xác nhận thực hiện</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
