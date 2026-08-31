import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Customer } from '../../types';
import { X, UserCheck, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface ReassignCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  customerIds?: string[];
  onSuccess?: () => void;
}

export const ReassignCustomerModal: React.FC<ReassignCustomerModalProps> = ({
  isOpen,
  onClose,
  customer,
  customerIds = [],
  onSuccess,
}) => {
  const { users, teams, assignCustomerAgent, bulkAssignCustomerAgent } = useData();
  const { currentUser } = useAuth();

  const [selectedAgentId, setSelectedAgentId] = useState(users[0]?.id || '');
  const [transferNote, setTransferNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const isBulk = customerIds.length > 0 && !customer;
  const count = isBulk ? customerIds.length : 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentId) return;

    setIsSubmitting(true);
    try {
      if (isBulk) {
        await bulkAssignCustomerAgent(customerIds, selectedAgentId);
      } else if (customer) {
        await assignCustomerAgent(customer.id, selectedAgentId, transferNote);
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentAgent = customer?.assignedAgentName || 'Chưa phân công';
  const newAgent = users.find((u) => u.id === selectedAgentId);
  const newTeam = teams.find((t) => t.id === newAgent?.teamId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {isBulk ? `Chuyển phụ trách ${count} khách hàng` : `Chuyển người phụ trách khách: ${customer?.fullName}`}
              </h2>
              <p className="text-xs text-slate-400">Bàn giao danh sách khách và lịch sử chăm sóc cho môi giới mới</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Transfer visual representation */}
          {!isBulk && customer && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <div className="text-slate-500 text-[11px]">Người phụ trách hiện tại:</div>
                <div className="font-bold text-slate-900">{currentAgent}</div>
                <div className="text-slate-500 text-[11px]">{customer.teamName || 'Chưa vào team'}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 mx-2" />
              <div className="space-y-0.5 text-right">
                <div className="text-emerald-600 text-[11px] font-bold">Người phụ trách mới:</div>
                <div className="font-bold text-emerald-800">{newAgent?.fullName || 'Chọn bên dưới'}</div>
                <div className="text-slate-500 text-[11px]">{newTeam?.name || '---'}</div>
              </div>
            </div>
          )}

          {/* Select Agent */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Chọn môi giới tiếp nhận <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white font-medium focus:outline-none focus:ring-2 focus:border-slate-900 ring-slate-200"
            >
              {users.map((u) => {
                const team = teams.find((t) => t.id === u.teamId);
                return (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.employeeCode}) — {team ? team.name : 'Chưa phân nhóm'} — ({u.role === 'ADMIN' ? 'Admin' : u.role === 'TEAM_LEADER' ? 'Trưởng nhóm' : 'Môi giới'})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Transfer Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lý do chuyển giao & Lưu ý khi bàn giao
            </label>
            <textarea
              rows={3}
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
              placeholder="VD: Chuyển giao khách do môi giới đi công tác / bàn giao theo phân công địa bàn mới..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:border-slate-900 ring-slate-200"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedAgentId}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{isSubmitting ? 'Đang chuyển giao...' : 'Xác nhận chuyển giao'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
