import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Lock,
  Eye,
  EyeOff,
  User as UserIcon,
  KeyRound,
  AlertCircle,
  ShieldCheck,
  PhoneCall,
  X,
} from 'lucide-react';

export const Login: React.FC = () => {
  const { loginWithEmail, resetPassword } = useAuth();

  // Input states
  const [accountInput, setAccountInput] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [forgotSubmitted, setForgotSubmitted] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanAccount = accountInput.trim();
    const cleanPass = password.trim();

    if (!cleanAccount) {
      setErrorMessage('Vui lòng nhập tài khoản đăng nhập.');
      return;
    }
    if (!cleanPass) {
      setErrorMessage('Vui lòng nhập mật khẩu.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await loginWithEmail(cleanAccount, cleanPass);
      if (!success) {
        setErrorMessage('Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.');
      }
    } catch {
      setErrorMessage('Đã xảy ra lỗi trong quá trình đăng nhập. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    await resetPassword(forgotEmail.trim());
    setForgotSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#070e1c] text-slate-100 flex flex-col justify-between items-center px-4 py-8 sm:py-12 relative overflow-x-hidden selection:bg-[#D4AF37] selection:text-[#00172e]">
      {/* Subtle Ambient Background Light */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#D4AF37]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Spacer for perfect vertical alignment */}
      <div className="w-full shrink-0" />

      {/* Main Centered Content */}
      <div className="w-full max-w-[460px] my-auto relative z-10 flex flex-col items-center">
        {/* 1, 2, 3: Header Branding: Logo TP, Name, Short Description */}
        <div className="text-center mb-6 sm:mb-8 flex flex-col items-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#D4AF37] via-[#e5c158] to-[#b38e22] flex items-center justify-center text-[#00172e] font-black text-2xl sm:text-3xl shadow-lg shadow-amber-950/40 border border-[#D4AF37]/60 mb-3.5 transition-transform hover:scale-105">
            TP
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-wider uppercase">
            TRUONG PHAT REAL
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
            Hệ thống quản lý bất động sản nội bộ
          </p>
        </div>

        {/* 4: Centered Login Box */}
        <div className="w-full bg-[#0B1528] border border-[#1E3A5F] rounded-[24px] shadow-2xl shadow-black/50 p-6 sm:p-8 backdrop-blur-md">
          {/* Card Title & Subtitle */}
          <div className="text-center pb-5 border-b border-[#1E3A5F]/60">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide uppercase">
              ĐĂNG NHẬP HỆ THỐNG
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Nhập tài khoản và mật khẩu được cấp để tiếp tục
            </p>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="mt-4 p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 mt-5">
            {/* Account / Email Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tài khoản đăng nhập <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  autoComplete="username"
                  value={accountInput}
                  onChange={(e) => {
                    setAccountInput(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="Nhập email hoặc mã nhân viên"
                  className="w-full min-h-[48px] h-12 pl-10 pr-4 bg-[#070e1c] border border-[#1E3A5F] rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50 transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Mật khẩu <span className="text-rose-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(true);
                    setForgotSubmitted(false);
                  }}
                  className="text-xs text-[#D4AF37] hover:underline font-medium cursor-pointer transition-colors"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="Nhập mật khẩu"
                  className="w-full min-h-[48px] h-12 pl-10 pr-11 bg-[#070e1c] border border-[#1E3A5F] rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center text-xs pt-1">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#1E3A5F] bg-[#070e1c] text-[#D4AF37] focus:ring-[#D4AF37] accent-[#D4AF37] cursor-pointer"
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[50px] h-[50px] px-4 bg-gradient-to-r from-[#D4AF37] via-[#e5c158] to-[#b38e22] hover:opacity-95 active:scale-[0.99] text-[#00172e] font-black text-sm rounded-xl shadow-lg shadow-amber-950/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#00172e]/30 border-t-[#00172e] rounded-full animate-spin" />
                  <span>Đang đăng nhập...</span>
                </div>
              ) : (
                <span>ĐĂNG NHẬP</span>
              )}
            </button>
          </form>

          {/* Encrypted & Secure Note */}
          <div className="mt-6 pt-4 border-t border-[#1E3A5F]/60 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Kết nối được mã hóa và bảo mật</span>
          </div>
        </div>
      </div>

      {/* 5: Centered Light Footer */}
      <footer className="w-full max-w-xl text-center py-4 relative z-10 text-xs text-slate-400 flex flex-col items-center justify-center gap-1 leading-relaxed shrink-0">
        <div>© 2026 TRUONG PHAT REAL</div>
        <div>Hệ thống quản lý bất động sản nội bộ</div>
        <div>
          Hỗ trợ kỹ thuật:{' '}
          <a
            href="tel:0919414884"
            className="text-[#D4AF37] hover:underline font-semibold font-mono"
          >
            0919 414 884
          </a>
        </div>
      </footer>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0B1528] border border-[#1E3A5F] rounded-[22px] max-w-md w-full p-6 shadow-2xl text-white relative">
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] mb-4">
              <KeyRound className="w-6 h-6" />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white mb-1">
              Quên mật khẩu đăng nhập?
            </h3>

            {forgotSubmitted ? (
              <div className="space-y-4 pt-2">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Nếu email hợp lệ và tồn tại trong hệ thống, liên kết đặt lại mật khẩu đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.
                </p>
                <div className="p-3 bg-[#070e1c] rounded-xl border border-[#1E3A5F] text-xs text-slate-300 flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-[#D4AF37] shrink-0" />
                  <span>
                    Hoặc liên hệ Hotline Kỹ thuật:{' '}
                    <strong className="text-[#D4AF37]">0919 414 884</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full py-2.5 bg-[#D4AF37] text-[#00172e] text-xs font-bold rounded-xl hover:opacity-95 transition-all"
                >
                  Đã hiểu & Đóng
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4 pt-2">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Nhập email công vụ để nhận liên kết khôi phục mật khẩu hoặc gọi trực tiếp bộ phận hỗ trợ kỹ thuật:
                </p>

                <input
                  type="email"
                  required
                  placeholder="Nhập email của bạn"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 bg-[#070e1c] border border-[#1E3A5F] rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50"
                />

                <div className="p-3 bg-[#070e1c] rounded-xl border border-[#1E3A5F] text-[11px] text-slate-300 flex items-start gap-2">
                  <PhoneCall className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                  <div>
                    Hỗ trợ cấp lại nhanh qua số:{' '}
                    <a href="tel:0919414884" className="text-[#D4AF37] font-bold font-mono">
                      0919 414 884
                    </a>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-[#D4AF37] hover:bg-[#c49f2c] text-[#00172e] text-xs font-bold rounded-xl transition-colors shadow-md"
                  >
                    Gửi yêu cầu
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
