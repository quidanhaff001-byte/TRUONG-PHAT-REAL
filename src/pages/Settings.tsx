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
  MapPin,
  Plus,
  Edit2,
  Search,
  Check,
  X,
} from 'lucide-react';
import { Logo } from '../components/common/Logo';
import { uploadSystemLogo } from '../utils/fileUpload';
import { LocationItem } from '../types';

export const Settings: React.FC = () => {
  const { isFirebaseActive, currentUser, isAdmin } = useAuth();
  const {
    systemSettings,
    updateSystemSettings,
    restoreDefaultLogo,
    resetDemoData,
    locations,
    addLocation,
    updateLocation,
    deleteLocation,
    properties,
    updateProperty,
  } = useData();
  const { success, error, info } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'COMPANY' | 'LOCATIONS' | 'SYSTEM'>('COMPANY');

  // Form states for Parent Company & Brand Info
  const [parentCompanyLegalName, setParentCompanyLegalName] = useState(
    systemSettings.parentCompanyLegalName || 'CÔNG TY TNHH TRƯỜNG PHÁT'
  );
  const [parentCompanyInternationalName, setParentCompanyInternationalName] = useState(
    systemSettings.parentCompanyInternationalName || 'TRUONGPHAT COMPANY LIMITED'
  );
  const [parentCompanyAbbreviation, setParentCompanyAbbreviation] = useState(
    systemSettings.parentCompanyAbbreviation || 'TRUPHACO'
  );
  const [taxId, setTaxId] = useState(systemSettings.taxId || '1700442767');
  const [legalRepresentative, setLegalRepresentative] = useState(
    systemSettings.legalRepresentative || 'Vương Đức Trường'
  );
  const [brandName, setBrandName] = useState(systemSettings.brandName || 'TRƯỜNG PHÁT REAL');
  const [companySlogan, setCompanySlogan] = useState(
    systemSettings.companySlogan || 'Hệ thống quản lý bất động sản nội bộ chuyên nghiệp'
  );
  const [phone, setPhone] = useState(systemSettings.phone || '0297 381 0942');
  const [hotline, setHotline] = useState(systemSettings.hotline || '0888 29 28 29');
  const [address, setAddress] = useState(
    systemSettings.address || 'Số 434A Nguyễn Trung Trực, phường Rạch Giá, tỉnh An Giang'
  );
  const [website, setWebsite] = useState(systemSettings.website || 'https://truongphatreal.vn/');
  const [email, setEmail] = useState(systemSettings.email || 'info.truongphatcompany@gmail.com');
  const [isSaving, setIsSaving] = useState(false);

  // Location Management State
  const [locationSearch, setLocationSearch] = useState('');
  const [filterFormerProvince, setFilterFormerProvince] = useState<'ALL' | 'KIEN_GIANG_OLD' | 'AN_GIANG_OLD'>('ALL');
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocFormerDistrict, setNewLocFormerDistrict] = useState('');
  const [newLocFormerProvince, setNewLocFormerProvince] = useState<'KIEN_GIANG_OLD' | 'AN_GIANG_OLD'>('KIEN_GIANG_OLD');
  const [newLocType, setNewLocType] = useState<'WARD' | 'COMMUNE' | 'SPECIAL_ZONE'>('WARD');
  const [newLocAliases, setNewLocAliases] = useState('');

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
        parentCompanyLegalName: parentCompanyLegalName.trim(),
        parentCompanyInternationalName: parentCompanyInternationalName.trim(),
        parentCompanyAbbreviation: parentCompanyAbbreviation.trim(),
        taxId: taxId.trim(),
        legalRepresentative: legalRepresentative.trim(),
        brandName: brandName.trim(),
        companyName: brandName.trim(),
        companySlogan: companySlogan.trim(),
        phone: phone.trim(),
        hotline: hotline.trim(),
        address: address.trim(),
        website: website.trim(),
        email: email.trim(),
        defaultProvince: 'An Giang',
        operatingScope: 'Toàn tỉnh An Giang mới (bao gồm Kiên Giang cũ)',
        legalFooterText: 'TRƯỜNG PHÁT REAL – Hệ thống quản lý bất động sản thuộc Công ty TNHH Trường Phát',
      });
      success('Lưu thành công', 'Thông tin doanh nghiệp và đơn vị mẹ đã được cập nhật.');
    } catch (err: any) {
      error('Lỗi lưu thông tin', err.message || 'Không thể lưu cài đặt.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Location Creation
  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim() || !newLocFormerDistrict.trim()) {
      error('Thiếu thông tin', 'Vui lòng nhập tên đơn vị hành chính và quận/huyện tương ứng.');
      return;
    }

    try {
      const aliasArray = newLocAliases
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a.length > 0);

      await addLocation({
        provinceCode: 'AN_GIANG_NEW',
        provinceName: 'An Giang',
        formerProvince: newLocFormerProvince,
        administrativeType: newLocType,
        currentName: newLocName.trim(),
        formerDistrictName: newLocFormerDistrict.trim(),
        aliases: [newLocName.trim(), newLocFormerDistrict.trim(), ...aliasArray],
        active: true,
        displayOrder: locations.length + 1,
      });

      setNewLocName('');
      setNewLocFormerDistrict('');
      setNewLocAliases('');
      setIsAddingLocation(false);
    } catch (err: any) {
      error('Lỗi thêm địa bàn', err.message || 'Không thể thêm địa bàn.');
    }
  };

  // Filter locations
  const filteredLocations = locations.filter((loc) => {
    if (filterFormerProvince !== 'ALL' && loc.formerProvince !== filterFormerProvince) {
      return false;
    }
    if (locationSearch.trim()) {
      const q = locationSearch.toLowerCase().trim();
      const matchName = loc.currentName.toLowerCase().includes(q);
      const matchDist = loc.formerDistrictName.toLowerCase().includes(q);
      const matchAlias = loc.aliases.some((a) => a.toLowerCase().includes(q));
      return matchName || matchDist || matchAlias;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Cài đặt & Thông tin Doanh nghiệp
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản trị pháp nhân Công ty TNHH Trường Phát, thương hiệu TRƯỜNG PHÁT REAL và danh mục địa bàn Tỉnh An Giang mới.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('COMPANY')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'COMPANY'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Doanh nghiệp & Nhận diện
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('LOCATIONS')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'LOCATIONS'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-[#b38e22]" />
            <span>Địa bàn ({locations.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SYSTEM')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'SYSTEM'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hạ tầng & Dữ liệu
          </button>
        </div>
      </div>

      {!isAdmin && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-xs text-amber-800">
          <ShieldAlert className="w-5 h-5 text-[#b38e22] shrink-0" />
          <span>
            Bạn đang xem trang Cài đặt với vai trò <strong>{currentUser?.role}</strong> (chế độ chỉ xem). Chỉ Quản trị viên mới có quyền cập nhật thông tin pháp nhân và quản lý danh mục địa bàn.
          </span>
        </div>
      )}

      {/* TAB 1: COMPANY & BRAND */}
      {activeTab === 'COMPANY' && (
        <div className="space-y-6">
          {/* Logo Card */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#b38e22]" />
                Nhận diện thương hiệu TRƯỜNG PHÁT REAL
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
                    <li>Tự động lưu trữ an toàn trên <strong>Firebase Storage</strong>.</li>
                    <li>Nếu chưa tải logo, hệ thống duy trì biểu tượng <strong>TP nền vàng</strong> nguyên bản.</li>
                  </ul>
                </div>

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

          {/* Legal Parent Company & Business Entity Profile */}
          <form onSubmit={handleSaveCompanyInfo} className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building className="w-4 h-4 text-[#b38e22]" />
                  Thông tin Pháp lý Công ty Mẹ & Thương hiệu
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Phân định rõ vai trò Công ty TNHH Trường Phát (Công ty Mẹ / Chủ đầu tư) và TRƯỜNG PHÁT REAL (Thương hiệu BĐS).
                </p>
              </div>

              {isAdmin && (
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-[#001f3f] hover:bg-[#002b59] text-[#D4AF37] font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5" />}
                  <span>Lưu thông tin pháp lý</span>
                </button>
              )}
            </div>

            {/* Section I: Parent Company Legal Information */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider text-[#b38e22] flex items-center gap-1.5">
                <span>I. Thông tin Công ty Mẹ (Chủ đầu tư)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tên pháp lý</label>
                  <input
                    type="text"
                    value={parentCompanyLegalName}
                    onChange={(e) => setParentCompanyLegalName(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-[#D4AF37]/50"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tên quốc tế</label>
                  <input
                    type="text"
                    value={parentCompanyInternationalName}
                    onChange={(e) => setParentCompanyInternationalName(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-[#D4AF37]/50"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tên viết tắt</label>
                  <input
                    type="text"
                    value={parentCompanyAbbreviation}
                    onChange={(e) => setParentCompanyAbbreviation(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-[#D4AF37]/50"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã số thuế</label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-[#001f3f] focus:ring-2 focus:ring-[#D4AF37]/50"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Người đại diện pháp luật</label>
                  <input
                    type="text"
                    value={legalRepresentative}
                    onChange={(e) => setLegalRepresentative(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-[#D4AF37]/50"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Điện thoại cố định</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:ring-2 focus:ring-[#D4AF37]/50"
                  />
                </div>
              </div>
            </div>

            {/* Section II: Brand & Operating Scope */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider text-[#b38e22] flex items-center gap-1.5">
                <span>II. Thương hiệu Bất Động Sản & Địa bàn hoạt động</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Thương hiệu BĐS</label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[#001f3f] focus:ring-2 focus:ring-[#D4AF37]/50"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hotline Bất Động Sản</label>
                  <input
                    type="text"
                    value={hotline}
                    onChange={(e) => setHotline(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-amber-700 focus:ring-2 focus:ring-[#D4AF37]/50"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email liên hệ BĐS</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-[#D4AF37]/50"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Website chính thức</label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-blue-700 font-medium focus:ring-2 focus:ring-[#D4AF37]/50"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tỉnh / Thành phố mặc định</label>
                  <input
                    type="text"
                    value="An Giang"
                    disabled
                    className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phạm vi địa bàn hoạt động</label>
                  <input
                    type="text"
                    value="Toàn tỉnh An Giang mới (bao gồm Kiên Giang cũ)"
                    disabled
                    className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 text-xs cursor-not-allowed"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block font-semibold text-slate-700 mb-1">Địa chỉ trụ sở công ty</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-[#D4AF37]/50"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block font-semibold text-slate-700 mb-1">Khẩu hiệu / Giới thiệu hệ thống</label>
                  <input
                    type="text"
                    value={companySlogan}
                    onChange={(e) => setCompanySlogan(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-[#D4AF37]/50"
                  />
                </div>
              </div>
            </div>

            {/* Note box */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
              <strong>Ghi chú hệ thống:</strong> TRƯỜNG PHÁT REAL là thương hiệu bất động sản thuộc hệ sinh thái của <strong>Công ty TNHH Trường Phát</strong>. Tất cả hợp đồng, giao dịch và phân quyền nhân sự được đồng bộ tự động theo thông tin pháp nhân trên.
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: LOCATIONS MANAGEMENT */}
      {activeTab === 'LOCATIONS' && (
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#b38e22]" />
                Danh mục Địa bàn Hoạt động (Tỉnh An Giang Mới)
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Cơ sở dữ liệu các đơn vị hành chính bao gồm khu vực Kiên Giang cũ và An Giang cũ, hỗ trợ tìm kiếm theo tên cũ và bí danh.
              </p>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsAddingLocation(!isAddingLocation)}
                className="px-3.5 py-2 bg-[#D4AF37] hover:bg-[#c49f2c] text-[#00172e] font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm địa bàn mới</span>
              </button>
            )}
          </div>

          {/* New Location Form */}
          {isAddingLocation && isAdmin && (
            <form onSubmit={handleCreateLocation} className="p-4 bg-slate-50 border border-amber-200 rounded-xl space-y-4">
              <div className="font-bold text-xs text-slate-900 flex items-center justify-between">
                <span>Thêm đơn vị hành chính / địa bàn mới</span>
                <button
                  type="button"
                  onClick={() => setIsAddingLocation(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tên hiển thị hiện tại</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Xã An Minh (Ấp 2)"
                    value={newLocName}
                    onChange={(e) => setNewLocName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quận / Huyện / TP cũ</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Huyện An Minh"
                    value={newLocFormerDistrict}
                    onChange={(e) => setNewLocFormerDistrict(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nguồn gốc địa giới</label>
                  <select
                    value={newLocFormerProvince}
                    onChange={(e) => setNewLocFormerProvince(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                  >
                    <option value="KIEN_GIANG_OLD">Khu vực Kiên Giang cũ</option>
                    <option value="AN_GIANG_OLD">Khu vực An Giang cũ</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Loại hình hành chính</label>
                  <select
                    value={newLocType}
                    onChange={(e) => setNewLocType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                  >
                    <option value="WARD">Phường</option>
                    <option value="COMMUNE">Xã / Thị trấn</option>
                    <option value="SPECIAL_ZONE">Đặc khu / TP đảo</option>
                  </select>
                </div>

                <div className="sm:col-span-2 lg:col-span-4">
                  <label className="block font-semibold text-slate-700 mb-1">Bí danh tìm kiếm (cách nhau bằng dấu phẩy)</label>
                  <input
                    type="text"
                    placeholder="VD: An Minh Town, An Minh Center, Thứ 11, Ấp 2 An Minh"
                    value={newLocAliases}
                    onChange={(e) => setNewLocAliases(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingLocation(false)}
                  className="px-3.5 py-1.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#001f3f] text-[#D4AF37] text-xs font-bold rounded-lg"
                >
                  Lưu địa bàn
                </button>
              </div>
            </form>
          )}

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm theo tên mới, tên cũ, bí danh..."
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#D4AF37]/50"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setFilterFormerProvince('ALL')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  filterFormerProvince === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả ({locations.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterFormerProvince('KIEN_GIANG_OLD')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  filterFormerProvince === 'KIEN_GIANG_OLD'
                    ? 'bg-[#001f3f] text-[#D4AF37]'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Kiên Giang cũ ({locations.filter((l) => l.formerProvince === 'KIEN_GIANG_OLD').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterFormerProvince('AN_GIANG_OLD')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  filterFormerProvince === 'AN_GIANG_OLD'
                    ? 'bg-[#001f3f] text-[#D4AF37]'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                An Giang cũ ({locations.filter((l) => l.formerProvince === 'AN_GIANG_OLD').length})
              </button>
            </div>
          </div>

          {/* Locations Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[460px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="p-3">Tên Đơn vị hành chính</th>
                    <th className="p-3">Quận/Huyện cũ</th>
                    <th className="p-3">Khu vực</th>
                    <th className="p-3">Loại hình</th>
                    <th className="p-3">Bí danh tìm kiếm</th>
                    <th className="p-3 text-center">Trạng thái</th>
                    {isAdmin && <th className="p-3 text-right">Thao tác</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLocations.map((loc) => (
                    <tr key={loc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{loc.currentName}</td>
                      <td className="p-3 text-slate-600">{loc.formerDistrictName}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            loc.formerProvince === 'KIEN_GIANG_OLD'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {loc.formerProvince === 'KIEN_GIANG_OLD' ? 'Kiên Giang cũ' : 'An Giang cũ'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-[11px] text-slate-500 font-medium">
                          {loc.administrativeType === 'SPECIAL_ZONE'
                            ? 'Đặc khu'
                            : loc.administrativeType === 'WARD'
                            ? 'Phường'
                            : 'Xã/Thị trấn'}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-slate-500 max-w-xs truncate">
                        {loc.aliases?.slice(0, 3).join(', ')}
                        {loc.aliases?.length > 3 && ` (+${loc.aliases.length - 3})`}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${
                            loc.active ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                          title={loc.active ? 'Đang hoạt động' : 'Tạm ẩn'}
                        />
                      </td>
                      {isAdmin && (
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => updateLocation(loc.id, { active: !loc.active })}
                            className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                          >
                            {loc.active ? 'Tắt' : 'Bật'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {filteredLocations.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className="p-8 text-center text-slate-400">
                        Không tìm thấy địa bàn phù hợp với từ khóa tìm kiếm.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SYSTEM & DATABASE */}
      {activeTab === 'SYSTEM' && (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-[#b38e22]" />
                Trạng thái Cơ sở dữ liệu Cloud Firestore
              </h2>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  isFirebaseActive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {isFirebaseActive ? 'Firebase Đang hoạt động' : 'Chế độ Cục bộ'}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Hệ thống TRƯỜNG PHÁT REAL được kết nối trực tiếp với Firebase Authentication và Cloud Firestore, lưu trữ bảo mật danh mục bất động sản, khách hàng, giao dịch, hợp đồng và hoa hồng trên địa bàn Tỉnh An Giang mới.
            </p>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Phân quyền bảo mật:</span>
                <span className="font-semibold text-slate-800">RBAC Custom Claims (ADMIN, TEAM_LEADER, AGENT)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cơ sở dữ liệu Firestore:</span>
                <span className="font-semibold text-slate-800">settings, locations, properties, customers, transactions...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Quy tắc bảo mật Rules:</span>
                <span className="font-semibold text-emerald-700">firestore.rules đã kích hoạt chặt chẽ</span>
              </div>
            </div>

            {isAdmin && (
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('Chạy chuẩn hóa tự động toàn bộ địa bàn các BĐS về Tỉnh An Giang mới (bao gồm Kiên Giang cũ)? Dữ liệu không khớp sẽ được gắn cờ CẦN KIỂM TRA (NEEDS_REVIEW) chứ không bị xóa.')) {
                      try {
                        const { migratePropertiesToNewLocations } = await import('../utils/dataMigration');
                        const result = migratePropertiesToNewLocations(properties, locations);
                        for (const p of result.updatedProperties) {
                          await updateProperty(p.id, p);
                        }
                        success(
                          'Chuẩn hóa địa bàn hoàn tất',
                          `Đã xử lý: ${result.totalProcessed} BĐS. Khớp chuẩn: ${result.migratedCount}. Cần rà soát: ${result.needsReviewCount}.`
                        );
                      } catch (err: any) {
                        error('Lỗi chuẩn hóa', err?.message || 'Có lỗi xảy ra trong quá trình chuẩn hóa.');
                      }
                    }
                  }}
                  className="px-4 py-2 bg-[#001f3f] hover:bg-[#002b59] text-[#D4AF37] text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <MapPin className="w-4 h-4 text-[#D4AF37]" />
                  <span>Chuẩn hóa địa bàn BĐS (Migration Tool)</span>
                </button>

                <button
                  type="button"
                  onClick={resetDemoData}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-[#b38e22]" />
                  <span>Nạp lại bộ dữ liệu chuẩn An Giang & Kiên Giang</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
