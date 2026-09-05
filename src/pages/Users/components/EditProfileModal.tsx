import React, { useState, useRef } from 'react';
import { User, Team, CustomRole, WorkStatus } from '../../../types';
import { getRoleDisplayName } from '../../../constants/permissions';
import { adminUpdateUserApi } from '../../../services/adminAuthService';
import { uploadUserAvatar } from '../../../utils/fileUpload';
import { useToast } from '../../../context/ToastContext';
import {
  X,
  User as UserIcon,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Building,
  Users,
  Shield,
  Activity,
  FileText,
  Camera,
  Loader2,
  Check,
} from 'lucide-react';

interface EditProfileModalProps {
  user: User;
  teams: Team[];
  customRoles: CustomRole[];
  onClose: () => void;
  onSuccess: (updatedUser: User) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  user,
  teams,
  customRoles,
  onClose,
  onSuccess,
}) => {
  const { success, error } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    fullName: user.fullName || user.displayName || '',
    phone: user.phone || '',
    email: user.email || '',
    avatarUrl: user.avatarUrl || '',
    dateOfBirth: user.dateOfBirth || '',
    address: user.address || '',
    department: user.department || '',
    teamId: user.teamId || '',
    role: user.role || 'AGENT',
    roleName: user.roleName || '',
    workStatus: (user.workStatus || (user.status === 'LOCKED' ? 'RESIGNED' : 'ACTIVE')) as WorkStatus,
    notes: user.notes || '',
  });

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      const url = await uploadUserAvatar(user.id, file);
      setFormData((prev) => ({ ...prev, avatarUrl: url }));
      success('Tải ảnh thành công', 'Ảnh đại diện mới đã được sẵn sàng lưu.');
    } catch (err: any) {
      error('Lỗi tải ảnh', err.message || 'Không thể tải ảnh đại diện lên máy chủ.');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRoleChange = (selectedRoleCode: string) => {
    const foundRole = customRoles.find((r) => r.code === selectedRoleCode);
    const displayName = foundRole ? foundRole.name : getRoleDisplayName(selectedRoleCode);
    setFormData((prev) => ({
      ...prev,
      role: selectedRoleCode,
      roleName: displayName,
    }));
  };

  const handleTeamChange = (selectedTeamId: string) => {
    const foundTeam = teams.find((t) => t.id === selectedTeamId);
    setFormData((prev) => ({
      ...prev,
      teamId: selectedTeamId,
      teamName: foundTeam ? foundTeam.name : '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      error('Thiếu thông tin', 'Vui lòng nhập họ và tên nhân sự.');
      return;
    }
    if (!formData.email.trim()) {
      error('Thiếu thông tin', 'Vui lòng nhập email nhân sự.');
      return;
    }

    try {
      setIsSubmitting(true);

      const targetTeam = teams.find((t) => t.id === formData.teamId);
      const teamName = targetTeam ? targetTeam.name : '';

      // Prepare payload with null for empty fields to maintain clean Firestore documents
      const payload = {
        uid: user.id,
        fullName: formData.fullName.trim(),
        displayName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        avatarUrl: formData.avatarUrl.trim() || undefined,
        dateOfBirth: formData.dateOfBirth.trim() || undefined,
        address: formData.address.trim() || undefined,
        department: formData.department.trim() || undefined,
        teamId: formData.teamId || null,
        teamName: teamName || '',
        role: formData.role,
        roleName: formData.roleName || getRoleDisplayName(formData.role),
        workStatus: formData.workStatus,
        status: formData.workStatus === 'RESIGNED' ? ('LOCKED' as const) : ('ACTIVE' as const),
        notes: formData.notes.trim() || undefined,
      };

      const result = await adminUpdateUserApi(payload);

      if (result.success) {
        success('Cập nhật thành công', `Hồ sơ nhân viên ${formData.fullName} đã được lưu.`);
        const updatedUser: User = {
          ...user,
          ...payload,
          teamId: payload.teamId || undefined,
        };
        onSuccess(updatedUser);
        onClose();
      } else {
        error('Cập nhật thất bại', result.message || 'Không thể cập nhật hồ sơ.');
      }
    } catch (err: any) {
      console.error('Update profile error:', err);
      error('Lỗi cập nhật', err.message || 'Có lỗi xảy ra khi lưu thông tin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#001f3f] text-[#D4AF37]">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#001f3f]">CHỈNH SỬA HỒ SƠ NHÂN SỰ</h3>
              <p className="text-xs text-slate-500">
                Mã NV: <span className="font-bold text-slate-700">{user.employeeCode || user.id}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 mt-4 space-y-4">
          {/* Avatar Section */}
          <div className="flex items-center gap-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="relative group">
              <img
                src={formData.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.fullName || 'User')}&background=001f3f&color=D4AF37`}
                alt={formData.fullName}
                className="w-16 h-16 rounded-full object-cover border-2 border-[#D4AF37] shadow-xs"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar || isSubmitting}
                className="absolute inset-0 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Thay đổi ảnh đại diện"
              >
                {isUploadingAvatar ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
              </button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarFileChange}
              accept="image/*"
              className="hidden"
            />
            <div className="flex-1">
              <div className="text-xs font-bold text-slate-800">Ảnh đại diện nhân viên</div>
              <div className="text-[11px] text-slate-500 mb-2">Hỗ trợ JPG, PNG, WEBP (tối đa 5MB)</div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar || isSubmitting}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
              >
                {isUploadingAvatar ? 'Đang tải lên...' : 'Chọn ảnh mới'}
              </button>
            </div>
          </div>

          {/* Grid fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Họ tên */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>Họ và tên *</span>
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#001f3f]"
                placeholder="Nguyễn Văn A"
              />
            </div>

            {/* Số điện thoại */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Số điện thoại</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#001f3f]"
                placeholder="0912345678"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Email tài khoản *</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#001f3f]"
                placeholder="nhanvien@truongphatreal.com"
              />
            </div>

            {/* Ngày sinh */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Ngày sinh</span>
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#001f3f]"
              />
            </div>

            {/* Địa chỉ */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Địa chỉ liên hệ</span>
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#001f3f]"
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..."
              />
            </div>

            {/* Phòng / Ban */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>Phòng / Ban làm việc</span>
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#001f3f]"
                placeholder="Phòng Kinh Doanh 1, Khối Dự Án..."
              />
            </div>

            {/* Nhóm làm việc */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>Nhóm kinh doanh (Team)</span>
              </label>
              <select
                value={formData.teamId}
                onChange={(e) => handleTeamChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#001f3f]"
              >
                <option value="">-- Chưa phân nhóm --</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Chức vụ */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span>Chức vụ</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#001f3f]"
              >
                {customRoles.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name} ({r.code})
                  </option>
                ))}
                {/* Fallback if user's role is not yet in customRoles list */}
                {!customRoles.some((r) => r.code === formData.role) && (
                  <option value={formData.role}>
                    {formData.roleName || getRoleDisplayName(formData.role)} ({formData.role})
                  </option>
                )}
              </select>
            </div>

            {/* Trạng thái làm việc */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-slate-400" />
                <span>Trạng thái làm việc *</span>
              </label>
              <select
                value={formData.workStatus}
                onChange={(e) => setFormData({ ...formData, workStatus: e.target.value as WorkStatus })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#001f3f]"
              >
                <option value="ACTIVE" className="text-emerald-600 font-bold">
                  🟢 Đang hoạt động
                </option>
                <option value="ON_LEAVE" className="text-amber-600 font-bold">
                  🟡 Tạm nghỉ
                </option>
                <option value="RESIGNED" className="text-rose-600 font-bold">
                  🔴 Nghỉ việc (Khóa truy cập)
                </option>
              </select>
            </div>

            {/* Ghi chú nội bộ */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Ghi chú nội bộ (Chỉ Quản trị viên nhìn thấy)</span>
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#001f3f]"
                placeholder="Nhập các ghi chú quản lý, quá trình công tác, hợp đồng..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#001f3f] text-[#D4AF37] font-bold text-xs hover:bg-[#002b55] cursor-pointer shadow-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu dữ liệu...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Lưu thay đổi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
