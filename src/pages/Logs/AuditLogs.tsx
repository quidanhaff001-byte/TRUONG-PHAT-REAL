import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  Shield,
  User,
  Clock,
  Layers,
  Calendar,
  Eye,
  AlertCircle,
  FileCheck,
  Building,
  KeyRound,
  DollarSign,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { AuditLog } from '../../types';
import { formatDate } from '../../utils/formatters';
import { Badge } from '../../components/common/Badge';

export const AuditLogs: React.FC = () => {
  const { auditLogs, users } = useData();
  const { currentUser, isAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterModule, setFilterModule] = useState<string>('ALL');
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [filterUserId, setFilterUserId] = useState<string>('ALL');

  // Filtered Audit Logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (filterModule !== 'ALL' && log.module !== filterModule) return false;
      if (filterAction !== 'ALL' && log.action !== filterAction) return false;
      if (filterUserId !== 'ALL' && log.userId !== filterUserId) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchUser = log.userName.toLowerCase().includes(q) || log.userEmail?.toLowerCase().includes(q);
        const matchDetails = log.details.toLowerCase().includes(q);
        const matchRecId = log.recordId?.toLowerCase().includes(q);
        if (!matchUser && !matchDetails && !matchRecId) return false;
      }

      return true;
    });
  }, [auditLogs, filterModule, filterAction, filterUserId, searchQuery]);

  const getActionBadgeVariant = (action: AuditLog['action']) => {
    switch (action) {
      case 'CREATE':
        return 'success';
      case 'UPDATE':
      case 'STATUS_CHANGE':
        return 'primary';
      case 'DELETE':
        return 'danger';
      case 'RESTORE':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  const getModuleIcon = (module: AuditLog['module']) => {
    switch (module) {
      case 'PROPERTIES':
        return <Building className="w-4 h-4 text-blue-600" />;
      case 'CUSTOMERS':
        return <User className="w-4 h-4 text-indigo-600" />;
      case 'APPOINTMENTS':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'TRANSACTIONS':
        return <FileCheck className="w-4 h-4 text-emerald-600" />;
      case 'RENTALS':
      case 'CONTRACTS':
        return <KeyRound className="w-4 h-4 text-purple-600" />;
      case 'COMMISSIONS':
        return <DollarSign className="w-4 h-4 text-yellow-600" />;
      case 'USERS':
      case 'AUTH':
        return <UserCheck className="w-4 h-4 text-slate-600" />;
      default:
        return <Layers className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl">
              <History className="w-6 h-6" />
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-[#001f3f]">
              Nhật Ký Hoạt Động & Bảo Mật Hệ Thống
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Ghi nhận toàn bộ thao tác thêm, sửa, xóa, chuyển trạng thái và thu chi hoa hồng của nhân viên.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-[#001f3f]" />
            Tổng {auditLogs.length} sự kiện
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo người thực hiện, nội dung thao tác, mã bản ghi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#001f3f] outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 outline-none"
          >
            <option value="ALL">Tất cả module</option>
            <option value="PROPERTIES">Nguồn hàng BĐS</option>
            <option value="CUSTOMERS">Khách hàng</option>
            <option value="APPOINTMENTS">Lịch hẹn</option>
            <option value="SALES">Giao dịch Bán</option>
            <option value="RENTALS">Cho thuê</option>
            <option value="CONTRACTS">Hợp đồng thuê</option>
            <option value="COMMISSIONS">Hoa hồng</option>
            <option value="USERS">Nhân sự & Nhóm</option>
            <option value="AUTH">Đăng nhập / Xác thực</option>
          </select>

          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 outline-none"
          >
            <option value="ALL">Tất cả hành động</option>
            <option value="CREATE">Thêm mới (CREATE)</option>
            <option value="UPDATE">Cập nhật (UPDATE)</option>
            <option value="STATUS_CHANGE">Đổi trạng thái</option>
            <option value="DELETE">Xóa (DELETE)</option>
            <option value="RESTORE">Khôi phục (RESTORE)</option>
            <option value="LOGIN">Đăng nhập (LOGIN)</option>
          </select>

          <select
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 outline-none"
          >
            <option value="ALL">Tất cả nhân sự</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} ({u.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Timeline / Table View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Nhật ký kiểm toán ({filteredLogs.length})
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <History className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-semibold">Chưa có nhật ký nào phù hợp</p>
            <p className="text-xs text-slate-400">Các thao tác trên hệ thống sẽ tự động được ghi lại tại đây.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => {
              const logDate = new Date(log.timestamp);
              const timeString = `${logDate.getHours().toString().padStart(2, '0')}:${logDate.getMinutes().toString().padStart(2, '0')}:${logDate.getSeconds().toString().padStart(2, '0')}`;
              const dateString = `${logDate.getDate().toString().padStart(2, '0')}/${(logDate.getMonth() + 1).toString().padStart(2, '0')}/${logDate.getFullYear()}`;

              return (
                <div key={log.id} className="p-4 hover:bg-slate-50/70 transition-colors flex items-start gap-3 text-xs">
                  <div className="p-2 bg-slate-100 rounded-xl shrink-0 mt-0.5">
                    {getModuleIcon(log.module)}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">{log.userName}</span>
                      <span className="text-slate-400">({log.userRole})</span>
                      <Badge variant={getActionBadgeVariant(log.action)}>{log.action}</Badge>
                      <span className="text-slate-500 font-medium">trên module <strong>{log.module}</strong></span>
                    </div>

                    <div className="text-slate-700 font-medium bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                      {log.details}
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {timeString} ngày {dateString}
                      </span>

                      {log.recordId && (
                        <span>
                          Mã bản ghi: <strong className="font-mono text-slate-600">{log.recordId}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
