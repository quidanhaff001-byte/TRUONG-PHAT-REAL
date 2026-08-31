import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, Eye, EyeOff, CheckCircle2, XCircle, ShieldAlert, KeyRound, Loader2 } from 'lucide-react';
import { Logo } from '../common/Logo';

export const MustChangePasswordModal: React.FC = () => {
  const { currentUser, mustChangePassword, changeMandatoryPassword, logout } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!mustChangePassword || !currentUser) {
    return null;
  }

  // Real-time checks
  const checks = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    match: newPassword.length > 0 && newPassword === confirmPassword,
  };

  const isFormValid =
    checks.length &&
    checks.uppercase &&
    checks.lowercase &&
    checks.number &&
    checks.special &&
    checks.match;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isFormValid) {
      setErrorMsg('Vui lòng đáp ứng đầy đủ tất cả các yêu cầu bảo mật mật khẩu bên dưới.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await changeMandatoryPassword(newPassword);
      if (!res) {
        setErrorMsg('Không thể đổi mật khẩu. Vui lòng kiểm tra lại kết nối mạng hoặc đăng nhập lại.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Đã có lỗi xảy ra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#001f3f] text-[#D4AF37] flex items-center justify-center mb-3 shadow-md">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-[#001f3f]">YÊU CẦU ĐỔI MẬT KHẨU LẦN ĐẦU</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Tài khoản <span className="font-bold text-[#001f3f]">{currentUser.email}</span> được cấp mật khẩu tạm thời. Để bảo mật thông tin nội bộ TRUONG PHAT REAL, bạn cần thiết lập mật khẩu cá nhân mới trước khi tiếp tục.
          </p>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {/* New Password */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Mật khẩu mới *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Nhập mật khẩu bảo mật mới"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                autoFocus
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

          {/* Confirm Password */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Xác nhận mật khẩu mới *</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Validation Checklist */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1.5 text-[11px]">
            <div className="font-bold text-slate-700 mb-1">Tiêu chuẩn an toàn bắt buộc:</div>
            <div className={`flex items-center gap-2 ${checks.length ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
              {checks.length ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
              <span>Tối thiểu 8 ký tự trở lên</span>
            </div>
            <div className={`flex items-center gap-2 ${checks.uppercase ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
              {checks.uppercase ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
              <span>Có ít nhất 1 chữ in hoa (A-Z)</span>
            </div>
            <div className={`flex items-center gap-2 ${checks.lowercase ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
              {checks.lowercase ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
              <span>Có ít nhất 1 chữ thường (a-z)</span>
            </div>
            <div className={`flex items-center gap-2 ${checks.number ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
              {checks.number ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
              <span>Có ít nhất 1 chữ số (0-9)</span>
            </div>
            <div className={`flex items-center gap-2 ${checks.special ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
              {checks.special ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
              <span>Có ít nhất 1 ký tự đặc biệt (!@#$%^&*...)</span>
            </div>
            <div className={`flex items-center gap-2 ${checks.match ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
              {checks.match ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
              <span>Hai mật khẩu trùng khớp</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={logout}
              className="px-4 py-2.5 text-slate-500 hover:text-slate-700 text-xs font-semibold rounded-xl"
            >
              Đăng xuất
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="flex-1 py-2.5 bg-[#001f3f] hover:bg-[#002e5c] text-[#D4AF37] font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang cập nhật...</span>
                </>
              ) : (
                <span>Lưu mật khẩu mới & Bắt đầu làm việc</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
