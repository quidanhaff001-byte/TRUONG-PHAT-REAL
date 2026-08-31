import React, { useState, useMemo } from 'react';
import {
  BadgePercent,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Building,
  User,
  DollarSign,
  Calendar,
  FileText,
  Printer,
  ChevronRight,
  ArrowRight,
  Layers,
  AlertCircle,
  Eye,
  ShieldCheck,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Badge } from '../../components/common/Badge';

const TRANSACTION_STEPS = [
  { step: 1, name: 'Đặt cọc', desc: 'Lập phiếu cọc & ký thỏa thuận mua bán' },
  { step: 2, name: 'Hồ sơ pháp lý', desc: 'Thẩm định trích lục, số tờ số thửa' },
  { step: 3, name: 'Công chứng', desc: 'Ký hợp đồng tại văn phòng công chứng' },
  { step: 4, name: 'Thuế & Đăng bộ', desc: 'Nộp thuế TNCN & đăng bộ sang tên' },
  { step: 5, name: 'Bàn giao tài sản', desc: 'Bàn giao chìa khóa, hiện trạng nhà đất' },
  { step: 6, name: 'Hoàn tất & Hoa hồng', desc: 'Quyết toán và phân chia phí hoa hồng' },
];

export const SalesTransactions: React.FC = () => {
  const {
    transactions,
    properties,
    customers,
    users,
    addTransaction,
    updateTransaction,
    updateTransactionStatus,
    deleteTransaction,
    addCommission,
  } = useData();
  const { currentUser, isTeamLeader } = useAuth();
  const { success, error, info } = useToast();

  const [viewMode, setViewMode] = useState<'KANBAN' | 'LIST'>('LIST');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'SALE' | 'TRANSFER'>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // New Transaction Form State
  const [type, setType] = useState<'SALE' | 'TRANSFER'>('SALE');
  const [propertyId, setPropertyId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [dealPrice, setDealPrice] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);
  const [notarizationDate, setNotarizationDate] = useState('');
  const [handoverDate, setHandoverDate] = useState('');
  const [expectedCommission, setExpectedCommission] = useState<number>(0);
  const [commissionRate, setCommissionRate] = useState<number>(2.0);
  const [listingAgentId, setListingAgentId] = useState('');
  const [sellingAgentId, setSellingAgentId] = useState(currentUser?.id || '');
  const [notes, setNotes] = useState('');

  // Filtered list
  const filteredTransactions纯 = useMemo(() => {
    return transactions.filter((tr) => {
      if (filterType !== 'ALL' && tr.type !== filterType) return false;
      if (filterStatus !== 'ALL' && tr.status !== filterStatus) return false;
      if (searchQuery) {
        const q的的 = searchQuery.toLowerCase();
        const matchCode = tr.code.toLowerCase().includes(q的的);
        const matchProp = tr.propertyTitle.toLowerCase().includes(q的的) || tr.propertyCode.toLowerCase().includes(q的的);
        const matchBuyer = tr.buyerName.toLowerCase().includes(q的的) || tr.buyerPhone.includes(q的的);
        const matchSeller = tr.sellerName.toLowerCase().includes(q的的);
        if (!matchCode && !matchProp && !matchBuyer && !matchSeller) return false;
      }
      return true;
    });
  }, [transactions, filterType, filterStatus, searchQuery]);

  // Handle Property Selection change in Add Form
  const handleSelectProperty = (pId: string) => {
    setPropertyId(pId);
    const prop = properties.find((p) => p.id === pId);
    if (prop) {
      const price = prop.salePrice || prop.transferPrice || 0;
      setDealPrice(price);
      setDepositAmount(Math.round(price * 0.05)); // 5% default deposit
      setExpectedCommission(Math.round(price * 0.02)); // 2% default commission
      setListingAgentId(prop.assignedAgentId || '');
    }
  };

  // Handle Add Transaction Submit
  const handleAddSubmit阿拉伯 = async (e: React.FormEvent) => {
    e.preventDefault();
    const prop = properties.find((p) => p.id === propertyId);
    const cust = customers.find((c) => c.id === customerId);
    const listingAgent = users.find((u) => u.id === listingAgentId);
    const sellingAgent = users.find((u) => u.id === sellingAgentId);

    if (!prop) {
      error('Vui lòng chọn bất động sản giao dịch');
      return;
    }
    if (!cust) {
      error('Vui lòng chọn khách mua / nhận chuyển nhượng');
      return;
    }

    try {
      const newTr = await addTransaction({
        code: '', // auto generated
        type,
        status: 'Đã đặt cọc',
        step: 1,
        propertyId: prop.id,
        propertyCode: prop.code,
        propertyTitle: prop.title,
        propertyAddress: prop.address,
        sellerName: prop.ownerName,
        sellerPhone: prop.ownerPhone,
        buyerId: cust.id,
        buyerName: cust.fullName,
        buyerPhone: cust.phone,
        dealPrice,
        depositAmount,
        depositDate,
        notarizationDate: notarizationDate || undefined,
        handoverDate: handoverDate || undefined,
        expectedCommission,
        commissionRate,
        listingAgentId: listingAgent?.id || prop.assignedAgentId,
        listingAgentName: listingAgent?.fullName || prop.assignedAgentName,
        sellingAgentId: sellingAgent?.id || currentUser?.id,
        sellingAgentName: sellingAgent?.fullName || currentUser?.fullName,
        teamId: sellingAgent?.teamId || currentUser?.teamId,
        notes,
      });

      // Auto create draft Commission Record for this deal
      if (expectedCommission > 0) {
        await addCommission({
          dealId: newTr.id,
          dealCode: newTr.code,
          dealType: type,
          propertyCode: prop.code,
          propertyTitle: prop.title,
          customerName: cust.fullName,
          dealPrice,
          commissionRate,
          totalExpectedCommission: expectedCommission,
          companySharePercent: 30,
          companyAmount: Math.round(expectedCommission * 0.3),
          leaderSharePercent: 10,
          leaderAmount: Math.round(expectedCommission * 0.1),
          splits: [
            {
              id: `split_${Date.now()}_1`,
              role: 'COMPANY',
              beneficiaryId: 'company',
              beneficiaryName: 'Công ty BĐS Trường Phát Real',
              percentage: 30,
              amount: Math.round(expectedCommission * 0.3),
              isPaid: false,
            },
            {
              id: `split_${Date.now()}_2`,
              role: 'LISTING_AGENT',
              beneficiaryId: listingAgent?.id || 'agent_1',
              beneficiaryName: listingAgent?.fullName || 'Đầu nguồn BĐS',
              percentage: 30,
              amount: Math.round(expectedCommission * 0.3),
              isPaid: false,
            },
            {
              id: `split_${Date.now()}_3`,
              role: 'SELLING_AGENT',
              beneficiaryId: sellingAgent?.id || currentUser?.id || 'agent_2',
              beneficiaryName: sellingAgent?.fullName || 'Đầu bán chốt deal',
              percentage: 30,
              amount: Math.round(expectedCommission * 0.3),
              isPaid: false,
            },
            {
              id: `split_${Date.now()}_4`,
              role: 'LEADER',
              beneficiaryId: 'leader_1',
              beneficiaryName: 'Trưởng phòng kinh doanh',
              percentage: 10,
              amount: Math.round(expectedCommission * 0.1),
              isPaid: false,
            },
          ],
          collectedAmount: 0,
          remainingCommission: expectedCommission,
          status: 'CHUA_THU',
        });
      }

      setIsAddModalOpen(false);
      success('Tạo giao dịch thành công', `Đã lưu hồ sơ giao dịch ${newTr.code}`);
    } catch (err: any) {
      error('Lỗi tạo giao dịch: ' + err.message);
    }
  };

  // Advance pipeline step
  const handleAdvanceStep = async (tr: Transaction, nextStep: number) => {
    let newStatus: Transaction['status'] = tr.status;
    if (nextStep === 2) newStatus = 'Đang làm thủ tục';
    if (nextStep === 3) newStatus = 'Đã công chứng';
    if (nextStep === 4) newStatus = 'Đã công chứng';
    if (nextStep === 5) newStatus = 'Chờ bàn giao';
    if (nextStep === 6) newStatus = 'Hoàn tất';

    await updateTransactionStatus(tr.id, newStatus, nextStep);
    success(`Đã chuyển giao dịch sang bước ${nextStep}: ${TRANSACTION_STEPS[nextStep - 1].name}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl">
              <BadgePercent className="w-6 h-6" />
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-[#001f3f]">
              Quy Trình Bán & Sang Nhượng BĐS
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi tiến độ từ nhận cọc, công chứng, đăng bộ sổ hồng đến tất toán hoa hồng.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-[#001f3f] text-white hover:bg-[#002f5f] rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all"
          >
            <Plus className="w-4 h-4 text-[#D4AF37]" />
            <span>Tạo Giao Dịch Mới</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã giao dịch, tên BĐS, người mua, người bán..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#001f3f] outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterType}
            onChange={(e: any) => setFilterType(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 outline-none"
          >
            <option value="ALL">Tất cả loại giao dịch</option>
            <option value="SALE">Mua Bán BĐS</option>
            <option value="TRANSFER">Sang Nhượng Quyền Sử Dụng</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 outline-none"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="Đã đặt cọc">Đã đặt cọc</option>
            <option value="Chờ công chứng">Chờ công chứng</option>
            <option value="Đã công chứng">Đã công chứng</option>
            <option value="Đang sang tên">Đang sang tên</option>
            <option value="Hoàn tất">Hoàn tất</option>
            <option value="Hủy cọc">Hủy cọc</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Danh sách hồ sơ giao dịch ({filteredTransactions纯.length})
          </span>
        </div>

        {filteredTransactions纯.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <BadgePercent className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-semibold">Chưa có giao dịch mua bán nào</p>
            <p className="text-xs text-slate-400">Hãy thêm hồ sơ giao dịch đầu tiên để bắt đầu theo dõi tiến độ.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTransactions纯.map((tr) => {
              const currentStep = tr.step || 1;
              const isCompleted = tr.status === 'Hoàn tất';

              return (
                <div key={tr.id} className="p-5 hover:bg-slate-50/70 transition-colors space-y-4">
                  {/* Transaction Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-mono font-bold text-[#001f3f] bg-slate-100 px-2 py-0.5 rounded">
                          {tr.code}
                        </span>
                        <h3 className="font-bold text-sm text-slate-900">{tr.propertyTitle}</h3>
                        <Badge variant={isCompleted ? 'success' : tr.status === 'Hủy cọc' ? 'danger' : 'primary'}>
                          {tr.status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span>
                          BĐS: <strong className="font-mono text-[#001f3f]">{tr.propertyCode}</strong>
                        </span>
                        <span>
                          Bên Bán: <strong>{tr.sellerName}</strong> ({tr.sellerPhone})
                        </span>
                        <span>
                          Bên Mua: <strong>{tr.buyerName}</strong> ({tr.buyerPhone})
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-extrabold text-[#D4AF37]">
                        {formatCurrency(tr.dealPrice)}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        Cọc: {formatCurrency(tr.depositAmount)} ({formatDate(tr.depositDate)})
                      </div>
                    </div>
                  </div>

                  {/* 6-Step Visual Milestone Tracker */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                      {TRANSACTION_STEPS.map((s) => {
                        const isDone = s.step < currentStep || isCompleted;
                        const isCurrent = s.step === currentStep && !isCompleted;
                        return (
                          <div
                            key={s.step}
                            className={`p-2 rounded-lg text-center transition-all ${
                              isDone
                                ? 'bg-emerald-100/70 border border-emerald-200 text-emerald-900'
                                : isCurrent
                                ? 'bg-[#001f3f] text-white shadow-xs font-bold'
                                : 'bg-white border border-slate-200 text-slate-400'
                            }`}
                          >
                            <div className="text-[10px] uppercase font-bold tracking-wider">
                              Bước {s.step}
                            </div>
                            <div className="text-xs font-bold mt-0.5 truncate">{s.name}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs">
                    <div className="flex items-center gap-3 text-slate-500">
                      <span>Môi giới phụ trách: <strong>{tr.sellingAgentName}</strong></span>
                      <span>• Hoa hồng dự kiến: <strong className="text-emerald-700 font-bold">{formatCurrency(tr.expectedCommission)}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      {currentStep < 6 && tr.status !== 'Hủy cọc' && (
                        <button
                          onClick={() => handleAdvanceStep(tr, currentStep + 1)}
                          className="px-3 py-1.5 bg-[#001f3f] text-white hover:bg-[#002f5f] font-bold rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                        >
                          <span>Tiến sang Bước {currentStep + 1}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" />
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setSelectedTransaction(tr);
                          setIsPrintModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        In phiếu cọc
                      </button>

                      <button
                        onClick={() => {
                          setSelectedTransaction(tr);
                          setIsDetailModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Create Transaction */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-[#001f3f] flex items-center gap-2">
                <BadgePercent className="w-5 h-5 text-[#D4AF37]" />
                Tạo Hồ Sơ Giao Dịch Mua Bán / Sang Nhượng
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit阿拉伯} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Loại giao dịch *</label>
                  <select
                    value={type}
                    onChange={(e: any) => setType(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-semibold"
                  >
                    <option value="SALE">Mua Bán Nhà Đất / BĐS</option>
                    <option value="TRANSFER">Sang Nhượng Quyền Sử Dụng</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Chọn BĐS giao dịch *</label>
                  <select
                    required
                    value={propertyId}
                    onChange={(e) => handleSelectProperty(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="">-- Chọn bất động sản --</option>
                    {properties
                      .filter((p) => !p.isDeleted)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.code}] {p.title} - {formatCurrency(p.salePrice || 0)}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Khách hàng mua / nhận chuyển nhượng *</label>
                  <select
                    required
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="">-- Chọn khách hàng --</option>
                    {customers
                      .filter((c) => !c.isDeleted)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          [{c.code}] {c.fullName} ({c.phone})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Môi giới chốt deal *</label>
                  <select
                    value={sellingAgentId}
                    onChange={(e) => setSellingAgentId(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Giá chốt giao dịch (VNĐ) *</label>
                  <input
                    type="number"
                    required
                    value={dealPrice || ''}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setDealPrice(v);
                      setDepositAmount(Math.round(v * 0.05));
                      setExpectedCommission(Math.round((v * commissionRate) / 100));
                    }}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-bold text-[#001f3f]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Số tiền đặt cọc (VNĐ) *</label>
                  <input
                    type="number"
                    required
                    value={depositAmount || ''}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-bold text-emerald-700"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Ngày đặt cọc *</label>
                  <input
                    type="date"
                    required
                    value={depositDate}
                    onChange={(e) => setDepositDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Tỷ lệ hoa hồng (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={commissionRate}
                    onChange={(e) => {
                      const r = Number(e.target.value);
                      setCommissionRate(r);
                      setExpectedCommission(Math.round((dealPrice * r) / 100));
                    }}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Tổng hoa hồng dự kiến (VNĐ)</label>
                  <input
                    type="number"
                    value={expectedCommission || ''}
                    onChange={(e) => setExpectedCommission(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-bold text-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Dự kiến ngày công chứng</label>
                  <input
                    type="date"
                    value={notarizationDate}
                    onChange={(e) => setNotarizationDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 mb-1 block">Điều khoản đặt cọc & ghi chú</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú về tiến độ thanh toán, thời hạn công chứng, bên chịu thuế phí..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#001f3f] hover:bg-[#002f5f] rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                  Lưu Giao Dịch & Khởi Tạo Tiến Độ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Deposit Receipt Printable Preview */}
      {isPrintModalOpen && selectedTransaction && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 no-print">
              <h3 className="font-bold text-base text-[#001f3f] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#D4AF37]" />
                Phiếu Xác Nhận Đặt Cọc BĐS
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-[#001f3f] text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  In Phiếu
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold ml-2"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="p-6 border border-slate-300 rounded-xl bg-slate-50 space-y-4 font-sans text-xs">
              <div className="text-center border-b pb-3 space-y-1">
                <div className="font-extrabold text-sm uppercase text-[#001f3f]">
                  CÔNG TY CỔ PHẦN ĐẦU TƯ & ĐỊA ỐC TRƯỜNG PHÁT REAL
                </div>
                <div className="text-[10px] text-slate-500">
                  Địa chỉ: TP. Long Xuyên, Tỉnh An Giang • Hotline: 0919 414 884
                </div>
                <div className="font-extrabold text-base text-[#D4AF37] pt-2">
                  GIẤY XÁC NHẬN ĐẶT CỌNG BẤT ĐỘNG SẢN
                </div>
                <div className="text-slate-500 font-mono">Mã giao dịch: {selectedTransaction.code}</div>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-slate-800 uppercase">I. BÊN BÁN (CHỦ TÀI SẢN):</div>
                <div className="grid grid-cols-2 gap-2 pl-3">
                  <div>Họ và tên: <strong>{selectedTransaction.sellerName}</strong></div>
                  <div>Số điện thoại: <strong>{selectedTransaction.sellerPhone}</strong></div>
                </div>

                <div className="font-bold text-slate-800 uppercase pt-2">II. BÊN MUA (BÊN ĐẶT CỌC):</div>
                <div className="grid grid-cols-2 gap-2 pl-3">
                  <div>Họ và tên: <strong>{selectedTransaction.buyerName}</strong></div>
                  <div>Số điện thoại: <strong>{selectedTransaction.buyerPhone}</strong></div>
                </div>

                <div className="font-bold text-slate-800 uppercase pt-2">III. THÔNG TIN BẤT ĐỘNG SẢN & GIÁ TRỊ:</div>
                <div className="space-y-1 pl-3">
                  <div>Tên BĐS: <strong>{selectedTransaction.propertyTitle}</strong> (Mã: {selectedTransaction.propertyCode})</div>
                  <div>Địa chỉ: {selectedTransaction.propertyAddress}</div>
                  <div>Tổng giá trị giao dịch: <strong className="text-base text-[#001f3f]">{formatCurrency(selectedTransaction.dealPrice)}</strong></div>
                  <div>Số tiền đặt cọc: <strong className="text-base text-emerald-700">{formatCurrency(selectedTransaction.depositAmount)}</strong></div>
                  <div>Ngày đặt cọc: {formatDate(selectedTransaction.depositDate)}</div>
                  {selectedTransaction.notarizationDate && (
                    <div>Hạn công chứng dự kiến: {formatDate(selectedTransaction.notarizationDate)}</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-8 text-center text-[11px] font-bold">
                <div>
                  BÊN BÁN
                  <div className="h-16"></div>
                  <div className="text-slate-700">{selectedTransaction.sellerName}</div>
                </div>
                <div>
                  ĐẠI DIỆN MÔI GIỚI
                  <div className="h-16"></div>
                  <div className="text-slate-700">{selectedTransaction.sellingAgentName}</div>
                </div>
                <div>
                  BÊN MUA
                  <div className="h-16"></div>
                  <div className="text-slate-700">{selectedTransaction.buyerName}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Details */}
      {isDetailModalOpen && selectedTransaction && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-[#001f3f]">Hồ Sơ Giao Dịch {selectedTransaction.code}</h3>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Tiến độ hiện tại:</span>
                <Badge variant="primary">{selectedTransaction.status}</Badge>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Bất động sản:</span>
                <span className="font-bold">[{selectedTransaction.propertyCode}] {selectedTransaction.propertyTitle}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Giá giao dịch:</span>
                <span className="font-bold text-[#001f3f]">{formatCurrency(selectedTransaction.dealPrice)}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Tiền đặt cọc:</span>
                <span className="font-bold text-emerald-700">{formatCurrency(selectedTransaction.depositAmount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Hoa hồng dự kiến:</span>
                <span className="font-bold text-[#D4AF37]">{formatCurrency(selectedTransaction.expectedCommission)}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Môi giới bán:</span>
                <span>{selectedTransaction.sellingAgentName}</span>
              </div>
              {selectedTransaction.notes && (
                <div className="py-1">
                  <span className="text-slate-500 block mb-1">Ghi chú:</span>
                  <div className="p-2.5 bg-slate-50 rounded-lg">{selectedTransaction.notes}</div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
