import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Customer } from '../../types';
import { formatVND, formatDateVN, classifyAppointment } from '../../utils/formatters';
import { CustomerDemandBadge, CustomerPotentialBadge, CustomerStatusBadge } from '../../components/customers/CustomerBadges';
import { CustomerFormModal } from '../../components/customers/CustomerFormModal';
import { CustomerDetailModal } from '../../components/customers/CustomerDetailModal';
import { AddInteractionModal } from '../../components/customers/AddInteractionModal';
import { ReassignCustomerModal } from '../../components/customers/ReassignCustomerModal';
import { CustomerTrashModal } from '../../components/customers/CustomerTrashModal';
import { Pagination } from '../../components/common/Pagination';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  RefreshCw,
  Phone,
  MessageSquare,
  Calendar,
  Clock,
  MoreVertical,
  Edit,
  Trash2,
  UserCheck,
  Building,
  DollarSign,
  MapPin,
  Flame,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Tag,
  ArrowUpDown,
  Layers,
  Archive,
} from 'lucide-react';

export const CustomerList: React.FC = () => {
  const {
    customers,
    users,
    teams,
    isLoading,
    deleteCustomer,
    bulkUpdateCustomerStatus,
    bulkDeleteCustomers,
  } = useData();

  const { currentUser, isAdmin, isTeamLeader } = useAuth();

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [demandFilter, setDemandFilter] = useState<'ALL' | 'MUA' | 'THUE' | 'SANG_NHUONG'>('ALL');
  const [potentialFilter, setPotentialFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [agentFilter, setAgentFilter] = useState<string>('ALL');
  const [teamFilter, setTeamFilter] = useState<string>('ALL');
  const [hasUpcomingAppointmentFilter, setHasUpcomingAppointmentFilter] = useState<boolean>(false);

  // Quick Tab View
  const [quickTab, setQuickTab] = useState<'ALL' | 'MY_CUSTOMERS' | 'MUA' | 'THUE' | 'SANG_NHUONG' | 'HOT_LEADS' | 'UPCOMING'>('ALL');

  // Sorting
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'nextAppointmentDate' | 'fullName'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset pagination to page 1 whenever any search or filter criteria changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    demandFilter,
    potentialFilter,
    statusFilter,
    agentFilter,
    teamFilter,
    hasUpcomingAppointmentFilter,
    quickTab,
  ]);

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [interactionCustomer, setInteractionCustomer] = useState<Customer | null>(null);
  const [reassignCustomer, setReassignCustomer] = useState<Customer | null>(null);
  const [isBulkReassignOpen, setIsBulkReassignOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);

  // Soft Delete Confirmation Dialog
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Role-Based Access Control (RBAC) Filter for visible customers
  const accessibleCustomers = useMemo(() => {
    return customers.filter((c) => {
      // Ignore soft-deleted by default in main list
      if (c.isDeleted) return false;

      // 1. Admin has total access
      if (isAdmin) return true;

      // 2. Team Leader sees their own customers + their team members' customers
      if (isTeamLeader) {
        if (c.assignedAgentId === currentUser?.id || c.createdBy === currentUser?.id) return true;
        if (currentUser?.teamId && c.teamId === currentUser.teamId) return true;
        return false;
      }

      // 3. Agent ONLY sees their assigned or self-created customers
      if (c.assignedAgentId === currentUser?.id || c.createdBy === currentUser?.id) {
        return true;
      }

      return false;
    });
  }, [customers, currentUser, isAdmin, isTeamLeader]);

  // Apply Search and Advanced Filters
  const filteredCustomers = useMemo(() => {
    return accessibleCustomers.filter((c) => {
      const aptAnalysis = classifyAppointment(c.nextAppointmentDate);

      // Quick Tab handling
      if (quickTab === 'MY_CUSTOMERS' && c.assignedAgentId !== currentUser?.id) return false;
      if (quickTab === 'MUA' && c.demandType !== 'MUA') return false;
      if (quickTab === 'THUE' && c.demandType !== 'THUE') return false;
      if (quickTab === 'SANG_NHUONG' && c.demandType !== 'SANG_NHUONG') return false;
      if (quickTab === 'HOT_LEADS' && c.potentialLevel !== 'Nóng') return false;
      // Only count and show active upcoming or today appointments (exclude past/overdue)
      if (quickTab === 'UPCOMING' && !aptAnalysis.isUpcomingOrToday) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = c.fullName?.toLowerCase().includes(q);
        const matchPhone = c.phone?.includes(q) || c.secondaryPhone?.includes(q) || c.zalo?.includes(q);
        const matchCode = c.code?.toLowerCase().includes(q);
        const matchEmail = c.email?.toLowerCase().includes(q);
        const matchNotes = c.notes?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchCode && !matchEmail && !matchNotes) {
          return false;
        }
      }

      // Demand Filter
      if (demandFilter !== 'ALL' && c.demandType !== demandFilter) return false;

      // Potential Filter
      if (potentialFilter !== 'ALL' && c.potentialLevel !== potentialFilter) return false;

      // Status Filter
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;

      // Agent Filter
      if (agentFilter !== 'ALL' && c.assignedAgentId !== agentFilter) return false;

      // Team Filter
      if (teamFilter !== 'ALL' && c.teamId !== teamFilter) return false;

      // Upcoming Appointment (exclude past/overdue)
      if (hasUpcomingAppointmentFilter && !aptAnalysis.isUpcomingOrToday) return false;

      return true;
    });
  }, [
    accessibleCustomers,
    quickTab,
    searchQuery,
    demandFilter,
    potentialFilter,
    statusFilter,
    agentFilter,
    teamFilter,
    hasUpcomingAppointmentFilter,
    currentUser,
  ]);

  // Sort
  const sortedCustomers = useMemo(() => {
    return [...filteredCustomers].sort((a, b) => {
      let valA: any = a[sortBy] || '';
      let valB: any = b[sortBy] || '';

      if (sortBy === 'fullName') {
        return sortOrder === 'asc'
          ? valA.localeCompare(valB, 'vi')
          : valB.localeCompare(valA, 'vi');
      }

      if (sortBy === 'nextAppointmentDate') {
        if (!valA) return 1;
        if (!valB) return -1;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredCustomers, sortBy, sortOrder]);

  // Paginated Customers
  const totalItems = sortedCustomers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedCustomers.slice(start, start + pageSize);
  }, [sortedCustomers, currentPage, pageSize]);

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginatedCustomers.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Metrics computation for KPI cards (using Asia/Ho_Chi_Minh appointment classification)
  const metrics = useMemo(() => {
    const total = accessibleCustomers.length;
    const hotLeads = accessibleCustomers.filter((c) => c.potentialLevel === 'Nóng').length;
    const inNegotiation = accessibleCustomers.filter((c) => c.status === 'Đang thương lượng' || c.status === 'Đã hẹn xem').length;
    const completed = accessibleCustomers.filter((c) => c.status === 'Đã giao dịch').length;
    // Exclude overdue / past appointments
    const upcomingApts = accessibleCustomers.filter((c) => classifyAppointment(c.nextAppointmentDate).isUpcomingOrToday).length;
    const deletedCount = customers.filter((c) => c.isDeleted).length;

    return { total, hotLeads, inNegotiation, completed, upcomingApts, deletedCount };
  }, [accessibleCustomers, customers]);

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setDemandFilter('ALL');
    setPotentialFilter('ALL');
    setStatusFilter('ALL');
    setAgentFilter('ALL');
    setTeamFilter('ALL');
    setHasUpcomingAppointmentFilter(false);
    setQuickTab('ALL');
    setCurrentPage(1);
  };

  // Handlers for edit/view/delete
  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsFormOpen(true);
  };

  const handleOpenDetail = (customer: Customer) => {
    setDetailCustomer(customer);
  };

  const handleDelete = async (id: string) => {
    await deleteCustomer(id, 'Chuyển vào thùng rác từ danh sách');
    setDeleteConfirmId(null);
    if (detailCustomer?.id === id) {
      setDetailCustomer(null);
    }
  };

  // Bulk actions
  const handleBulkStatus = async (status: Customer['status']) => {
    if (selectedIds.length === 0) return;
    await bulkUpdateCustomerStatus(selectedIds, status);
    setSelectedIds([]);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} khách hàng đã chọn vào thùng rác?`)) {
      await bulkDeleteCustomers(selectedIds);
      setSelectedIds([]);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Quản lý Khách hàng (CRM)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Theo dõi nhu cầu mua, thuê, sang nhượng, lịch sử chăm sóc và phân công môi giới phụ trách
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsTrashOpen(true)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Thùng rác khách hàng"
          >
            <Archive className="w-4 h-4" />
            <span>Thùng rác ({metrics.deletedCount})</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <UserPlus className="w-4 h-4 text-amber-400" />
            <span>Thêm khách hàng mới</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div
          onClick={() => { setQuickTab('ALL'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            quickTab === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={quickTab === 'ALL' ? 'text-slate-300 font-medium' : 'text-slate-500 font-medium'}>
              Tổng khách quản lý
            </span>
            <Users className={`w-4 h-4 ${quickTab === 'ALL' ? 'text-amber-400' : 'text-slate-400'}`} />
          </div>
          <div className="text-2xl font-black">{metrics.total}</div>
          <div className={`text-[11px] mt-1 ${quickTab === 'ALL' ? 'text-slate-400' : 'text-slate-500'}`}>
            {isAdmin ? 'Toàn công ty' : isTeamLeader ? 'Đội nhóm của bạn' : 'Của bạn'}
          </div>
        </div>

        <div
          onClick={() => { setQuickTab('HOT_LEADS'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            quickTab === 'HOT_LEADS'
              ? 'bg-rose-900 text-white border-rose-900 shadow-md'
              : 'bg-white text-slate-800 border-slate-200 hover:border-rose-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={quickTab === 'HOT_LEADS' ? 'text-rose-200 font-bold' : 'text-rose-700 font-bold'}>
              Khách Nóng (Hot)
            </span>
            <Flame className={`w-4 h-4 ${quickTab === 'HOT_LEADS' ? 'text-rose-300' : 'text-rose-500'}`} />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-300">{metrics.hotLeads}</div>
          <div className={`text-[11px] mt-1 ${quickTab === 'HOT_LEADS' ? 'text-rose-200' : 'text-slate-500'}`}>
            Tài chính sẵn sàng
          </div>
        </div>

        <div
          onClick={() => { setQuickTab('UPCOMING'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            quickTab === 'UPCOMING'
              ? 'bg-amber-900 text-white border-amber-900 shadow-md'
              : 'bg-white text-slate-800 border-slate-200 hover:border-amber-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={quickTab === 'UPCOMING' ? 'text-amber-200 font-bold' : 'text-amber-700 font-bold'}>
              Có lịch hẹn chăm sóc
            </span>
            <Calendar className={`w-4 h-4 ${quickTab === 'UPCOMING' ? 'text-amber-300' : 'text-amber-500'}`} />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-300">{metrics.upcomingApts}</div>
          <div className={`text-[11px] mt-1 ${quickTab === 'UPCOMING' ? 'text-amber-200' : 'text-slate-500'}`}>
            Hôm nay hoặc sắp tới
          </div>
        </div>

        <div
          onClick={() => { setStatusFilter('Đang thương lượng'); setCurrentPage(1); }}
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-500 font-medium">Đang đàm phán / Hẹn xem</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600">{metrics.inNegotiation}</div>
          <div className="text-[11px] text-slate-500 mt-1">Cơ hội chốt cọc cao</div>
        </div>

        <div
          onClick={() => { setStatusFilter('Đã giao dịch'); setCurrentPage(1); }}
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs transition-all cursor-pointer col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-emerald-700 font-bold">Đã chốt thành công</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{metrics.completed}</div>
          <div className="text-[11px] text-slate-500 mt-1">Giao dịch đã khớp</div>
        </div>
      </div>

      {/* Filter and Search Bar Container */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-100">
          {[
            { id: 'ALL', label: 'Tất cả khách hàng' },
            { id: 'MY_CUSTOMERS', label: 'Khách của tôi' },
            { id: 'MUA', label: 'Khách tìm Mua' },
            { id: 'THUE', label: 'Khách tìm Thuê' },
            { id: 'SANG_NHUONG', label: 'Khách Sang nhượng' },
            { id: 'HOT_LEADS', label: '🔥 Khách Nóng' },
            { id: 'UPCOMING', label: '📅 Có lịch hẹn tới' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setQuickTab(tab.id as any);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                quickTab === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Main Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search box */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm theo tên, SĐT, mã khách, email, ghi chú..."
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:border-slate-900 ring-slate-200"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Demand Filter */}
          <div className="lg:col-span-2">
            <select
              value={demandFilter}
              onChange={(e) => {
                setDemandFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:border-slate-900 ring-slate-200 font-medium"
            >
              <option value="ALL">Mọi nhu cầu (Mua/Thuê/SN)</option>
              <option value="MUA">Khách Mua BĐS</option>
              <option value="THUE">Khách Thuê BĐS</option>
              <option value="SANG_NHUONG">Khách Sang nhượng</option>
            </select>
          </div>

          {/* Potential Filter */}
          <div className="lg:col-span-2">
            <select
              value={potentialFilter}
              onChange={(e) => {
                setPotentialFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:border-slate-900 ring-slate-200 font-medium"
            >
              <option value="ALL">Mọi mức tiềm năng</option>
              <option value="Nóng">🔥 Nóng (Ưu tiên)</option>
              <option value="Tiềm năng">⭐ Tiềm năng</option>
              <option value="Tham khảo">🔎 Tham khảo</option>
              <option value="Chưa phù hợp">⚠️ Chưa phù hợp</option>
              <option value="Ngưng chăm sóc">🚫 Ngưng chăm sóc</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:border-slate-900 ring-slate-200 font-medium"
            >
              <option value="ALL">Mọi trạng thái</option>
              <option value="Mới tiếp nhận">Mới tiếp nhận</option>
              <option value="Đang tư vấn">Đang tư vấn</option>
              <option value="Đã gửi sản phẩm">Đã gửi sản phẩm</option>
              <option value="Đã hẹn xem">Đã hẹn xem</option>
              <option value="Đang thương lượng">Đang thương lượng</option>
              <option value="Đã giao dịch">Đã giao dịch</option>
              <option value="Tạm dừng">Tạm dừng</option>
              <option value="Không có nhu cầu">Không có nhu cầu</option>
            </select>
          </div>

          {/* Agent Filter (For Admin & Team Leader) */}
          {(isAdmin || isTeamLeader) && (
            <div className="lg:col-span-2">
              <select
                value={agentFilter}
                onChange={(e) => {
                  setAgentFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:border-slate-900 ring-slate-200 font-medium truncate"
              >
                <option value="ALL">Tất cả môi giới</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.employeeCode})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Active filter count & reset button */}
        {(searchQuery || demandFilter !== 'ALL' || potentialFilter !== 'ALL' || statusFilter !== 'ALL' || agentFilter !== 'ALL' || quickTab !== 'ALL') && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>
              Tìm thấy <strong className="text-slate-900">{totalItems}</strong> khách hàng phù hợp điều kiện lọc
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Đặt lại bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="bg-amber-400 text-slate-900 px-2.5 py-0.5 rounded-full">
              Đã chọn {selectedIds.length}
            </span>
            <span>khách hàng</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {(isAdmin || isTeamLeader) && (
              <button
                type="button"
                onClick={() => setIsBulkReassignOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                Chuyển người phụ trách
              </button>
            )}

            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-400 mr-1">Đổi trạng thái:</span>
              <button
                type="button"
                onClick={() => handleBulkStatus('Đang tư vấn')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-medium"
              >
                Đang tư vấn
              </button>
              <button
                type="button"
                onClick={() => handleBulkStatus('Đã hẹn xem')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-medium"
              >
                Đã hẹn xem
              </button>
              <button
                type="button"
                onClick={() => handleBulkStatus('Tạm dừng')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-400"
              >
                Tạm dừng
              </button>
            </div>

            <button
              type="button"
              onClick={handleBulkDelete}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Xóa vào thùng rác
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-400 hover:text-white underline ml-2"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Main Customers Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
            <div className="text-sm font-bold text-slate-700">Đang đồng bộ dữ liệu Firestore...</div>
          </div>
        ) : paginatedCustomers.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">Không tìm thấy khách hàng nào</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {accessibleCustomers.length === 0
                  ? 'Chưa có hồ sơ khách hàng nào trong hệ thống. Hãy thêm khách hàng đầu tiên để bắt đầu lưu trữ và đối soát nguồn hàng.'
                  : 'Không có khách hàng nào thỏa mãn các điều kiện tìm kiếm và bộ lọc hiện tại.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              {accessibleCustomers.length > 0 ? (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Xóa bộ lọc
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <UserPlus className="w-4 h-4 text-amber-400" />
                Thêm khách hàng mới
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && paginatedCustomers.every((c) => selectedIds.includes(c.id))}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                  </th>
                  <th className="py-3.5 px-4">Mã & Khách hàng</th>
                  <th className="py-3.5 px-4">Nhu cầu & Tiêu chí BĐS</th>
                  <th className="py-3.5 px-4">Ngân sách dự kiến</th>
                  <th className="py-3.5 px-4">Tiềm năng & Trạng thái</th>
                  <th className="py-3.5 px-4">Lịch hẹn tiếp theo</th>
                  <th className="py-3.5 px-4">Môi giới phụ trách</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCustomers.map((cust) => {
                  const isSelected = selectedIds.includes(cust.id);
                  const aptAnalysis = classifyAppointment(cust.nextAppointmentDate);

                  return (
                    <tr
                      key={cust.id}
                      className={`hover:bg-slate-50/80 transition-colors group ${
                        isSelected ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-4 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(cust.id)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                      </td>

                      {/* Customer info */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(cust)}
                              className="font-bold text-slate-900 hover:text-amber-600 transition-colors text-left"
                            >
                              {cust.fullName}
                            </button>
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-bold">
                              {cust.code}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-slate-500 font-mono text-[11px]">
                            <a
                              href={`tel:${cust.phone}`}
                              className="hover:text-emerald-700 flex items-center gap-1 font-semibold"
                            >
                              <Phone className="w-3 h-3 text-slate-400" />
                              {cust.phone}
                            </a>
                            {cust.zalo && (
                              <a
                                href={`https://zalo.me/${cust.zalo.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-0.5"
                              >
                                <MessageSquare className="w-3 h-3" />
                                Zalo
                              </a>
                            )}
                          </div>
                          {cust.address && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 truncate max-w-[200px]">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{cust.address}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Demand details */}
                      <td className="py-4 px-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <CustomerDemandBadge demandType={cust.demandType} />
                          </div>
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {cust.propertyTypes && cust.propertyTypes.slice(0, 2).map((t) => (
                              <span
                                key={t}
                                className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium"
                              >
                                {t}
                              </span>
                            ))}
                            {cust.propertyTypes && cust.propertyTypes.length > 2 && (
                              <span className="text-[10px] text-slate-400">+{cust.propertyTypes.length - 2}</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 truncate max-w-[220px]">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{cust.areas?.join(', ') || 'Toàn TP'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Budget */}
                      <td className="py-4 px-4 font-mono">
                        <div className="space-y-0.5">
                          <div className="font-extrabold text-slate-900 text-xs">
                            {cust.minPrice || cust.maxPrice ? (
                              <>
                                {cust.minPrice ? formatVND(cust.minPrice) : '0'}
                                {' — '}
                                {cust.maxPrice ? formatVND(cust.maxPrice) : '∞'}
                              </>
                            ) : (
                              <span className="text-slate-400 font-normal">Thương lượng</span>
                            )}
                          </div>
                          {(cust.minArea || cust.maxArea) && (
                            <div className="text-[11px] text-slate-500">
                              DT: {cust.minArea || '0'} - {cust.maxArea || '∞'} m²
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Potential & Status */}
                      <td className="py-4 px-4">
                        <div className="space-y-1.5">
                          <div>
                            <CustomerPotentialBadge level={cust.potentialLevel} />
                          </div>
                          <div>
                            <CustomerStatusBadge status={cust.status} />
                          </div>
                        </div>
                      </td>

                      {/* Next Appointment */}
                      <td className="py-4 px-4">
                        {cust.nextAppointmentDate ? (
                          <div className="space-y-1 p-2 bg-slate-50/90 rounded-xl border border-slate-200/90 max-w-[200px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] ${aptAnalysis.badgeClass}`}>
                                {aptAnalysis.label}
                              </span>
                            </div>
                            <div className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                              <span>{aptAnalysis.formattedDateTime}</span>
                            </div>
                            {cust.nextAppointmentNote && (
                              <div className="text-[10px] text-slate-600 line-clamp-1">
                                {cust.nextAppointmentNote}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Chưa đặt lịch</span>
                        )}
                      </td>

                      {/* Assigned Agent */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-800">{cust.assignedAgentName || 'Chưa có'}</div>
                          <div className="text-[11px] text-slate-400">{cust.teamName || '---'}</div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setInteractionCustomer(cust)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Ghi nhật ký chăm sóc"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(cust)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Xem chi tiết & đối soát nguồn hàng"
                          >
                            <Building className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(cust)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(cust.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Xóa mềm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {!isLoading && totalItems > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>Số dòng / trang:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-slate-900"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="flex-1 max-w-xl">
              <Pagination
                currentPage={currentPage}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={(page) => setCurrentPage(page)}
                showText={true}
              />
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}

      {/* 1. Add / Edit Modal */}
      {isFormOpen && (
        <CustomerFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          customer={editingCustomer}
          onSaved={(saved) => {
            if (detailCustomer && detailCustomer.id === saved.id) {
              setDetailCustomer(saved);
            }
          }}
        />
      )}

      {/* 2. Customer Detail Modal with Smart Matching */}
      {detailCustomer && (
        <CustomerDetailModal
          isOpen={!!detailCustomer}
          onClose={() => setDetailCustomer(null)}
          customer={detailCustomer}
          onEdit={(c) => {
            setDetailCustomer(null);
            handleOpenEdit(c);
          }}
          onDelete={(id) => {
            setDeleteConfirmId(id);
          }}
        />
      )}

      {/* 3. Add Interaction Modal */}
      {interactionCustomer && (
        <AddInteractionModal
          isOpen={!!interactionCustomer}
          onClose={() => setInteractionCustomer(null)}
          customer={interactionCustomer}
        />
      )}

      {/* 4. Single / Bulk Reassign Modal */}
      {(reassignCustomer || isBulkReassignOpen) && (
        <ReassignCustomerModal
          isOpen={!!reassignCustomer || isBulkReassignOpen}
          onClose={() => {
            setReassignCustomer(null);
            setIsBulkReassignOpen(false);
          }}
          customer={reassignCustomer}
          customerIds={isBulkReassignOpen ? selectedIds : []}
          onSuccess={() => {
            setSelectedIds([]);
          }}
        />
      )}

      {/* 5. Customer Trash Modal */}
      {isTrashOpen && (
        <CustomerTrashModal
          isOpen={isTrashOpen}
          onClose={() => setIsTrashOpen(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Xác nhận chuyển vào thùng rác</h3>
              <p className="text-xs text-slate-500">
                Khách hàng này sẽ được chuyển vào Thùng rác. Bạn có thể khôi phục lại bất kỳ lúc nào.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shadow-xs"
              >
                Xác nhận chuyển vào thùng rác
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
