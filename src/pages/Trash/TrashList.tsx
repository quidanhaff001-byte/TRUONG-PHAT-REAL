import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  Trash2,
  RotateCcw,
  Building2,
  Users,
  MapPin,
  Clock,
  Phone,
  Tag,
} from 'lucide-react';
import { formatVND, formatDate } from '../../utils/formatters';
import { TransactionBadge } from '../../components/common/Badge';
import { CustomerDemandBadge } from '../../components/customers/CustomerBadges';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export const TrashList: React.FC = () => {
  const { properties, customers, restoreProperty, restoreCustomer, permanentDeleteCustomer } = useData();
  const { isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'PROPERTIES' | 'CUSTOMERS'>('PROPERTIES');
  const [restorePropTarget, setRestorePropTarget] = useState<string | null>(null);
  const [restoreCustTarget, setRestoreCustTarget] = useState<string | null>(null);

  const deletedProperties = properties.filter((p) => p.isDeleted);
  const deletedCustomers = customers.filter((c) => c.isDeleted);

  const handleRestoreProperty = async () => {
    if (restorePropTarget) {
      await restoreProperty(restorePropTarget);
      setRestorePropTarget(null);
    }
  };

  const handleRestoreCustomer = async () => {
    if (restoreCustTarget) {
      await restoreCustomer(restoreCustTarget);
      setRestoreCustTarget(null);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Thùng rác hệ thống
            </h1>
            <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
              {deletedProperties.length + deletedCustomers.length} mục đã xóa
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Danh sách bất động sản và hồ sơ khách hàng đã bị xóa mềm. Quản trị viên và người phụ trách có thể khôi phục lại bất kỳ lúc nào.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('PROPERTIES')}
          className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'PROPERTIES'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Nguồn hàng BĐS ({deletedProperties.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CUSTOMERS')}
          className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'CUSTOMERS'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Hồ sơ khách hàng ({deletedCustomers.length})</span>
        </button>
      </div>

      {/* PROPERTIES TAB */}
      {activeTab === 'PROPERTIES' && (
        <>
          {deletedProperties.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-2xs">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400 mb-3">
                <Trash2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Thùng rác BĐS hiện đang trống</h3>
              <p className="text-xs text-slate-500 mt-1">Không có bất động sản nào trong thùng rác.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deletedProperties.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-rose-200/80 p-5 shadow-2xs flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {p.code}
                      </span>
                      <TransactionBadge type={p.transactionType} />
                    </div>

                    <h3 className="font-bold text-xs text-slate-900 line-clamp-2 leading-snug">{p.title}</h3>

                    <div className="text-[11px] text-slate-500 line-clamp-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{p.address}</span>
                    </div>

                    <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-100 text-[11px] text-rose-900 space-y-1">
                      <div>
                        Lý do xóa: <strong>{p.deleteReason || 'Xóa thủ công'}</strong>
                      </div>
                      <div className="text-[10px] text-rose-700">
                        Thời gian: {p.deletedAt ? formatDate(p.deletedAt) : 'Chưa rõ'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-xs font-bold text-emerald-700">
                      {p.salePrice ? formatVND(p.salePrice) : p.rentPriceMonthly ? `${formatVND(p.rentPriceMonthly)}/th` : formatVND(p.transferPrice)}
                    </div>

                    <button
                      type="button"
                      onClick={() => setRestorePropTarget(p.id)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Khôi phục</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* CUSTOMERS TAB */}
      {activeTab === 'CUSTOMERS' && (
        <>
          {deletedCustomers.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-2xs">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400 mb-3">
                <Trash2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Thùng rác khách hàng hiện đang trống</h3>
              <p className="text-xs text-slate-500 mt-1">Không có hồ sơ khách hàng nào trong thùng rác.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deletedCustomers.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-rose-200/80 p-5 shadow-2xs flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {c.code}
                      </span>
                      <CustomerDemandBadge demandType={c.demandType} />
                    </div>

                    <h3 className="font-bold text-sm text-slate-900">{c.fullName}</h3>

                    <div className="text-[11px] text-slate-600 flex items-center gap-1 font-mono font-medium">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{c.phone}</span>
                    </div>

                    <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-100 text-[11px] text-rose-900 space-y-1">
                      <div>
                        Lý do xóa: <strong>{c.deleteReason || 'Xóa thủ công'}</strong>
                      </div>
                      <div className="text-[10px] text-rose-700">
                        Thời gian: {c.deletedAt ? formatDate(c.deletedAt) : 'Chưa rõ'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                      Môi giới: <strong>{c.assignedAgentName || '---'}</strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => setRestoreCustTarget(c.id)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Khôi phục</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Restore Property Confirm Modal */}
      <ConfirmModal
        isOpen={!!restorePropTarget}
        onClose={() => setRestorePropTarget(null)}
        onConfirm={handleRestoreProperty}
        title="Khôi phục bất động sản"
        message="Bất động sản này sẽ được khôi phục trở lại danh sách nguồn hàng hoạt động."
        confirmText="Khôi phục ngay"
        variant="info"
      />

      {/* Restore Customer Confirm Modal */}
      <ConfirmModal
        isOpen={!!restoreCustTarget}
        onClose={() => setRestoreCustTarget(null)}
        onConfirm={handleRestoreCustomer}
        title="Khôi phục hồ sơ khách hàng"
        message="Khách hàng này sẽ được khôi phục trở lại danh sách quản lý hoạt động."
        confirmText="Khôi phục ngay"
        variant="info"
      />
    </div>
  );
};
