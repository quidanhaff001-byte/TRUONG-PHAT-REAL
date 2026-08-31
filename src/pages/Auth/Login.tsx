import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Lock,
  ShieldCheck,
  ArrowRight,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  Phone,
  Zap,
  Globe,
  Building,
  Shield,
  User,
  Info,
} from 'lucide-react';

export const Login: React.FC = () => {
  const { loginWithEmail, loginWithGoogle, resetPassword } = useAuth();

  // Input states - strictly empty, user must manually input their issued credentials
  const [accountInput, setAccountInput] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Modals & UI States
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [showPolicyModal, setShowPolicyModal] = useState<boolean>(false);
  const [lang, setLang] = useState<'vi' | 'en'>('vi');

  // Featured property showcases for luxury real estate portal aesthetic
  const FEATURED_PROPERTIES = [
    {
      code: 'TP-Q1-008',
      title: 'Biệt thự Đơn Lập Trung Tâm Đa Kao, Quận 1',
      price: '48.5 Tỷ',
      area: '280m²',
      type: 'Nhà Phố / Biệt Thự',
      tag: 'Ký gửi Độc Quyền',
      img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80',
    },
    {
      code: 'TP-Q2-019',
      title: 'Tòa Nhà Văn Phòng & Shophouse Thảo Điền',
      price: '180 Triệu/th',
      area: '520m²',
      type: 'Cho Thuê Cao Cấp',
      tag: 'Sẵn Sàng Bàn Giao',
      img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&auto=format&fit=crop&q=80',
    },
  ];
  const [currentPropIdx, setCurrentPropIdx] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPropIdx((prev) => (prev + 1) % FEATURED_PROPERTIES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!accountInput.trim()) {
      setErrorMessage('Vui lòng nhập Email công vụ hoặc Mã nhân viên đã được cấp.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Vui lòng nhập Mật khẩu bảo mật.');
      return;
    }

    setIsSubmitting(true);
    const success = await loginWithEmail(accountInput.trim(), password.trim());
    if (!success) {
      setErrorMessage('Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại thông tin đã được cấp.');
    }
    setIsSubmitting(false);
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    await resetPassword(forgotEmail);
    setShowForgotModal(false);
    setForgotEmail('');
  };

  return (
    <div className="min-h-screen bg-[#00172e] flex flex-col justify-between text-slate-100 selection:bg-[#D4AF37] selection:text-[#001f3f] relative overflow-x-hidden font-sans">
      {/* Background Light Effects */}
      <div className="absolute top-0 left-1/4 w-[700px] h-[700px] bg-[#D4AF37]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#003366]/40 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Bar Header */}
      <header className="relative z-20 border-b border-white/10 bg-[#001f3f]/80 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-[#D4AF37] to-[#b38e22] flex items-center justify-center text-[#001f3f] font-black text-xl shadow-lg shadow-amber-950/30 border border-[#D4AF37]/60">
            TP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-base sm:text-lg tracking-tight">TRUONG PHAT REAL</span>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-[10px] font-bold uppercase tracking-wider">
                Enterprise Secure
              </span>
            </div>
            <p className="text-[11px] text-gray-400 hidden sm:block">
              Hệ thống Quản trị & Phân phối Bất Động Sản Ký Gửi Độc Quyền
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6 text-xs">
          {/* Cloud Firestore Live Status */}
          <div
            title="Trạng thái kết nối cơ sở dữ liệu thời gian thực"
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-medium"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden md:inline">Hệ thống:</span>
            <span className="font-semibold">Bảo mật SSL 256-bit</span>
          </div>

          {/* Hotline Kỹ Thuật */}
          <a
            href="tel:0919414884"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-gray-200 transition-colors font-mono font-bold"
          >
            <Phone className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>0919.414.884</span>
          </a>

          {/* Language Selector */}
          <button
            type="button"
            onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-semibold">{lang === 'vi' ? '🇻🇳 VIE' : '🇬🇧 ENG'}</span>
          </button>
        </div>
      </header>

      {/* Main Container: 2-Column Real Estate Layout */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Real Estate Ecosystem Showcase (6 Cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-bold tracking-wide">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span>NỀN TẢNG CÔNG NGHỆ BẤT ĐỘNG SẢN CAO CẤP</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Quản trị nguồn hàng, <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-[#D4AF37] via-amber-200 to-[#D4AF37]">
                khớp khách tức thì.
              </span>
            </h1>
            <p className="text-sm sm:text-base text-gray-300 leading-relaxed max-w-xl">
              Hệ sinh thái số hóa nguồn hàng chuẩn hóa cho Sàn TRUONG PHAT REAL. Quản lý đồng bộ kho hàng, định vị chống trùng, tự động tính hoa hồng và bảo mật tuyệt đối dữ liệu chủ nhà.
            </p>
          </div>

          {/* 4 Core Value Metric Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-2xl font-black text-white font-mono">1.850+</span>
                <Building className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div className="text-xs font-bold text-gray-300">Nguồn hàng ký gửi</div>
              <div className="text-[11px] text-gray-400 mt-0.5">Xác thực sổ hồng & pháp lý</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-2xl font-black text-emerald-400 font-mono">99.8%</span>
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-xs font-bold text-gray-300">Chống trùng nguồn</div>
              <div className="text-[11px] text-gray-400 mt-0.5">Đối chiếu địa chỉ & tọa độ số</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-2xl font-black text-amber-300 font-mono">3 Lớp</span>
                <Lock className="w-5 h-5 text-amber-300" />
              </div>
              <div className="text-xs font-bold text-gray-300">Bảo mật chủ nhà</div>
              <div className="text-[11px] text-gray-400 mt-0.5">Mã hóa SĐT & ghi vết truy cập</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-2xl font-black text-cyan-400 font-mono">24/7</span>
                <Zap className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="text-xs font-bold text-gray-300">Khớp nhu cầu tự động</div>
              <div className="text-[11px] text-gray-400 mt-0.5">Gợi ý giỏ hàng cho khách mua/thuê</div>
            </div>
          </div>

          {/* Featured Dynamic Property Card Preview */}
          <div className="p-4 rounded-2xl bg-linear-to-r from-white/10 to-white/5 border border-white/15 flex items-center gap-4 relative overflow-hidden group">
            <img
              src={FEATURED_PROPERTIES[currentPropIdx].img}
              alt="BDS Tiêu Biểu"
              referrerPolicy="no-referrer"
              className="w-24 h-20 rounded-xl object-cover border border-white/20 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-md bg-[#D4AF37] text-[#001f3f] text-[10px] font-black uppercase">
                  {FEATURED_PROPERTIES[currentPropIdx].tag}
                </span>
                <span className="text-[11px] font-mono text-gray-400 font-bold">
                  {FEATURED_PROPERTIES[currentPropIdx].code}
                </span>
              </div>
              <div className="text-xs font-bold text-white truncate">
                {FEATURED_PROPERTIES[currentPropIdx].title}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs">
                <span className="text-[#D4AF37] font-extrabold text-sm">
                  {FEATURED_PROPERTIES[currentPropIdx].price}
                </span>
                <span className="text-gray-400 text-[11px]">
                  • {FEATURED_PROPERTIES[currentPropIdx].area}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Strict Secure Login Box (6 Cols) */}
        <div className="lg:col-span-6">
          <div className="bg-[#001f3f]/90 backdrop-blur-xl border border-white/15 rounded-3xl shadow-2xl p-6 sm:p-8 relative">
            {/* Header */}
            <div className="pb-5 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#D4AF37]" />
                  <span>CỔNG ĐĂNG NHẬP NỘI BỘ</span>
                </h2>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-[11px] font-bold">
                  <Lock className="w-3 h-3" />
                  <span>Bảo Mật Cao</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Vui lòng nhập chính xác Email công vụ hoặc Mã nhân viên và mật khẩu được cấp
              </p>
            </div>

            {/* Error banner if any */}
            {errorMessage && (
              <div className="mt-4 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <Info className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Manual Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4 mt-5">
              {/* Account Input (Email or Employee Code) */}
              <div>
                <label className="block text-xs font-bold text-gray-200 mb-1.5">
                  Tài khoản đăng nhập <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={accountInput}
                    onChange={(e) => {
                      setAccountInput(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="Nhập Email, Mã NV (TP-001) hoặc Tài khoản Quản trị (admin)"
                    className="w-full pl-10 pr-4 py-3 bg-[#00172e] border border-white/15 rounded-xl text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-200">
                    Mật khẩu bảo mật <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[11px] text-[#D4AF37] hover:underline font-semibold cursor-pointer"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="Nhập mật khẩu được cấp"
                    className="w-full pl-10 pr-10 py-3 bg-[#00172e] border border-white/15 rounded-xl text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Option */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-white/20 bg-[#00172e] text-[#D4AF37] focus:ring-[#D4AF37]"
                  />
                  <span>Ghi nhớ phiên làm việc trên thiết bị</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 bg-linear-to-r from-[#D4AF37] via-amber-400 to-[#b38e22] hover:opacity-95 text-[#001f3f] font-extrabold text-sm rounded-xl shadow-lg shadow-amber-950/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Đang xác thực bảo mật...</span>
                ) : (
                  <>
                    <span>ĐĂNG NHẬP HỆ THỐNG</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Alternative Google Sign-in */}
              <div className="pt-2">
                <div className="relative flex items-center justify-center my-3">
                  <div className="border-t border-white/10 w-full" />
                  <span className="bg-[#001f3f] px-3 text-[11px] text-gray-400 uppercase tracking-wider font-semibold absolute">
                    hoặc
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => loginWithGoogle()}
                  className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/15 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Đăng nhập với Google Workspace</span>
                </button>
              </div>
            </form>

            {/* Bottom Security Note */}
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mã hóa bảo mật nội bộ</span>
              </div>

              <button
                type="button"
                onClick={() => setShowPolicyModal(true)}
                className="text-gray-400 hover:text-[#D4AF37] transition-colors hover:underline cursor-pointer"
              >
                Quy chế bảo mật BĐS
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Branding & Copyright */}
      <footer className="relative z-20 border-t border-white/10 bg-[#001426]/90 px-4 sm:px-8 py-4 text-center text-xs text-gray-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          © {new Date().getFullYear()} <strong>TRUONG PHAT REAL</strong>. Cổng thông tin nghiệp vụ nội bộ.
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>Phòng Công Nghệ & Kỹ Thuật BĐS</span>
          <span>•</span>
          <a href="tel:0919414884" className="text-[#D4AF37] font-mono font-bold hover:underline">
            Hotline Kỹ thuật: 0919.414.884
          </a>
        </div>
      </footer>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#001f3f] border border-[#D4AF37]/40 rounded-3xl max-w-md w-full p-6 shadow-2xl text-white">
            <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] mb-4">
              <KeyRound className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-white mb-1">Khôi phục mật khẩu công vụ</h3>
            <p className="text-xs text-gray-300 mb-4 leading-relaxed">
              Nhập email công ty của bạn để nhận hướng dẫn khôi phục mật khẩu hoặc liên hệ trực tiếp Quản trị viên kỹ thuật:
            </p>

            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <input
                type="email"
                required
                placeholder="name@truongphatreal.vn"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#00172e] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37]"
              />

              <div className="p-3 bg-black/30 rounded-xl border border-white/10 text-[11px] text-gray-300">
                💡 <strong>Hỗ trợ cấp lại nhanh:</strong> Gọi trực tiếp Trưởng phòng Kỹ thuật qua hotline{' '}
                <a href="tel:0919414884" className="text-[#D4AF37] font-mono font-bold underline">
                  0919.414.884
                </a>{' '}
                để được xác minh và cấp lại mật khẩu ngay lập tức.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#D4AF37] hover:bg-[#c49f2c] text-[#001f3f] text-xs font-bold rounded-xl transition-colors shadow-md cursor-pointer"
                >
                  Gửi yêu cầu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Real Estate Security Policy Modal */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#001f3f] border border-white/15 rounded-3xl max-w-lg w-full p-6 shadow-2xl text-white max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-[#D4AF37] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Quy chế Bảo mật Nguồn hàng BĐS</h3>
                <span className="text-[11px] text-gray-400">Nội quy bắt buộc đối với toàn thể chuyên viên môi giới sàn TRUONG PHAT REAL</span>
              </div>
            </div>

            <div className="space-y-3 text-xs text-gray-300 leading-relaxed">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <div className="font-bold text-white text-xs mb-1">1. Bảo mật thông tin chủ nhà & sổ đỏ</div>
                <p className="text-[11px] text-gray-400">
                  Nghiêm cấm trích xuất, chia sẻ số điện thoại chủ nhà hoặc địa chỉ chính xác cho bên thứ ba khi chưa có sự phê duyệt của Trưởng phòng nguồn hoặc Quản trị viên.
                </p>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <div className="font-bold text-white text-xs mb-1">2. Cơ chế ghi vết thao tác (Audit Logging)</div>
                <p className="text-[11px] text-gray-400">
                  Mọi hành động xem số điện thoại bảo mật, xuất danh sách khách hàng, cập nhật giá hoặc xóa căn đều được hệ thống tự động ghi nhật ký thời gian thực theo mã nhân sự.
                </p>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <div className="font-bold text-white text-xs mb-1">3. Chống trùng nguồn hàng</div>
                <p className="text-[11px] text-gray-400">
                  Mỗi căn BĐS chỉ được quản lý bởi một chuyên viên phụ trách chính để đảm bảo quyền lợi hoa hồng minh bạch và tính chuyên nghiệp của sàn.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-4 mt-2">
              <button
                type="button"
                onClick={() => setShowPolicyModal(false)}
                className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#c49f2c] text-[#001f3f] text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Tôi đã hiểu & Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

