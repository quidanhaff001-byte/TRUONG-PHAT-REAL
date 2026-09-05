import React from 'react';
import { User, RoleHistoryEntry } from '../../../types';
import { getRoleDisplayName } from '../../../constants/permissions';
import { X, History, ArrowRight, UserCheck, Calendar, Shield } from 'lucide-react';

interface RoleHistoryModalProps {
  user: User;
  onClose: () => void;
}

export const RoleHistoryModal: React.FC<RoleHistoryModalProps> = ({ user, onClose }) => {
  const historyList = (user.roleHistory || []).slice().reverse();

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#001f3f]">LỊCH SỬ LUÂN CHUYỂN CHỨC VỤ</h3>
              <p className="text-xs text-slate-500">
                Nhân sự: <span className="font-bold text-slate-800">{user.fullName}</span> ({user.employeeCode || user.id})
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

        {/* Current Role Banner */}
        <div className="mt-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold text-slate-600">Chức vụ hiện tại:</span>
          </div>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full">
            {user.roleName || getRoleDisplayName(user.role)}
          </span>
        </div>

        {/* Timeline List */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1 space-y-3">
          {historyList.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">Chưa có lịch sử luân chuyển chức vụ nào.</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Lịch sử sẽ tự động được ghi lại mỗi khi Quản trị viên thay đổi chức vụ.
              </p>
            </div>
          ) : (
            historyList.map((item, index) => (
              <div
                key={index}
                className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs hover:border-slate-300 transition-all"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatDate(item.changedAt)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Bởi: {item.changedByName || item.changedBy || 'Quản trị viên'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 my-2.5">
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg">
                    {item.fromRoleName || getRoleDisplayName(item.fromRole)}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-bold text-xs rounded-lg">
                    {item.toRoleName || getRoleDisplayName(item.toRole)}
                  </span>
                </div>

                {item.reason && (
                  <div className="mt-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-slate-600">
                    <span className="font-semibold text-slate-700">Lý do: </span>
                    <span>{item.reason}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
