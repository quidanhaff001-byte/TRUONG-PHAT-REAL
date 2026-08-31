import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import {
  Settings as SettingsIcon,
  Database,
  Shield,
  RotateCcw,
  Building,
  Key,
  Globe,
  Bell,
  CheckCircle2,
  Upload,
  Image as ImageIcon,
  Trash2,
  Info,
  ShieldAlert,
  Loader2,
  FileCheck,
} from 'lucide-react';
import { Logo } from '../components/common/Logo';
import { uploadSystemLogo } from '../utils/fileUpload';

export const Settings: React.FC = () => {
  const { isFirebaseActive, currentUser, isAdmin } = useAuth();
  const { systemSettings, updateSystemSettings, restoreDefaultLogo, resetDemoData } = useData();
  const { success, error, info } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Form states for company info
  const [companyName, setCompanyName] = useState(systemSettings.companyName || 'TRUONG PHAT REAL');
  const [companySlogan, setCompanySlogan] = useState(systemSettings.companySlogan || 'Hệ thống quản lý bất động sản nội bộ');
  const [hotline, setHotline] = useState(systemSettings.hotline || '0919 414 884');
  const [address, setAddress] = useState(systemSettings.address || 'Số 68 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh & Chi nhánh An Giang');
  const [website, setWebsite] = useState(systemSettings.website || 'https://truongphatreal.vn');
  const [email, setEmail] = useState(systemSettings.email || 'quidanh.aff001@gmail.com');
  const [isSaving, setIsSaving] = useState(false);

  // Logo file selection and upload
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAdmin) {
      error('Không có quyền', 'Chỉ Quản trị viên mới có quyền thay đổi logo hệ thống.');
      return;
    }

    try {
      setIsUploadingLogo(true);
      setUploadProgress(10);

      const downloadUrl = await uploadSystemLogo(file, (p) => setUploadProgress(p));
      await updateSystemSettings({ logoUrl: downloadUrl });

      success('Tải logo thành công', 'Logo mới đã được cập nhật đồng bộ toàn hệ thống.');
    } catch (err: any) {
      console.error('Logo upload error:', err);
      error('Lỗi tải logo', err.message || 'Không thể tải logo lên hệ thống. Vui lòng kiểm tra lại.');
    } finally {
      setIsUploadingLogo(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRestoreLogo = async () => {
    if (!isAdmin) {
      error('Không có quyền', 'Chỉ Quản trị viên mới có quyền khôi phục logo.');
      return;
    }
    if (window.confirm('Bạn có chắc chắn muốn khôi phục logo mặc định TP nền vàng không?')) {
      await restoreDefaultLogo();
    }
  };

  const handleSaveCompanyInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      error('Không có quyền', 'Chỉ Quản trị viên mới có quyền cập nhật thông tin doanh nghiệp.');
      return;
    }

    setIsSaving(true);
    try {
      await updateSystemSettings({
        companyName: companyName.trim(),
        companySlogan: companySlogan.trim(),
        hotline: hotline.trim(),
        address: address.trim(),
        website: website.trim(),
        email: email.trim(),
      });
      success('Lưu thành công', 'Thông tin doanh nghiệp đã được cập nhật.');
    } catch (err: any) {
      error('Lỗi lưu thông tin', err.message || 'Không thể lưu cài đặt.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Cài đặt hệ thống & Nhận diện thương hiệu
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Quản lý logo đồng bộ, thông tin doanh nghiệp TRUONG PHAT REAL và kết nối lưu trữ Cloud Firestore.
        </p>
      </div>

      {!isAdmin && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-xs text-amber-800">
          <ShieldAlert className="w-5 h-5 text-[#b38e22] shrink-0" />
          <span>
            Bạn đang xem trang Cài đặt với vai trò <strong>{currentUser?.role}</strong> (chỉ xem). Chức năng tải logo và sửa thông tin công ty chỉ dành cho Quản trị viên.
          </span>
        </div>
      )}

      <div className="space-y-6">
        {/* 1. LOGO HỆ THỐNG MANAGEMENT */}
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#b38e22]" />
              Logo hệ thống TRUONG PHAT REAL
            </h2>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              {systemSettings.logoUrl ? 'Đang dùng Logo tùy chỉnh' : 'Đang dùng Biểu tượng TP vàng mặc định'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Live Preview Box */}
            <div className="md:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-900 rounded-2xl border border-slate-800 text-center space-y-3">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Xem trước nhận diện
              </div>
              <Logo variant="login" showText={true} />
              <div className="text-[11px] text-[#D4AF37] font-medium pt-2 border-t border-slate-800 w-full">
                Hiển thị đồng nhất: Đăng nhập • Sidebar • Báo cáo • Header
              </div>
            </div>

            {/* Actions & Format Guidance */}
            <div className="md:col-span-7 space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-[#b38e22]" />
                  Quy chuẩn tệp logo tải lên:
                </div>
                <ul className="list-disc list-inside text-slate-600 space-y-1 text-[11px] leading-relaxed">
                  <li>Định dạng hỗ trợ an toàn: <strong>PNG, JPG, WEBP, SVG</strong>.</li>
                  <li>Dung lượng tệp tối đa: <strong>2 MB</strong>.</li>
                  <li>Tự động lưu trữ an toàn trên <strong>Firebase Storage</strong> và liên kết Firestore.</li>
                  <li>Nếu chưa tải logo, hệ thống duy trì biểu tượng <strong>TP nền vàng</strong> nguyên bản.</li>
                </ul>
              </div>

              {/* Progress bar */}
              {isUploadingLogo && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#b38e22]" />
                      Đang xử lý và tải logo lên Firebase Storage...
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#D4AF37] to-[#b38e22] transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoFileChange}
                  className="hidden"
                  disabled={!isAdmin || isUploadingLogo}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!isAdmin || isUploadingLogo}
                  className="px-4 py-2.5 bg-[#D4AF37] hover:bg-[#c49f2c] active:scale-[0.99] text-[#00172e] text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>{systemSettings.logoUrl ? 'Thay đổi logo mới' : 'Tải logo hệ thống (Max 2MB)'}</span>
                </button>

                {systemSettings.logoUrl && (
                  <button
                    type="button"
                    onClick={handleRestoreLogo}
                    disabled={!isAdmin || isUploadingLogo}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Khôi phục logo mặc định</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2. COMPANY PROFILE & CONTACT SETTINGS */}
        <form onSubmit={handleSaveCompanyInfo} className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-[#b38e22]" />
              Thông tin đơn vị & Liên hệ
            </h2>
            {isAdmin && (
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-[#001f3f] hover:bg-[#002b59] text-[#D4AF37] font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5" />}
                <span>Lưu thông tin</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tên thương hiệu công ty</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={!isAdmin}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Khẩu hiệu / Mô tả ngắn</label>
              <input
                type="text"
                value={companySlogan}
                onChange={(e) => setCompanySlogan(e.target.value)}
                disabled={!isAdmin}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hotline Kỹ thuật & Hỗ trợ</label>
              <input
                type="text"
                value={hotline}
                onChange={(e) => setHotline(e.target.value)}
                disabled={!isAdmin}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-[#001f3f] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email liên hệ hệ thống</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!isAdmin}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Địa chỉ trụ sở & Chi nhánh</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={!isAdmin}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
              />
            </div>
          </div>
        </form>

        {/* 3. Database & Cloud Connection Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-[#b38e22]" />
              Trạng thái Cơ sở dữ liệu & Lưu trữ đám mây
            </h2>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                isFirebaseActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {isFirebaseActive ? 'Firebase Đang hoạt động' : 'Chế độ Demo / Cục bộ'}
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Hệ thống TRUONG PHAT REAL được kiến trúc để hoạt động mượt mà cả khi chưa kết nối Firebase (với LocalStorage Cache + Dữ liệu mẫu thực tế An Giang) lẫn khi kết nối Firebase Firestore & Storage.
          </p>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Dịch vụ xác thực:</span>
              <span className="font-semibold text-slate-800">Firebase Auth / Multi-tenant RBAC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cơ sở dữ liệu Realtime:</span>
              <span className="font-semibold text-slate-800">Cloud Firestore (settings, properties, users, teams)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Lưu trữ hình ảnh & Logo:</span>
              <span className="font-semibold text-slate-800">Firebase Cloud Storage + Nén Client an toàn</span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={resetDemoData}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-[#b38e22]" />
              <span>Nạp lại bộ dữ liệu mẫu chuẩn An Giang</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

