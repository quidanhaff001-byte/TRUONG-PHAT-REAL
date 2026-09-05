import React, { useState } from 'react';
import { CustomRole, User } from '../../../types';
import {
  PERMISSION_GROUPS,
  DEFAULT_SYSTEM_ROLES,
} from '../../../constants/permissions';
import {
  adminCreateRoleApi,
  adminUpdateRoleApi,
  adminDeleteRoleApi,
} from '../../../services/adminAuthService';
import { useToast } from '../../../context/ToastContext';
import {
  X,
  Shield,
  Plus,
  Edit2,
  Trash2,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  Search,
  Users,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface RoleManagementModalProps {
  roles: CustomRole[];
  users: User[];
  onClose: () => void;
  onRolesUpdated: (roles: CustomRole[]) => void;
}

export const RoleManagementModal: React.FC<RoleManagementModalProps> = ({
  roles,
  users,
  onClose,
  onRolesUpdated,
}) => {
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'LIST' | 'FORM'>('LIST');
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);

  // Form State
  const [formCode, setFormCode] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formPermissions, setFormPermissions] = useState<string[]>([]);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Count how many users have a specific role
  const getUserCountForRole = (roleCode: string, roleId: string) => {
    return users.filter((u) => u.role === roleCode || u.role === roleId).length;
  };

  const handleOpenCreateForm = () => {
    setEditingRole(null);
    setFormCode('');
    setFormName('');
    setFormDescription('');
    setFormPermissions([]);
    setFormIsActive(true);
    setActiveTab('FORM');
  };

  const handleOpenEditForm = (role: CustomRole) => {
    setEditingRole(role);
    setFormCode(role.code);
    setFormName(role.name);
    setFormDescription(role.description || '');
    setFormPermissions(role.permissions || []);
    setFormIsActive(role.isActive !== false);
    setActiveTab('FORM');
  };

  const handleTogglePermission = (key: string) => {
    setFormPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSelectGroupPermissions = (permKeys: string[]) => {
    const allSelected = permKeys.every((k) => formPermissions.includes(k));
    if (allSelected) {
      setFormPermissions((prev) => prev.filter((k) => !permKeys.includes(k)));
    } else {
      setFormPermissions((prev) => Array.from(new Set([...prev, ...permKeys])));
    }
  };

  const handleSelectAllPermissions = () => {
    const allKeys = PERMISSION_GROUPS.flatMap((g) => g.items.map((p) => p.key));
    if (formPermissions.length === allKeys.length) {
      setFormPermissions([]);
    } else {
      setFormPermissions(allKeys);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      error('Thiếu tên chức vụ', 'Vui lòng nhập tên hiển thị cho chức vụ.');
      return;
    }

    if (!editingRole && !formCode.trim()) {
      error('Thiếu mã chức vụ', 'Vui lòng nhập mã viết tắt cho chức vụ (ví dụ: GIAMDOC, KETOAN).');
      return;
    }

    try {
      setIsSubmitting(true);

      if (editingRole) {
        // Update existing role
        const res = await adminUpdateRoleApi(editingRole.id, {
          name: formName.trim(),
          description: formDescription.trim(),
          permissions: formPermissions,
          isActive: formIsActive,
        });

        if (res.success && res.role) {
          success('Cập nhật thành công', `Đã cập nhật chức vụ "${formName}".`);
          const updatedList = roles.map((r) => (r.id === editingRole.id ? res.role! : r));
          onRolesUpdated(updatedList);
          setActiveTab('LIST');
        }
      } else {
        // Create new role
        const cleanCode = formCode.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
        const res = await adminCreateRoleApi({
          code: cleanCode,
          name: formName.trim(),
          description: formDescription.trim(),
          permissions: formPermissions,
          isActive: formIsActive,
        });

        if (res.success && res.role) {
          success('Tạo chức vụ thành công', `Đã tạo chức vụ mới "${formName}" (${cleanCode}).`);
          onRolesUpdated([...roles, res.role]);
          setActiveTab('LIST');
        }
      }
    } catch (err: any) {
      console.error('Role form submit error:', err);
      error('Lỗi xử lý', err.message || 'Không thể lưu chức vụ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async (role: CustomRole) => {
    const count = getUserCountForRole(role.code, role.id);
    if (count > 0) {
      error(
        'Không thể xóa chức vụ',
        `Chức vụ "${role.name}" hiện đang có ${count} nhân sự đảm nhiệm. Vui lòng luân chuyển chức vụ của các nhân sự trước khi xóa.`
      );
      return;
    }

    if (role.isSystem || role.code === 'ADMIN') {
      error('Chức vụ hệ thống', 'Không thể xóa chức vụ mặc định của hệ thống.');
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa chức vụ "${role.name}" (${role.code}) không?`)) {
      return;
    }

    try {
      setDeletingRoleId(role.id);
      const res = await adminDeleteRoleApi(role.id);
      if (res.success) {
        success('Đã xóa', `Đã xóa chức vụ "${role.name}".`);
        onRolesUpdated(roles.filter((r) => r.id !== role.id));
      }
    } catch (err: any) {
      error('Lỗi xóa chức vụ', err.message || 'Không thể xóa chức vụ này.');
    } finally {
      setDeletingRoleId(null);
    }
  };

  const filteredRoles = roles.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#001f3f] text-[#D4AF37]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#001f3f]">
                QUẢN LÝ CHỨC VỤ & PHÂN QUYỀN ĐỘNG
              </h3>
              <p className="text-xs text-slate-500">
                Tạo mới, chỉnh sửa quyền hạn và quản lý các chức danh trong công ty
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {activeTab === 'LIST' ? (
          /* ================= LIST VIEW ================= */
          <div className="flex-1 overflow-y-auto pr-1 mt-4 flex flex-col space-y-4">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm chức vụ theo tên hoặc mã..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#001f3f]"
                />
              </div>

              <button
                type="button"
                onClick={handleOpenCreateForm}
                className="flex items-center gap-2 px-4 py-2 bg-[#001f3f] text-[#D4AF37] hover:bg-[#002b55] text-xs font-bold rounded-xl cursor-pointer shadow-xs transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo chức vụ mới</span>
              </button>
            </div>

            {/* Roles Table/Grid */}
            <div className="space-y-3">
              {filteredRoles.map((role) => {
                const userCount = getUserCountForRole(role.code, role.id);
                const permCount = (role.permissions || []).length;

                return (
                  <div
                    key={role.id}
                    className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-[#001f3f]">{role.name}</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-mono font-bold rounded-md">
                          {role.code}
                        </span>
                        {role.isSystem ? (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full">
                            Mặc định hệ thống
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            <span>Tùy chỉnh</span>
                          </span>
                        )}
                        {!role.isActive && (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-full">
                            Ngưng hoạt động
                          </span>
                        )}
                      </div>

                      {role.description && (
                        <p className="text-xs text-slate-500 mt-1">{role.description}</p>
                      )}

                      <div className="flex items-center gap-4 mt-2.5 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-semibold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{permCount} quyền hạn được cấp</span>
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{userCount} nhân sự đang giữ chức vụ</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditForm(role)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Sửa quyền</span>
                      </button>

                      {!role.isSystem && role.code !== 'ADMIN' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteRole(role)}
                          disabled={deletingRoleId === role.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl cursor-pointer transition-colors disabled:opacity-50"
                        >
                          {deletingRoleId === role.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          <span>Xóa</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ================= FORM VIEW (CREATE / EDIT) ================= */
          <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto pr-1 mt-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="text-xs font-bold text-slate-700">
                {editingRole ? `CHỈNH SỬA CHỨC VỤ: ${editingRole.name}` : 'TẠO CHỨC VỤ MỚI'}
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('LIST')}
                className="text-xs text-indigo-600 hover:underline font-semibold cursor-pointer"
              >
                Quay lại danh sách
              </button>
            </div>

            {/* Basic Info Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mã chức vụ (Code) *
                </label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingRole?.isSystem)}
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="GIAMDOC, KETOAN, MARKETING..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#001f3f] disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên hiển thị chức vụ *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Giám đốc kinh doanh, Kế toán trưởng..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#001f3f]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả chức vụ</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Mô tả phạm vi trách nhiệm hoặc bộ phận công tác..."
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#001f3f]"
                />
              </div>
            </div>

            {/* Permissions Matrix Checklist */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Phân quyền mặc định cho chức vụ ({formPermissions.length} quyền được chọn)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Tất cả nhân sự được phân vào chức vụ này sẽ nhận các quyền này làm mặc định.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSelectAllPermissions}
                  className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                >
                  {formPermissions.length === PERMISSION_GROUPS.flatMap((g) => g.items).length
                    ? 'Bỏ chọn tất cả'
                    : 'Chọn tất cả quyền'}
                </button>
              </div>

              <div className="space-y-3">
                {PERMISSION_GROUPS.map((group) => {
                  const groupPermKeys = group.items.map((p) => p.key);
                  const allInGroupSelected = groupPermKeys.every((k) =>
                    formPermissions.includes(k)
                  );

                  return (
                    <div
                      key={group.id}
                      className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5"
                    >
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          {group.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSelectGroupPermissions(groupPermKeys)}
                          className="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                        >
                          {allInGroupSelected ? 'Bỏ chọn nhóm' : 'Chọn cả nhóm'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {group.items.map((perm) => {
                          const isChecked = formPermissions.includes(perm.key);
                          return (
                            <label
                              key={perm.key}
                              className={`flex items-start gap-2 p-2 rounded-xl border text-xs cursor-pointer select-none transition-colors ${
                                isChecked
                                  ? 'bg-white border-indigo-200 shadow-xs'
                                  : 'bg-white/60 border-slate-200 opacity-80'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleTogglePermission(perm.key)}
                                className="mt-0.5 rounded text-[#001f3f] focus:ring-[#001f3f] cursor-pointer"
                              />
                              <div>
                                <span className="font-bold text-slate-800">{perm.label}</span>
                                <p className="text-[10px] text-slate-500">{perm.description}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('LIST')}
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
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{editingRole ? 'Lưu cập nhật chức vụ' : 'Tạo chức vụ'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
