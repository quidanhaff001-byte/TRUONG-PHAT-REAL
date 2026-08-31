import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Building2,
  Plus,
  LayoutGrid,
  List,
  Search,
  RotateCcw,
  SlidersHorizontal,
  MapPin,
  Share2,
  Edit,
  Eye,
  Trash2,
  CheckCircle2,
  Phone,
  UserCheck,
  Download,
  Printer,
  Copy,
  Check,
  Layers,
  TrendingUp,
  Tag,
  DollarSign,
  X,
  UserPlus,
  FileCheck,
  ChevronDown,
} from 'lucide-react';
import { Property, TransactionType, PropertyStatus, PropertyType } from '../../types';
import {
  formatVND,
  formatArea,
  formatDimensions,
  formatRelativeDate,
  maskPhoneNumber,
} from '../../utils/formatters';
import { exportPropertiesToCSV, generateZaloBrief, printPropertyListReport } from '../../utils/exportUtils';
import { StatusBadge, TransactionBadge } from '../../components/common/Badge';
import { Pagination } from '../../components/common/Pagination';
import { PropertyShareModal } from './PropertyShareModal';
import { ConfirmModal } from '../../components/common/ConfirmModal';

const VIETNAM_CITIES = [
  'Tất cả Tỉnh/TP',
  'An Giang',
  'Cần Thơ',
  'Kiên Giang',
  'Đồng Tháp',
  'Hồ Chí Minh',
  'Hà Nội',
  'Đà Nẵng',
  'Bình Dương',
];

const PROPERTY_TYPES: (PropertyType | 'ALL')[] = [
  'ALL',
  'Nhà phố',
  'Căn hộ / Chung cư',
  'Đất nền / Đất thổ cư',
  'Biệt thự / Villa',
  'Mặt bằng kinh doanh',
  'Tòa nhà văn phòng',
  'Kho xưởng / Đất công nghiệp',
  'Khách sạn / Nhà nghỉ',
  'Cửa hàng / Kiot',
];

const STATUS_LIST: PropertyStatus[] = [
  'Đang bán',
  'Đang cho thuê',
  'Đang sang nhượng',
  'Mới tiếp nhận',
  'Chờ xác minh',
  'Có khách quan tâm',
  'Đang thương lượng',
  'Đã nhận cọc',
  'Đã hoàn tất',
  'Tạm ngưng giao dịch',
];

const PRICE_PRESETS = [
  { label: 'Tất cả mức giá', min: undefined, max: undefined },
  { label: 'Dưới 3 Tỷ', min: 0, max: 3_000_000_000 },
  { label: '3 - 7 Tỷ', min: 3_000_000_000, max: 7_000_000_000 },
  { label: '7 - 15 Tỷ', min: 7_000_000_000, max: 15_000_000_000 },
  { label: '15 - 30 Tỷ', min: 15_000_000_000, max: 30_000_000_000 },
  { label: 'Trên 30 Tỷ', min: 30_000_000_000, max: undefined },
];

const AREA_PRESETS = [
  { label: 'Tất cả diện tích', min: undefined, max: undefined },
  { label: 'Dưới 50 m²', min: 0, max: 50 },
  { label: '50 - 100 m²', min: 50, max: 100 },
  { label: '100 - 200 m²', min: 100, max: 200 },
  { label: 'Trên 200 m²', min: 200, max: undefined },
];

export const PropertyList: React.FC = () => {
  const navigate = useNavigate();
  const {
    properties,
    filteredProperties,
    filterState,
    setFilterState,
    resetFilters,
    updatePropertyStatus,
    deleteProperty,
    bulkUpdateStatus,
    bulkAssignAgent,
    bulkDeleteProperties,
    users,
    teams,
  } = useData();
  const { canEditProperty, canViewConfidentialOwner, isAdmin } = useAuth();
  const { success, info } = useToast();

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [showFilterDrawer, setShowFilterDrawer] = useState<boolean>(false);
  const [shareProp, setShareProp] = useState<Property | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatusSelect, setBulkStatusSelect] = useState<string>('');
  const [bulkAgentSelect, setBulkAgentSelect] = useState<string>('');
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState<boolean>(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 12;

  const totalItems = filteredProperties.length;
  const paginatedProps = filteredProperties.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Calculated Management Metrics
  const managementStats = useMemo(() => {
    const active = properties.filter((p) => !p.isDeleted);
    const saleList = active.filter((p) => p.transactionType === 'SALE' || p.transactionType === 'SALE_AND_RENT');
    const rentList = active.filter((p) => p.transactionType === 'RENT' || p.transactionType === 'SALE_AND_RENT');
    const transferList = active.filter((p) => p.transactionType === 'TRANSFER');
    const negotiatingList = active.filter((p) => p.status === 'Đang thương lượng' || p.status === 'Có khách quan tâm' || p.status === 'Đã nhận cọc');

    const totalSaleValue = saleList.reduce((sum, p) => sum + (p.salePrice || 0), 0);
    const totalRentValue = rentList.reduce((sum, p) => sum + (p.rentPriceMonthly || 0), 0);
    const totalTransferValue = transferList.reduce((sum, p) => sum + (p.transferPrice || 0), 0);
    const totalEstValueBillion = Math.round((totalSaleValue + totalTransferValue) / 1_000_000_000);

    return {
      total: active.length,
      saleCount: saleList.length,
      rentCount: rentList.length,
      transferCount: transferList.length,
      negotiatingCount: negotiatingList.length,
      totalEstValueBillion,
      totalRentValueMillion: Math.round(totalRentValue / 1_000_000),
    };
  }, [properties]);

  // Selection handlers
  const isAllPageSelected = paginatedProps.length > 0 && paginatedProps.every((p) => selectedIds.includes(p.id));

  const toggleSelectAllPage = () => {
    if (isAllPageSelected) {
      const pageIds = new Set(paginatedProps.map((p) => p.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      const pageIds = paginatedProps.map((p) => p.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  // Bulk actions
  const handleBulkStatusChange = async (newStatus: PropertyStatus) => {
    if (selectedIds.length === 0 || !newStatus) return;
    await bulkUpdateStatus(selectedIds, newStatus);
    setBulkStatusSelect('');
  };

  const handleBulkAgentAssign = async (agentId: string) => {
    if (selectedIds.length === 0 || !agentId) return;
    await bulkAssignAgent(selectedIds, agentId);
    setBulkAgentSelect('');
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedIds.length === 0) return;
    await bulkDeleteProperties(selectedIds);
    setSelectedIds([]);
    setShowBulkDeleteModal(false);
  };

  const handleExportSelectedOrAll = () => {
    const targetProps =
      selectedIds.length > 0
        ? filteredProperties.filter((p) => selectedIds.includes(p.id))
        : filteredProperties;
    exportPropertiesToCSV(targetProps, `Danh_sach_BDS_${new Date().toISOString().slice(0, 10)}.csv`);
    success('Xuất file thành công', `Đã xuất ${targetProps.length} bất động sản ra file Excel/CSV`);
  };

  const handlePrintSelectedOrAll = () => {
    const targetProps =
      selectedIds.length > 0
        ? filteredProperties.filter((p) => selectedIds.includes(p.id))
        : filteredProperties;
    printPropertyListReport(targetProps);
  };

  const handleCopyZalo = (property: Property, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = generateZaloBrief(property);
    navigator.clipboard.writeText(text);
    setCopiedId(property.id);
    success('Đã sao chép tin đăng Zalo', `Nội dung rút gọn của mã ${property.code} đã sẵn sàng.`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleTransactionTab = (type: TransactionType | 'ALL') => {
    setFilterState((prev) => ({ ...prev, transactionType: type }));
    setCurrentPage(1);
  };

  const handleStatusChange = async (id: string, newStatus: PropertyStatus) => {
    await updatePropertyStatus(id, newStatus);
    success('Đã cập nhật trạng thái', newStatus);
  };

  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await deleteProperty(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header & High-Level Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-[#001f3f] tracking-tight">
              Quản lý nguồn hàng bất động sản
            </h1>
            <span className="text-xs font-bold text-[#001f3f] bg-[#D4AF37]/20 px-2.5 py-0.5 rounded-full border border-[#D4AF37]/40">
              {totalItems} BĐS
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Trung tâm quản lý, phân bổ nguồn hàng bán, cho thuê và sang nhượng trên toàn hệ thống.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Export button */}
          <button
            type="button"
            onClick={handleExportSelectedOrAll}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs rounded-xl border border-gray-200 shadow-xs transition-colors"
            title="Xuất Excel/CSV toàn bộ hoặc các mục đã chọn"
          >
            <Download className="w-4 h-4 text-[#D4AF37]" />
            <span>Xuất Excel</span>
          </button>

          {/* Print Report button */}
          <button
            type="button"
            onClick={handlePrintSelectedOrAll}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs rounded-xl border border-gray-200 shadow-xs transition-colors"
            title="In báo cáo danh mục nguồn hàng"
          >
            <Printer className="w-4 h-4 text-[#001f3f]" />
            <span>In danh mục</span>
          </button>

          {/* New Property CTA */}
          <button
            type="button"
            onClick={() => navigate('/properties/new')}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#001f3f] hover:bg-[#002e5c] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-98"
          >
            <Plus className="w-4 h-4 text-[#D4AF37]" />
            <span>Ký gửi BĐS mới</span>
          </button>
        </div>
      </div>

      {/* Operational KPI Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => handleTransactionTab('ALL')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            filterState.transactionType === 'ALL'
              ? 'bg-[#001f3f] text-white border-[#001f3f] shadow-sm'
              : 'bg-white text-gray-700 border-gray-200 hover:border-[#D4AF37]/50'
          }`}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider opacity-75">Tất cả nguồn hàng</div>
          <div className="text-xl font-bold mt-0.5">{managementStats.total}</div>
        </div>

        <div
          onClick={() => handleTransactionTab('SALE')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            filterState.transactionType === 'SALE'
              ? 'bg-[#001f3f] text-white border-[#001f3f] shadow-sm'
              : 'bg-white text-gray-700 border-gray-200 hover:border-[#D4AF37]/50'
          }`}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider opacity-75">Ký gửi Bán</div>
          <div className="text-xl font-bold mt-0.5 text-emerald-600">{managementStats.saleCount}</div>
        </div>

        <div
          onClick={() => handleTransactionTab('RENT')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            filterState.transactionType === 'RENT'
              ? 'bg-[#001f3f] text-white border-[#001f3f] shadow-sm'
              : 'bg-white text-gray-700 border-gray-200 hover:border-[#D4AF37]/50'
          }`}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider opacity-75">Cho thuê</div>
          <div className="text-xl font-bold mt-0.5 text-blue-600">{managementStats.rentCount}</div>
        </div>

        <div
          onClick={() => handleTransactionTab('TRANSFER')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            filterState.transactionType === 'TRANSFER'
              ? 'bg-[#001f3f] text-white border-[#001f3f] shadow-sm'
              : 'bg-white text-gray-700 border-gray-200 hover:border-[#D4AF37]/50'
          }`}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider opacity-75">Sang nhượng</div>
          <div className="text-xl font-bold mt-0.5 text-amber-600">{managementStats.transferCount}</div>
        </div>

        <div
          onClick={() => {
            setFilterState((prev) => ({ ...prev, status: 'Đang thương lượng' }));
            setCurrentPage(1);
          }}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            filterState.status === 'Đang thương lượng'
              ? 'bg-[#001f3f] text-white border-[#001f3f] shadow-sm'
              : 'bg-white text-gray-700 border-gray-200 hover:border-[#D4AF37]/50'
          }`}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider opacity-75">Đang có khách</div>
          <div className="text-xl font-bold mt-0.5 text-indigo-600">{managementStats.negotiatingCount}</div>
        </div>

        <div className="p-3 bg-[#D4AF37]/15 rounded-xl border border-[#D4AF37]/40 flex flex-col justify-between">
          <div className="text-[10px] font-bold text-[#001f3f] uppercase tracking-wider">Tổng giá trị rổ hàng</div>
          <div className="text-lg font-black text-[#001f3f]">~{managementStats.totalEstValueBillion} Tỷ</div>
        </div>
      </div>

      {/* Floating Bulk Management Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-[#001f3f] text-white p-3 rounded-2xl border border-[#D4AF37]/40 shadow-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <span className="bg-[#D4AF37] text-[#001f3f] text-xs font-black px-2.5 py-1 rounded-lg">
              Đã chọn: {selectedIds.length} BĐS
            </span>
            <button
              onClick={clearSelection}
              className="text-xs text-gray-300 hover:text-white underline ml-1"
            >
              Bỏ chọn tất cả
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Bulk Status Select */}
            <select
              value={bulkStatusSelect}
              onChange={(e) => {
                const val = e.target.value as PropertyStatus;
                setBulkStatusSelect(val);
                if (val) handleBulkStatusChange(val);
              }}
              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-[#D4AF37] cursor-pointer"
            >
              <option value="" className="text-gray-900">
                ⚡ Đổi trạng thái hàng loạt...
              </option>
              {STATUS_LIST.map((st) => (
                <option key={st} value={st} className="text-gray-900">
                  {st}
                </option>
              ))}
            </select>

            {/* Bulk Agent Assign Select */}
            <select
              value={bulkAgentSelect}
              onChange={(e) => {
                const agentId = e.target.value;
                setBulkAgentSelect(agentId);
                if (agentId) handleBulkAgentAssign(agentId);
              }}
              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-[#D4AF37] cursor-pointer"
            >
              <option value="" className="text-gray-900">
                👤 Phân công môi giới...
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id} className="text-gray-900">
                  {u.fullName} ({u.employeeCode})
                </option>
              ))}
            </select>

            {/* Export Selected */}
            <button
              onClick={handleExportSelectedOrAll}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-semibold text-white flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Xuất {selectedIds.length} mục</span>
            </button>

            {/* Delete Selected (Admin) */}
            {isAdmin && (
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa {selectedIds.length} mục</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Search & Controls Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm nhanh theo mã BĐS (VD: B-001), đường, quận, số thửa/tờ, tên chủ..."
              value={filterState.searchQuery}
              onChange={(e) => {
                setFilterState((prev) => ({ ...prev, searchQuery: e.target.value }));
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-12 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] transition-all placeholder:text-gray-400 font-medium"
            />
            {filterState.searchQuery && (
              <button
                onClick={() => setFilterState((prev) => ({ ...prev, searchQuery: '' }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-full w-5 h-5 flex items-center justify-center"
              >
                ×
              </button>
            )}
          </div>

          {/* Quick Dropdowns & View toggles */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Property Type Dropdown */}
            <select
              value={filterState.propertyType}
              onChange={(e) => {
                setFilterState((prev) => ({ ...prev, propertyType: e.target.value as any }));
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="ALL">Tất cả loại BĐS</option>
              {PROPERTY_TYPES.filter((t) => t !== 'ALL').map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            {/* Status Dropdown */}
            <select
              value={filterState.status}
              onChange={(e) => {
                setFilterState((prev) => ({ ...prev, status: e.target.value as any }));
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="ALL">Tất cả trạng thái</option>
              {STATUS_LIST.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            {/* Advanced Filters Drawer Toggle */}
            <button
              type="button"
              onClick={() => setShowFilterDrawer(!showFilterDrawer)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                showFilterDrawer
                  ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#001f3f]'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
              title="Bộ lọc nâng cao"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#D4AF37]" />
              <span className="hidden md:inline">Lọc chi tiết</span>
            </button>

            {/* View Mode (Table / Grid) */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'table' ? 'bg-white text-[#001f3f] shadow-xs' : 'text-gray-500 hover:text-gray-800'
                }`}
                title="Dạng bảng quản lý chi tiết"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-white text-[#001f3f] shadow-xs' : 'text-gray-500 hover:text-gray-800'
                }`}
                title="Dạng lưới thẻ bất động sản"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Advanced Filters Drawer */}
        {showFilterDrawer && (
          <div className="pt-3 border-t border-gray-100 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* City */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Tỉnh / Thành phố</label>
                <select
                  value={filterState.city}
                  onChange={(e) => setFilterState((prev) => ({ ...prev, city: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:border-[#D4AF37]"
                >
                  {VIETNAM_CITIES.map((c) => (
                    <option key={c} value={c === 'Tất cả Tỉnh/TP' ? 'ALL' : c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price preset */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Khoảng giá</label>
                <select
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    const preset = PRICE_PRESETS[idx];
                    setFilterState((prev) => ({ ...prev, minPrice: preset.min, maxPrice: preset.max }));
                  }}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:border-[#D4AF37]"
                >
                  {PRICE_PRESETS.map((p, idx) => (
                    <option key={idx} value={idx}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Area preset */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Diện tích</label>
                <select
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    const preset = AREA_PRESETS[idx];
                    setFilterState((prev) => ({ ...prev, minArea: preset.min, maxArea: preset.max }));
                  }}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:border-[#D4AF37]"
                >
                  {AREA_PRESETS.map((a, idx) => (
                    <option key={idx} value={idx}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assigned Agent */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Môi giới phụ trách</label>
                <select
                  value={filterState.assignedAgentId}
                  onChange={(e) => setFilterState((prev) => ({ ...prev, assignedAgentId: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="ALL">Tất cả nhân sự</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.employeeCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sub-row filters */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none font-medium">
                  <input
                    type="checkbox"
                    checked={filterState.hasImagesOnly}
                    onChange={(e) => setFilterState((prev) => ({ ...prev, hasImagesOnly: e.target.checked }))}
                    className="rounded text-[#D4AF37] focus:ring-[#D4AF37] border-gray-300"
                  />
                  <span>Chỉ hiện có ảnh</span>
                </label>
              </div>

              <button
                type="button"
                onClick={resetFilters}
                className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 font-bold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại lọc</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content Rendering: Table vs Grid */}
      {paginatedProps.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-xs">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto text-gray-400 mb-3">
            <Building2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-gray-900">Không tìm thấy bất động sản phù hợp</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Thử thay đổi từ khóa tìm kiếm hoặc đặt lại các tiêu chí bộ lọc để hiển thị toàn bộ nguồn hàng.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl"
            >
              Xóa bộ lọc
            </button>
            <button
              onClick={() => navigate('/properties/new')}
              className="px-4 py-2 bg-[#001f3f] text-[#D4AF37] hover:bg-[#002e5c] text-xs font-bold rounded-xl"
            >
              Thêm BĐS mới
            </button>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* ================= TABLE VIEW ================= */
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={toggleSelectAllPage}
                      className="rounded border-gray-300 text-[#001f3f] focus:ring-[#D4AF37] cursor-pointer"
                      title="Chọn tất cả trang này"
                    />
                  </th>
                  <th className="py-3 px-3">Mã BĐS</th>
                  <th className="py-3 px-3 min-w-[240px]">Hình ảnh & Tiêu đề</th>
                  <th className="py-3 px-3">Giao dịch</th>
                  <th className="py-3 px-3">Mức Giá</th>
                  <th className="py-3 px-3">Diện tích</th>
                  <th className="py-3 px-3">Chủ nhà & SĐT</th>
                  <th className="py-3 px-3">Trạng thái</th>
                  <th className="py-3 px-3">Môi giới</th>
                  <th className="py-3 px-3 text-right min-w-[140px]">Thao tác nhanh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedProps.map((p) => {
                  const isOwnerVisible = canViewConfidentialOwner(p.createdBy, p.assignedAgentId);
                  const canEdit = canEditProperty(p.createdBy, p.assignedAgentId);
                  const isSelected = selectedIds.includes(p.id);

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-gray-50/80 transition-colors ${
                        isSelected ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(p.id)}
                          className="rounded border-gray-300 text-[#001f3f] focus:ring-[#D4AF37] cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-[#001f3f] whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-[#001f3f]/5 rounded border border-[#001f3f]/10">
                          {p.code}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          {p.coverImage ? (
                            <img
                              src={p.coverImage}
                              alt={p.title}
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-200 shadow-xs cursor-pointer hover:scale-105 transition-transform"
                              onClick={() => navigate(`/properties/${p.id}`)}
                            />
                          ) : (
                            <div
                              onClick={() => navigate(`/properties/${p.id}`)}
                              className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 shrink-0 cursor-pointer"
                            >
                              <Building2 className="w-5 h-5 opacity-50" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div
                              onClick={() => navigate(`/properties/${p.id}`)}
                              className="font-bold text-gray-900 hover:text-[#001f3f] cursor-pointer truncate max-w-xs text-xs"
                              title={p.title}
                            >
                              {p.title}
                            </div>
                            <div className="text-[11px] text-gray-500 truncate max-w-xs flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                              <span>{p.address}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <TransactionBadge type={p.transactionType} />
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-extrabold text-sm text-[#001f3f]">
                          {p.salePrice
                            ? formatVND(p.salePrice)
                            : p.rentPriceMonthly
                            ? `${formatVND(p.rentPriceMonthly)}/th`
                            : p.transferPrice
                            ? `Sang ${formatVND(p.transferPrice)}`
                            : 'Thỏa thuận'}
                        </div>
                        {p.commissionRate && (
                          <div className="text-[10px] text-emerald-600 font-semibold">
                            HH: {p.commissionRate}%
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-bold text-gray-800">{formatArea(p.landArea)}</div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          {formatDimensions(p.width, p.length)}
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        {isOwnerVisible ? (
                          <>
                            <div className="font-semibold text-gray-900">{p.ownerName}</div>
                            <div className="text-[11px] font-mono text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-400" />
                              <span>{p.ownerPhone}</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-gray-400 text-[11px] flex items-center gap-1 italic">
                            <Lock className="w-3 h-3 text-gray-400" />
                            <span>Bảo mật</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <select
                          value={p.status}
                          onChange={(e) => handleStatusChange(p.id, e.target.value as PropertyStatus)}
                          disabled={!canEdit}
                          className="bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 p-1.5 focus:outline-none focus:border-[#D4AF37] disabled:opacity-75 cursor-pointer shadow-2xs"
                        >
                          {STATUS_LIST.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-gray-700">
                        <div className="font-semibold text-gray-800 text-xs">
                          {p.assignedAgentName || 'Chưa gán'}
                        </div>
                        {p.teamName && (
                          <div className="text-[10px] text-gray-400">{p.teamName}</div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* 1-Click Copy Zalo Brief */}
                          <button
                            onClick={(e) => handleCopyZalo(p, e)}
                            className="p-1.5 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Sao chép tin đăng nhanh gửi Zalo"
                          >
                            {copiedId === p.id ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          {/* Share Modal */}
                          <button
                            onClick={() => setShareProp(p)}
                            className="p-1.5 text-gray-600 hover:text-[#D4AF37] hover:bg-amber-50 rounded-lg transition-colors"
                            title="Tạo tin quảng cáo & QR"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          {/* View Detail */}
                          <button
                            onClick={() => navigate(`/properties/${p.id}`)}
                            className="p-1.5 text-gray-600 hover:text-[#001f3f] hover:bg-gray-100 rounded-lg transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          {canEdit && (
                            <button
                              onClick={() => navigate(`/properties/${p.id}/edit`)}
                              className="p-1.5 text-gray-600 hover:text-[#001f3f] hover:bg-gray-100 rounded-lg transition-colors"
                              title="Chỉnh sửa thông tin"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete */}
                          {isAdmin && (
                            <button
                              onClick={() => setDeleteTarget(p)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Xóa vào thùng rác"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ================= GRID VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {paginatedProps.map((p) => {
            const isOwnerVisible = canViewConfidentialOwner(p.createdBy, p.assignedAgentId);
            const canEdit = canEditProperty(p.createdBy, p.assignedAgentId);
            const isSelected = selectedIds.includes(p.id);

            return (
              <div
                key={p.id}
                className={`group bg-white rounded-2xl border transition-all flex flex-col overflow-hidden shadow-xs hover:shadow-md ${
                  isSelected ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/30' : 'border-gray-200 hover:border-[#D4AF37]/60'
                }`}
              >
                {/* Card Cover */}
                <div className="relative h-48 bg-gray-100 overflow-hidden shrink-0">
                  {p.coverImage ? (
                    <img
                      src={p.coverImage}
                      alt={p.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                      <Building2 className="w-10 h-10 mb-1 opacity-50" />
                      <span className="text-[11px]">Chưa có hình ảnh</span>
                    </div>
                  )}

                  {/* Top overlay badges & selection checkbox */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap z-10">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOne(p.id)}
                      className="rounded border-gray-300 text-[#001f3f] focus:ring-[#D4AF37] cursor-pointer bg-white/90 shadow-sm"
                    />
                    <span className="px-2 py-0.5 bg-[#001f3f]/90 text-[#D4AF37] font-mono font-bold text-xs rounded-md shadow-xs backdrop-blur-xs border border-[#D4AF37]/30">
                      {p.code}
                    </span>
                    <TransactionBadge type={p.transactionType} />
                  </div>

                  {/* Top Right Quick Actions */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                    <button
                      onClick={(e) => handleCopyZalo(p, e)}
                      className="p-2 bg-white/90 hover:bg-white text-gray-700 hover:text-emerald-600 rounded-xl shadow-md transition-all hover:scale-105 backdrop-blur-xs"
                      title="Sao chép tóm tắt Zalo"
                    >
                      {copiedId === p.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShareProp(p);
                      }}
                      className="p-2 bg-white/90 hover:bg-white text-gray-700 hover:text-[#001f3f] rounded-xl shadow-md transition-all hover:scale-105 backdrop-blur-xs"
                      title="Tạo tin quảng cáo Facebook/Zalo & QR"
                    >
                      <Share2 className="w-4 h-4 text-[#D4AF37]" />
                    </button>
                  </div>

                  {/* Bottom Price banner */}
                  <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-gray-950/85 via-gray-950/45 to-transparent flex items-center justify-between text-white">
                    <div className="font-black text-sm text-[#D4AF37] drop-shadow-xs">
                      {p.salePrice
                        ? formatVND(p.salePrice)
                        : p.rentPriceMonthly
                        ? `${formatVND(p.rentPriceMonthly)}/tháng`
                        : p.transferPrice
                        ? `Sang ${formatVND(p.transferPrice)}`
                        : 'Thỏa thuận'}
                    </div>
                    {p.legalType && (
                      <div className="text-[10px] bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded text-white flex items-center gap-1">
                        <FileCheck className="w-3 h-3 text-[#D4AF37]" />
                        {p.legalType}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    {/* Status & Property Type */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                        {p.propertyType}
                      </span>
                      <StatusBadge status={p.status} />
                    </div>

                    {/* Title */}
                    <h3
                      onClick={() => navigate(`/properties/${p.id}`)}
                      className="font-bold text-sm text-[#001f3f] hover:text-[#D4AF37] transition-colors line-clamp-2 cursor-pointer leading-snug"
                    >
                      {p.title}
                    </h3>

                    {/* Address */}
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1.5 line-clamp-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{p.address}</span>
                    </div>

                    {/* Specifications Row */}
                    <div className="grid grid-cols-3 gap-2 p-2 bg-gray-50 rounded-xl mt-3 text-center border border-gray-100 text-xs">
                      <div>
                        <div className="text-[10px] text-gray-400 font-semibold">Diện tích</div>
                        <div className="font-bold text-[#001f3f]">{formatArea(p.landArea)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400 font-semibold">Kích thước</div>
                        <div className="font-bold text-gray-800 text-[11px]">
                          {formatDimensions(p.width, p.length)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400 font-semibold">Hướng</div>
                        <div className="font-bold text-gray-800 text-[11px] truncate">
                          {p.direction || 'Đông Nam'}
                        </div>
                      </div>
                    </div>

                    {/* Owner Info Bar */}
                    {isOwnerVisible && (
                      <div className="mt-3 p-2 bg-gray-100/80 rounded-xl flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1 text-gray-700">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span>Chủ: <strong>{p.ownerName}</strong></span>
                        </div>
                        <span className="font-mono text-gray-800 font-bold">
                          {p.ownerPhone}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Assignee & Actions */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 min-w-0">
                      <UserCheck className="w-3.5 h-3.5 text-[#001f3f] shrink-0" />
                      <span className="truncate text-[11px]">
                        MG: <strong className="text-[#001f3f]">{p.assignedAgentName || 'Chưa gán'}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/properties/${p.id}`)}
                        className="p-1.5 text-gray-600 hover:text-[#001f3f] hover:bg-gray-100 rounded-lg transition-colors"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {canEdit && (
                        <button
                          onClick={() => navigate(`/properties/${p.id}/edit`)}
                          className="p-1.5 text-gray-600 hover:text-[#001f3f] hover:bg-gray-100 rounded-lg transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Xóa vào thùng rác"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={(page) => setCurrentPage(page)}
      />

      {/* Social Post / Marketing Share Modal */}
      <PropertyShareModal property={shareProp} isOpen={!!shareProp} onClose={() => setShareProp(null)} />

      {/* Single Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Chuyển vào thùng rác"
        message={`Bạn có chắc chắn muốn chuyển bất động sản "${deleteTarget?.title}" (${deleteTarget?.code}) vào thùng rác? Bạn có thể khôi phục lại bất kỳ lúc nào trong mục Thùng rác.`}
        confirmText="Xác nhận xóa"
        variant="danger"
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleBulkDeleteConfirm}
        title="Xóa hàng loạt bất động sản"
        message={`Bạn có chắc chắn muốn chuyển ${selectedIds.length} bất động sản đã chọn vào thùng rác?`}
        confirmText={`Xác nhận xóa ${selectedIds.length} BĐS`}
        variant="danger"
      />
    </div>
  );
};
