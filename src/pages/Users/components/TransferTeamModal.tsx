import React, { useState, useMemo } from 'react';
import { User, Team } from '../../../types';
import { adminTransferTeamApi } from '../../../services/adminAuthService';
import { useToast } from '../../../context/ToastContext';
import { useData } from '../../../context/DataContext';
import {
  X,
  Users,
  Building,
  UserCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  Briefcase,
} from 'lucide-react';

interface TransferTeamModalProps {
  user: User;
  teams: Team[];
  users: User[];
  onClose: () => void;
  onSuccess: (updatedUser: User) => void;
}

export const TransferTeamModal: React.FC<TransferTeamModalProps> = ({
  user,
  teams,
  users,
  onClose,
  onSuccess,
}) => {
  const { customers } = useData();
  const { success, error } = useToast();

  const currentTeam = teams.find((t) => t.id === user.teamId);
  const currentTeamName = user.teamName || currentTeam?.name || 'Chưa phân nhóm';

  const [newTeamId, setNewTeamId] = useState<string>(user.teamId || '');
  const [newDepartment, setNewDepartment] = useState<string>(user.department || '');
  const [newLeaderId, setNewLeaderId] = useState<string>(user.directManagerId || '');

  // Customer transfer options
  const [customerMode, setCustomerMode] = useState<'KEEP' | 'ALL' | 'SELECTED'>('KEEP');
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Find customers assigned to this user
  const assignedCustomers = useMemo(() => {
    return (customers || []).filter(
      (c) => c.assignedTo === user.id || (c as any).assignedAgentId === user.id
    );
  }, [customers, user.id]);

  // Available handover targets (other active users except current user)
  const candidateUsers = useMemo(() => {
    return users.filter((u) => u.id !== user.id && u.status !== 'LOCKED');
  }, [users, user.id]);

  const selectedTeamObj = teams.find((t) => t.id === newTeamId);
  const targetUserObj = candidateUsers.find((u) => u.id === targetUserId);

  const toggleCustomerSelect = (cId: string) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(cId) ? prev.filter((id) => id !== cId) : [...prev, cId]
    );
  };

  const handleSelectAllCustomers = () => {
    if (selectedCustomerIds.length === assignedCustomers.length) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(assignedCustomers.map((c) => c.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (customerMode !== 'KEEP' && !targetUserId) {
      error('Chưa chọn người nhận', 'Vui lòng chọn nhân sự tiếp nhận bàn giao khách hàng.');
      return;
    }

    if (customerMode === 'SELECTED' && selectedCustomerIds.length === 0) {
      error('Chưa chọn khách hàng', 'Vui lòng chọn ít nhất một khách hàng để bàn giao.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await adminTransferTeamApi({
        uid: user.id,
        newTeamId: newTeamId || null,
        newTeamName: selectedTeamObj ? selectedTeamObj.name : '',
        newDepartment: newDepartment.trim() || undefined,
        newLeaderId: newLeaderId || null,
        newLeaderName: users.find((u) => u.id === newLeaderId)?.fullName || '',
        customerTransferMode: customerMode,
        targetUserId: targetUserId || undefined,
        targetUserName: targetUserObj?.fullName || undefined,
        selectedCustomerIds: customerMode === 'SELECTED' ? selectedCustomerIds : undefined,
      });

      if (res.success) {
        success(
          'Điều chuyển thành công',
          `Đã chuyển ${user.fullName} sang ${selectedTeamObj?.name || 'Nhóm mới'}.${res.reassignCount ? ` Đã bàn giao ${res.reassignCount} khách hàng.` : ''}`
        );
        const updatedUser: User = {
          ...user,
          teamId: newTeamId || undefined,
          teamName: selectedTeamObj ? selectedTeamObj.name : '',
          department: newDepartment.trim() || undefined,
          directManagerId: newLeaderId || undefined,
          directManagerName: users.find((u) => u.id === newLeaderId)?.fullName || undefined,
        };
        onSuccess(updatedUser);
        onClose();
      } else {
        error('Điều chuyển thất bại', res.message || 'Không thể thực hiện điều chuyển.');
      }
    } catch (err: any) {
      console.error('Transfer team error:', err);
      error('Lỗi điều chuyển', err.message || 'Có lỗi xảy ra khi chuyển nhóm.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-700">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#001f3f]">
                ĐIỀU CHUYỂN PHÒNG / NHÓM LÀM VIỆC
              </h3>
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
          {/* Current & Target Team Transition */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Nhóm hiện tại
              </div>
              <div className="px-3 py-1.5 bg-slate-200 text-slate-800 font-bold text-xs rounded-xl inline-block">
                {currentTeamName}
              </div>
            </div>

            <ArrowRight className="w-5 h-5 text-cyan-600 shrink-0 mx-2" />

            <div className="text-right">
              <div className="text-[11px] font-semibold text-cyan-600 uppercase tracking-wider mb-1">
                Nhóm điều chuyển đến
              </div>
              <div className="px-3 py-1.5 bg-cyan-100 text-cyan-900 font-bold text-xs rounded-xl inline-block">
                {selectedTeamObj ? selectedTeamObj.name : 'Chưa chọn'}
              </div>
            </div>
          </div>

          {/* Select Target Team */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Chọn nhóm kinh doanh mới *</span>
            </label>
            <select
              value={newTeamId}
              onChange={(e) => setNewTeamId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#001f3f]"
            >
              <option value="">-- Chưa phân nhóm --</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Department & Direct Leader */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>Phòng / Ban mới</span>
              </label>
              <input
                type="text"
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                placeholder="Phòng kinh doanh 1..."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#001f3f]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Quản lý trực tiếp mới</span>
              </label>
              <select
                value={newLeaderId}
                onChange={(e) => setNewLeaderId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#001f3f]"
              >
                <option value="">-- Chọn quản lý trực tiếp --</option>
                {candidateUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.roleName || u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Customer Handover Section */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                <span>Chính sách bàn giao khách hàng</span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-lg">
                Đang phụ trách: {assignedCustomers.length} khách hàng
              </span>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors">
                <input
                  type="radio"
                  name="customerMode"
                  checked={customerMode === 'KEEP'}
                  onChange={() => setCustomerMode('KEEP')}
                  className="w-4 h-4 text-[#001f3f] focus:ring-[#001f3f]"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Giữ nguyên khách hàng phụ trách (Mặc định)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Nhân sự tiếp tục quản lý và chăm sóc toàn bộ khách hàng sau khi sang nhóm mới.
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors">
                <input
                  type="radio"
                  name="customerMode"
                  checked={customerMode === 'ALL'}
                  onChange={() => setCustomerMode('ALL')}
                  className="w-4 h-4 text-[#001f3f] focus:ring-[#001f3f]"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Bàn giao toàn bộ {assignedCustomers.length} khách hàng cho nhân sự khác
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Chuyển toàn bộ danh sách khách hàng sang cho đồng nghiệp trong nhóm cũ.
                  </div>
                </div>
              </label>

              {assignedCustomers.length > 0 && (
                <label className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors">
                  <input
                    type="radio"
                    name="customerMode"
                    checked={customerMode === 'SELECTED'}
                    onChange={() => setCustomerMode('SELECTED')}
                    className="w-4 h-4 text-[#001f3f] focus:ring-[#001f3f]"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Tùy chọn danh sách khách hàng cần bàn giao
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Chỉ định cụ thể những khách hàng nào bàn giao và những khách hàng nào giữ lại.
                    </div>
                  </div>
                </label>
              )}
            </div>

            {/* Target user selector if handover is selected */}
            {customerMode !== 'KEEP' && (
              <div className="pt-2 border-t border-slate-200/80 space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Chọn nhân sự tiếp nhận khách hàng *
                </label>
                <select
                  required
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#001f3f]"
                >
                  <option value="">-- Chọn nhân viên tiếp nhận --</option>
                  {candidateUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.teamName || 'Chưa phân nhóm'} – {u.roleName || u.role})
                    </option>
                  ))}
                </select>

                {/* Selected customer list */}
                {customerMode === 'SELECTED' && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                      <span>Chọn khách hàng bàn giao ({selectedCustomerIds.length}/{assignedCustomers.length})</span>
                      <button
                        type="button"
                        onClick={handleSelectAllCustomers}
                        className="text-indigo-600 hover:underline cursor-pointer"
                      >
                        {selectedCustomerIds.length === assignedCustomers.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                      </button>
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1 bg-white p-2 rounded-xl border border-slate-200">
                      {assignedCustomers.map((c) => (
                        <label
                          key={c.id}
                          className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-lg text-xs cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCustomerIds.includes(c.id)}
                            onChange={() => toggleCustomerSelect(c.id)}
                            className="rounded text-[#001f3f] focus:ring-[#001f3f]"
                          />
                          <span className="font-semibold text-slate-800">{c.fullName}</span>
                          {c.phone && <span className="text-slate-400 text-[11px]">({c.phone})</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Guarantee Data Preservation Notice */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-emerald-900 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-bold">Bảo toàn dữ liệu nguồn hàng & giao dịch: </span>
              Khi điều chuyển nhóm, các dữ liệu nguồn hàng đã đăng, lịch sử chăm sóc, giao dịch và hoa hồng của nhân viên luôn được lưu giữ nguyên vẹn trên hệ thống.
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
                  <span>Đang điều chuyển...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Xác nhận điều chuyển</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
