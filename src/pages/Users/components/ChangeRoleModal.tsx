import React, { useState } from 'react';
import { User, CustomRole } from '../../../types';
import { getRoleDisplayName } from '../../../constants/permissions';
import { adminChangeRoleApi } from '../../../services/adminAuthService';
import { useToast } from '../../../context/ToastContext';
import {
  X,
  Shield,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Check,
  Lock,
} from 'lucide-react';

interface ChangeRoleModalProps {
  user: User;
  customRoles: CustomRole[];
  onClose: () => void;
  onSuccess: (updatedUser: User) => void;
}

export const ChangeRoleModal: React.FC<ChangeRoleModalProps> = ({
  user,
  customRoles,
  onClose,
  onSuccess,
}) => {
  const { success, error } = useToast();
  const currentRoleCode = user.role || 'AGENT';
  const currentRoleDisplayName = user.roleName || getRoleDisplayName(currentRoleCode);

  const [selectedRoleCode, setSelectedRoleCode] = useState<string>(currentRoleCode);
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const targetRole = customRoles.find((r) => r.code === selectedRoleCode);
  const newRoleDisplayName = targetRole ? targetRole.name : getRoleDisplayName(selectedRoleCode);

  const isSameRole = selectedRoleCode === currentRoleCode;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSameRole) {
      error('Chức vụ không đổi', 'Vui lòng chọn một chức vụ khác với chức vụ hiện tại.');
      return;
    }

    if (!reason.trim()) {
      error('Thiếu lý do', 'Vui lòng nhập lý do luân chuyển chức vụ để ghi nhật ký hệ thống.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await adminChangeRoleApi({
        uid: user.id,
        newRole: selectedRoleCode,
        newRoleName: newRoleDisplayName,
        reason: reason.trim(),
      });

      if (res.success) {
        success(
          'Luân chuyển thành công',
          `Đã chuyển chức vụ cho ${user.fullName}: ${currentRoleDisplayName} ➔ ${newRoleDisplayName}.`
        );
        const updatedUser: User = {
          ...user,
          role: selectedRoleCode,
          roleName: newRoleDisplayName,
          roleHistory: res.roleHistory || user.roleHistory,
        };
        onSuccess(updatedUser);
        onClose();
      } else {
        error('Luân chuyển thất bại', res.message || 'Không thể thay đổi chức vụ.');
      }
    } catch (err: any) {
      console.error('Change role error:', err);
      error('Lỗi phân quyền', err.message || 'Có lỗi xảy ra khi luân chuyển chức vụ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#001f3f]">LUÂN CHUYỂN CHỨC VỤ</h3>
              <p className="text-xs text-slate-500">
                Nhân sự: <span className="font-bold text-slate-800">{user.fullName}</span> ({user.employeeCode || user.id})
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
          {/* Transition Display */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
            <div className="text-left">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Chức vụ hiện tại
              </div>
              <div className="px-3 py-1.5 bg-slate-200 text-slate-800 font-bold text-xs rounded-xl inline-block">
                {currentRoleDisplayName}
              </div>
            </div>

            <ArrowRight className="w-5 h-5 text-indigo-500 shrink-0 mx-2" />

            <div className="text-right">
              <div className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wider mb-1">
                Chức vụ mới
              </div>
              <div className="px-3 py-1.5 bg-indigo-100 text-indigo-900 font-bold text-xs rounded-xl inline-block">
                {newRoleDisplayName}
              </div>
            </div>
          </div>

          {/* Select New Role */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>Chọn chức vụ mới cần bổ nhiệm / điều chuyển *</span>
            </label>
            <select
              value={selectedRoleCode}
              onChange={(e) => setSelectedRoleCode(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#001f3f]"
            >
              {customRoles.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name} ({r.code}) {r.description ? `– ${r.description}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Lý do luân chuyển chức vụ *</span>
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: Bổ nhiệm Trưởng nhóm Kinh doanh theo quyết định QĐ-2026/09; Luân chuyển phòng ban theo đề bạt..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#001f3f]"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Lý do này sẽ được lưu cố định vào lịch sử chức vụ và nhật ký kiểm toán hệ thống (Audit Log).
            </p>
          </div>

          {/* Guarantee Data Preservation Notice */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-bold">Cam kết bảo lưu dữ liệu tuyệt đối: </span>
              Khi luân chuyển chức vụ, toàn bộ khách hàng, lịch sử chăm sóc, giao dịch, nguồn hàng đã đăng và nhật ký hoạt động của nhân sự được giữ nguyên 100%.
            </div>
          </div>

          {/* Last admin warning */}
          {currentRoleCode === 'ADMIN' && selectedRoleCode !== 'ADMIN' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2 text-amber-900 text-[11px]">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Cảnh báo:</strong> Nếu đây là Quản trị viên cuối cùng của hệ thống, thao tác hạ quyền sẽ bị hệ thống tự động chặn để đảm bảo an toàn vận hành.
              </span>
            </div>
          )}

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
              disabled={isSubmitting || isSameRole}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#001f3f] text-[#D4AF37] font-bold text-xs hover:bg-[#002b55] cursor-pointer shadow-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang cập nhật...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Xác nhận luân chuyển</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
