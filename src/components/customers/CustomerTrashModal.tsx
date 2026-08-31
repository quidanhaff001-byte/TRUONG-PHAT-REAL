import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Customer } from '../../types';
import { formatDateVN } from '../../utils/formatters';
import { CustomerDemandBadge } from './CustomerBadges';
import {
  X,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Search,
  UserX,
  CheckCircle2,
} from 'lucide-react';

interface CustomerTrashModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerTrashModal: React.FC<CustomerTrashModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { customers, restoreCustomer, permanentDeleteCustomer } = useData();
  const { isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter soft-deleted customers
  const deletedCustomers = customers.filter((c) => {
    if (!c.isDeleted) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        c.fullName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.code.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">Thùng rác khách hàng</h2>
              <p className="text-xs text-slate-400">
                Danh sách khách hàng đã tạm xóa, có thể khôi phục bất cứ lúc nào
              </p>
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

        {/* Search & Stats */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm theo tên, số điện thoại, mã khách đã xóa..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:border-slate-900 ring-slate-200"
            />
          </div>
          <div className="text-xs font-medium text-slate-600">
            Tổng cộng: <strong className="text-rose-600">{deletedCustomers.length}</strong> khách hàng trong thùng rác
          </div>
        </div>

        {/* Body list */}
        <div className="overflow-y-auto p-6 flex-1">
          {deletedCustomers.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <UserX className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-700">Thùng rác trống</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Không có khách hàng nào trong thùng rác.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
              {deletedCustomers.map((cust) => (
                <div
                  key={cust.id}
                  className="p-4 hover:bg-slate-50 flex items-center justify-between gap-4 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{cust.fullName}</span>
                      <span className="font-mono text-xs text-slate-500 font-medium">({cust.code})</span>
                      <CustomerDemandBadge demandType={cust.demandType} />
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3">
                      <span>SĐT: <strong className="font-mono text-slate-700">{cust.phone}</strong></span>
                      <span>Môi giới phụ trách: {cust.assignedAgentName || '---'}</span>
                      <span>Đã xóa ngày: {cust.deletedAt ? formatDateVN(cust.deletedAt) : '---'}</span>
                    </div>
                    {cust.deleteReason && (
                      <div className="text-[11px] text-rose-600 italic">
                        Lý do: {cust.deleteReason}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => restoreCustomer(cust.id)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Khôi phục
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirmDeleteId === cust.id) {
                            permanentDeleteCustomer(cust.id);
                            setConfirmDeleteId(null);
                          } else {
                            setConfirmDeleteId(cust.id);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                          confirmDeleteId === cust.id
                            ? 'bg-rose-600 text-white'
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {confirmDeleteId === cust.id ? 'Xác nhận xóa vĩnh viễn?' : 'Xóa vĩnh viễn'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
