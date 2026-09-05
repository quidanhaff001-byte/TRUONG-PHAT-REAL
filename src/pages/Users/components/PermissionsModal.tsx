import React, { useState, useMemo } from 'react';
import { User, CustomRole } from '../../../types';
import {
  PERMISSION_GROUPS,
  hasUserPermission,
  getRoleDisplayName,
} from '../../../constants/permissions';
import { adminSetUserPermissionsApi } from '../../../services/adminAuthService';
import { useToast } from '../../../context/ToastContext';
import {
  X,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  Lock,
  Unlock,
  AlertCircle,
  Loader2,
  Check,
  Search,
} from 'lucide-react';

interface PermissionsModalProps {
  user: User;
  customRoles: CustomRole[];
  onClose: () => void;
  onSuccess: (updatedUser: User) => void;
}

export const PermissionsModal: React.FC<PermissionsModalProps> = ({
  user,
  customRoles,
  onClose,
  onSuccess,
}) => {
  const { success, error } = useToast();

  // Find user's role configuration
  const userRole = useMemo(() => {
    return customRoles.find((r) => r.code === user.role);
  }, [customRoles, user.role]);

  // Current custom overrides: record of permissionKey -> boolean
  const [overrides, setOverrides] = useState<Record<string, boolean>>(
    user.customPermissions || {}
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Compute effective permission for a key:
  // 1. Overrides takes precedence
  // 2. Role defaults if no override
  const getPermissionState = (permKey: string): { effective: boolean; isOverridden: boolean } => {
    if (overrides[permKey] !== undefined) {
      return { effective: overrides[permKey], isOverridden: true };
    }
    // Calculate default from role
    const mockUser: User = { ...user, customPermissions: undefined };
    const defaultAllowed = hasUserPermission(mockUser, permKey, customRoles);
    return { effective: defaultAllowed, isOverridden: false };
  };

  const handleToggle = (permKey: string) => {
    const currentState = getPermissionState(permKey);
    setOverrides((prev) => ({
      ...prev,
      [permKey]: !currentState.effective,
    }));
  };

  const handleResetToRoleDefault = (permKey: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[permKey];
      return next;
    });
  };

  const handleResetAllToRoleDefaults = () => {
    setOverrides({});
  };

  // Filter groups according to search
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return PERMISSION_GROUPS;
    const q = searchQuery.toLowerCase();
    return PERMISSION_GROUPS.map((group) => {
      const matchedPerms = group.items.filter(
        (p) =>
          p.label.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.key.toLowerCase().includes(q)
      );
      return {
        ...group,
        items: matchedPerms,
      };
    }).filter((g) => g.items.length > 0);
  }, [searchQuery]);

  const overrideCount = Object.keys(overrides).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await adminSetUserPermissionsApi({
        uid: user.id,
        customPermissions: overrides,
      });

      if (res.success) {
        success(
          'Phân quyền thành công',
          `Đã cập nhật phân quyền riêng cho ${user.fullName} (${overrideCount} quyền tùy biến).`
        );
        const updatedUser: User = {
          ...user,
          customPermissions: overrides,
        };
        onSuccess(updatedUser);
        onClose();
      } else {
        error('Phân quyền thất bại', res.message || 'Không thể lưu phân quyền.');
      }
    } catch (err: any) {
      console.error('Set permissions error:', err);
      error('Lỗi phân quyền', err.message || 'Có lỗi xảy ra khi cập nhật phân quyền.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#001f3f]">
                PHÂN QUYỀN RIÊNG CHO NHÂN SỰ
              </h3>
              <p className="text-xs text-slate-500">
                Nhân viên: <span className="font-bold text-slate-800">{user.fullName}</span> | Chức vụ:{' '}
                <span className="font-semibold text-emerald-700">
                  {user.roleName || getRoleDisplayName(user.role)}
                </span>
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

        {/* Explain Banner */}
        <div className="mt-3.5 p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-2.5 text-blue-900 text-xs">
          <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="leading-relaxed">
            <span className="font-bold">Cơ chế phân quyền ưu tiên: </span>
            Quyền riêng của từng nhân sự được ưu tiên cao hơn quyền mặc định của chức vụ. Bạn có thể
            cấp thêm quyền hoặc chặn bớt quyền đối với từng nhân viên cụ thể mà không làm ảnh hưởng
            đến các nhân sự khác cùng chức vụ.
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="mt-3 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm quyền hạn (khách hàng, nguồn hàng, hoa hồng, giao dịch...)"
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#001f3f]"
            />
          </div>

          {overrideCount > 0 && (
            <button
              type="button"
              onClick={handleResetAllToRoleDefaults}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors shrink-0"
              title="Khôi phục toàn bộ quyền theo chức vụ"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Khôi phục theo chức vụ ({overrideCount})</span>
            </button>
          )}
        </div>

        {/* Permission Groups List */}
        <div className="flex-1 overflow-y-auto pr-1 mt-4 space-y-4">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Không tìm thấy quyền hạn nào phù hợp từ khóa.</p>
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div
                key={group.id}
                className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                    <span>{group.name}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {group.items.length} quyền
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {group.items.map((perm) => {
                    const state = getPermissionState(perm.key);

                    return (
                      <div
                        key={perm.key}
                        className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                          state.effective
                            ? 'bg-white border-emerald-200 shadow-xs'
                            : 'bg-white/60 border-slate-200 opacity-80'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            id={`perm_${perm.key}`}
                            checked={state.effective}
                            onChange={() => handleToggle(perm.key)}
                            className="mt-0.5 w-4 h-4 rounded-md text-[#001f3f] border-slate-300 focus:ring-[#001f3f] cursor-pointer"
                          />
                          <label
                            htmlFor={`perm_${perm.key}`}
                            className="cursor-pointer block select-none"
                          >
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`text-xs font-bold ${
                                  state.effective ? 'text-slate-900' : 'text-slate-500 line-through'
                                }`}
                              >
                                {perm.label}
                              </span>
                              {state.isOverridden && (
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">
                                  Tùy biến riêng
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                              {perm.description}
                            </p>
                          </label>
                        </div>

                        {state.isOverridden && (
                          <button
                            type="button"
                            onClick={() => handleResetToRoleDefault(perm.key)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 cursor-pointer transition-colors"
                            title="Hoàn tác về mặc định chức vụ"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {overrideCount > 0 ? (
              <span className="font-semibold text-amber-700">
                Đang có {overrideCount} quyền được tùy biến riêng
              </span>
            ) : (
              <span>Toàn bộ quyền đang kế thừa mặc định từ chức vụ</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#001f3f] text-[#D4AF37] font-bold text-xs hover:bg-[#002b55] cursor-pointer shadow-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Lưu phân quyền</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
