import React, { useState, useMemo } from 'react';
import {
  KeyRound,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Building,
  User,
  DollarSign,
  Calendar,
  FileText,
  Printer,
  ArrowRight,
  Eye,
  ShieldCheck,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { RentalDeal } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Badge } from '../../components/common/Badge';

const RENTAL_STEPS = [
  { step: 1, name: 'Cọc giữ chỗ', desc: 'Nhận tiền cọc giữ chỗ thuê nhà' },
  { step: 2, name: 'Soạn hợp đồng', desc: 'Thống nhất điều khoản và trang thiết bị' },
  { step: 3, name: 'Ký & Bàn giao', desc: 'Ký HĐ và bàn giao hiện trạng' },
  { step: 4, name: 'Thu tiền kỳ 1', desc: 'Thu cọc hợp đồng & tiền thuê kỳ đầu' },
  { step: 5, name: 'Hoàn tất', desc: 'Tất toán và chuyển vào quản lý HĐ thuê' },
];

export const Rentals: React.FC = () => {
  const {
    rentalDeals,
    properties,
    customers,
    users,
    addRentalDeal,
    updateRentalDeal,
    updateRentalDealStatus,
    addRentalContract,
    addCommission,
  } = useData();
  const { currentUser } = useAuth();
  const { success, error, info } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<RentalDeal | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Form State
  const [propertyId, setPropertyId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [monthlyRent, setMonthlyRent] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaseTermMonths, setLeaseTermMonths] = useState<number>(12);
  const [leaseStartDate, setLeaseStartDate] = useState('');
  const [handoverDate, setHandoverDate] = useState('');
  const [paymentCycleMonths, setPaymentCycleMonths] = useState<number>(1);
  const [expectedCommission, setExpectedCommission] = useState<number>(0);
  const [sellingAgentId, setSellingAgentId] = useState(currentUser?.id || '');
  const [notes, setNotes] = useState('');

  // Filtered Deals
  const filteredDeals = useMemo(() => {
    return rentalDeals.filter((deal) => {
      if (filterStatus !== 'ALL' && deal.status !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchCode = deal.code.toLowerCase().includes(q);
        const matchProp = deal.propertyTitle.toLowerCase().includes(q) || deal.propertyCode.toLowerCase().includes(q);
        const matchTenant = deal.tenantName.toLowerCase().includes(q) || deal.tenantPhone.includes(q);
        const matchOwner = deal.ownerName.toLowerCase().includes(q);
        if (!matchCode && !matchProp && !matchTenant && !matchOwner) return false;
      }
      return true;
    });
  }, [rentalDeals, filterStatus, searchQuery]);

  // Handle Property Selection
  const handleSelectProperty = (pId: string) => {
    setPropertyId(pId);
    const prop = properties.find((p) => p.id === pId);
    if (prop) {
      const rent = prop.rentPriceMonthly || 0;
      setMonthlyRent(rent);
      setDepositAmount(rent * 2); // 2 months deposit default
      setExpectedCommission(rent); // 1 month rent default commission
    }
  };

  // Submit Add Rental Deal
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prop = properties.find((p) => p.id === propertyId);
    const tenant = customers.find((c) => c.id === tenantId);
    const sellingAgent = users.find((u) => u.id === sellingAgentId);

    if (!prop) {
      error('Vui lòng chọn bất động sản cho thuê');
      return;
    }
    if (!tenant) {
      error('Vui lòng chọn khách thuê');
      return;
    }

    try {
      const newDeal = await addRentalDeal({
        code: '',
        status: 'Đã đặt cọc',
        step: 1,
        propertyId: prop.id,
        propertyCode: prop.code,
        propertyTitle: prop.title,
        propertyAddress: prop.address,
        ownerName: prop.ownerName,
        ownerPhone: prop.ownerPhone,
        tenantId: tenant.id,
        tenantName: tenant.fullName,
        tenantPhone: tenant.phone,
        monthlyRent,
        depositAmount,
        depositDate,
        leaseTermMonths,
        leaseStartDate: leaseStartDate || depositDate,
        handoverDate: handoverDate || undefined,
        paymentCycleMonths,
        expectedCommission,
        listingAgentId: prop.assignedAgentId,
        listingAgentName: prop.assignedAgentName,
        sellingAgentId: sellingAgent?.id || currentUser?.id,
        sellingAgentName: sellingAgent?.fullName || currentUser?.fullName,
        teamId: sellingAgent?.teamId || currentUser?.teamId,
        notes,
      });

      // Also create draft Commission
      if (expectedCommission > 0) {
        await addCommission({
          dealId: newDeal.id,
          dealCode: newDeal.code,
          dealType: 'RENT',
          propertyCode: prop.code,
          propertyTitle: prop.title,
          customerName: tenant.fullName,
          dealPrice: monthlyRent,
          commissionRate: 100, // 1 month rent
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
              beneficiaryId: prop.assignedAgentId || 'agent_1',
              beneficiaryName: prop.assignedAgentName || 'Đầu nguồn cho thuê',
              percentage: 30,
              amount: Math.round(expectedCommission * 0.3),
              isPaid: false,
            },
            {
              id: `split_${Date.now()}_3`,
              role: 'SELLING_AGENT',
              beneficiaryId: sellingAgent?.id || 'agent_2',
              beneficiaryName: sellingAgent?.fullName || 'Đầu tìm khách thuê',
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
      success('Tạo giao dịch cho thuê thành công', `Hồ sơ ${newDeal.code} đã được kích hoạt.`);
    } catch (err: any) {
      error('Lỗi khi tạo giao dịch: ' + err.message);
    }
  };

  // Advance Rental Deal Step
  const handleAdvanceStep = async (deal: RentalDeal, nextStep: number) => {
    let newStatus: RentalDeal['status'] = deal.status;
    if (nextStep === 2) newStatus = 'Chuẩn bị hợp đồng';
    if (nextStep === 3) newStatus = 'Đã ký';
    if (nextStep === 4) newStatus = 'Đã bàn giao';
    if (nextStep === 5) newStatus = 'Hoàn tất';

    await updateRentalDealStatus(deal.id, newStatus, nextStep);

    // If step 5 (Hoàn tất) -> Auto create formal Rental Contract
    if (nextStep === 5) {
      const start = new Date(deal.leaseStartDate || new Date().toISOString());
      const end = new Date(start);
      end.setMonth(end.getMonth() + (deal.leaseTermMonths || 12));
      const endDateStr = end.toISOString().split('T')[0];

      await addRentalContract({
        code: '',
        rentalDealId: deal.id,
        propertyId: deal.propertyId,
        propertyCode: deal.propertyCode,
        propertyTitle: deal.propertyTitle,
        propertyAddress: deal.propertyAddress || '',
        ownerId: deal.ownerId || '',
        ownerName: deal.ownerName,
        ownerPhone: deal.ownerPhone,
        customerId: deal.customerId || deal.tenantId || '',
        customerName: deal.customerName || deal.tenantName || '',
        customerPhone: deal.customerPhone || deal.tenantPhone || '',
        signingDate: new Date().toISOString().split('T')[0],
        startDate: deal.leaseStartDate || new Date().toISOString().split('T')[0],
        endDate: endDateStr,
        monthlyRent: deal.monthlyRent,
        depositAmount: deal.depositAmount,
        depositMonths: deal.depositMonths || 2,
        paymentCycle: deal.paymentCycle || '1 tháng/lần',
        firstPaymentDate: deal.leaseStartDate || new Date().toISOString().split('T')[0],
        nextPaymentDate: deal.leaseStartDate || new Date().toISOString().split('T')[0],
        allowedLateDays: 5,
        noticePeriodDays: 30,
        commissionAmount: deal.actualCommission || deal.estimatedCommission || 0,
        status: 'Đang hiệu lực',
        assignedAgentId: deal.responsibleAgentId || deal.sellingAgentId || '',
        assignedAgentName: deal.responsibleAgentName || deal.sellingAgentName || '',
        notes: `Hợp đồng tạo tự động từ giao dịch thuê mã ${deal.code}`,
      });
      success('Đã tự động khởi tạo Hợp Đồng Thuê chính thức trong mục "Hợp đồng thuê"');
    }

    success(`Đã chuyển giao dịch sang bước ${nextStep}: ${RENTAL_STEPS[nextStep - 1].name}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl">
              <KeyRound className="w-6 h-6" />
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-[#001f3f]">
              Nghiệp Vụ Cho Thuê Bất Động Sản
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Quản lý đặt cọc giữ chỗ thuê nhà, biên bản bàn giao và kỳ thanh toán định kỳ.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-[#001f3f] text-white hover:bg-[#002f5f] rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all"
          >
            <Plus className="w-4 h-4 text-[#D4AF37]" />
            <span>Tạo Giao Dịch Thuê</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã thuê, tên BĐS, người thuê, chủ nhà..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#001f3f] outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 outline-none"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="Đã đặt cọc">Đã đặt cọc</option>
            <option value="Hồ sơ pháp lý">Đang soạn hợp đồng</option>
            <option value="Đã ký">Đã ký HĐ</option>
            <option value="Bàn giao">Đã bàn giao</option>
            <option value="Hoàn tất">Hoàn tất</option>
          </select>
        </div>
      </div>

      {/* Rental Deals List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Danh sách giao dịch cho thuê ({filteredDeals.length})
          </span>
        </div>

        {filteredDeals.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <KeyRound className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-semibold">Chưa có giao dịch cho thuê nào</p>
            <p className="text-xs text-slate-400">Tạo giao dịch mới để theo dõi đặt cọc giữ chỗ và hợp đồng.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredDeals.map((deal) => {
              const currentStep = deal.step || 1;
              const isCompleted = deal.status === 'Hoàn tất';

              return (
                <div key={deal.id} className="p-5 hover:bg-slate-50/70 transition-colors space-y-4">
                  {/* Deal Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-mono font-bold text-[#001f3f] bg-slate-100 px-2 py-0.5 rounded">
                          {deal.code}
                        </span>
                        <h3 className="font-bold text-sm text-slate-900">{deal.propertyTitle}</h3>
                        <Badge variant={isCompleted ? 'success' : 'primary'}>{deal.status}</Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span>
                          BĐS: <strong className="font-mono text-[#001f3f]">{deal.propertyCode}</strong>
                        </span>
                        <span>
                          Chủ nhà: <strong>{deal.ownerName}</strong> ({deal.ownerPhone})
                        </span>
                        <span>
                          Khách thuê: <strong>{deal.tenantName}</strong> ({deal.tenantPhone})
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-extrabold text-[#D4AF37]">
                        {formatCurrency(deal.monthlyRent)}/tháng
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        Cọc: {formatCurrency(deal.depositAmount)} • Thời hạn: {deal.leaseTermMonths} tháng
                      </div>
                    </div>
                  </div>

                  {/* 5-Step Visual Milestone Tracker */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {RENTAL_STEPS.map((s) => {
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

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs">
                    <div className="flex items-center gap-3 text-slate-500">
                      <span>Môi giới phụ trách: <strong>{deal.sellingAgentName}</strong></span>
                      <span>• Bắt đầu tính tiền: <strong>{formatDate(deal.leaseStartDate)}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      {currentStep < 5 && deal.status !== 'Hủy' && (
                        <button
                          onClick={() => handleAdvanceStep(deal, currentStep + 1)}
                          className="px-3 py-1.5 bg-[#001f3f] text-white hover:bg-[#002f5f] font-bold rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                        >
                          <span>Tiến sang Bước {currentStep + 1}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" />
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setSelectedDeal(deal);
                          setIsPrintModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        In phiếu cọc thuê
                      </button>

                      <button
                        onClick={() => {
                          setSelectedDeal(deal);
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

      {/* Modal: Create Rental Deal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-[#001f3f] flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#D4AF37]" />
                Tạo Hồ Sơ Cho Thuê Bất Động Sản
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Chọn BĐS cho thuê *</label>
                  <select
                    required
                    value={propertyId}
                    onChange={(e) => handleSelectProperty(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="">-- Chọn bất động sản --</option>
                    {properties
                      .filter((p) => !p.isDeleted && (p.transactionType === 'RENT' || p.status === 'Đang cho thuê'))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.code}] {p.title} - {formatCurrency(p.rentPriceMonthly || 0)}/th
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Khách hàng thuê *</label>
                  <select
                    required
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="">-- Chọn khách thuê --</option>
                    {customers
                      .filter((c) => !c.isDeleted)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          [{c.code}] {c.fullName} ({c.phone})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Giá thuê/tháng (VNĐ) *</label>
                  <input
                    type="number"
                    required
                    value={monthlyRent || ''}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setMonthlyRent(v);
                      setDepositAmount(v * 2);
                      setExpectedCommission(v);
                    }}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-bold text-[#001f3f]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Tiền cọc giữ chỗ (VNĐ) *</label>
                  <input
                    type="number"
                    required
                    value={depositAmount || ''}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-bold text-emerald-700"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Thời hạn thuê (tháng)</label>
                  <input
                    type="number"
                    value={leaseTermMonths}
                    onChange={(e) => setLeaseTermMonths(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Ngày bắt đầu tính tiền thuê</label>
                  <input
                    type="date"
                    value={leaseStartDate}
                    onChange={(e) => setLeaseStartDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Hoa hồng môi giới (VNĐ)</label>
                  <input
                    type="number"
                    value={expectedCommission || ''}
                    onChange={(e) => setExpectedCommission(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-bold text-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 mb-1 block">Ghi chú & điều kiện thỏa thuận thuê</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú về tiền điện nước, thời hạn thanh toán mỗi kỳ, mục đích thuê..."
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
                  Lưu Giao Dịch Cho Thuê
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Print Rental Reservation Receipt */}
      {isPrintModalOpen && selectedDeal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 no-print">
              <h3 className="font-bold text-base text-[#001f3f] flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#D4AF37]" />
                Phiếu Đặt Cọc Giữ Chỗ Thuê BĐS
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

            {/* Document Body */}
            <div className="p-6 border border-slate-300 rounded-xl bg-slate-50 space-y-4 font-sans text-xs">
              <div className="text-center border-b pb-3 space-y-1">
                <div className="font-extrabold text-sm uppercase text-[#001f3f]">
                  CÔNG TY CỔ PHẦN ĐẦU TƯ & ĐỊA ỐC TRƯỜNG PHÁT REAL
                </div>
                <div className="text-[10px] text-slate-500">
                  Địa chỉ: TP. Long Xuyên, Tỉnh An Giang • Hotline: 0919 414 884
                </div>
                <div className="font-extrabold text-base text-[#D4AF37] pt-2">
                  PHIẾU XÁC NHẬN ĐẶT CỌC GIỮ CHỖ THUÊ NHÀ ĐẤT
                </div>
                <div className="text-slate-500 font-mono">Mã giao dịch: {selectedDeal.code}</div>
              </div>

              <div className="space-y-2">
                <div>Chủ tài sản cho thuê: <strong>{selectedDeal.ownerName}</strong> ({selectedDeal.ownerPhone})</div>
                <div>Bên thuê giữ chỗ: <strong>{selectedDeal.tenantName}</strong> ({selectedDeal.tenantPhone})</div>
                <div>Bất động sản thuê: <strong>[{selectedDeal.propertyCode}] {selectedDeal.propertyTitle}</strong></div>
                <div>Địa chỉ: {selectedDeal.propertyAddress}</div>
                <div>Giá thuê thỏa thuận: <strong className="text-base text-[#001f3f]">{formatCurrency(selectedDeal.monthlyRent)}/tháng</strong></div>
                <div>Số tiền cọc giữ chỗ: <strong className="text-base text-emerald-700">{formatCurrency(selectedDeal.depositAmount)}</strong></div>
                <div>Thời hạn thuê: <strong>{selectedDeal.leaseTermMonths} tháng</strong></div>
                <div>Ngày dự kiến nhận mặt bằng: <strong>{formatDate(selectedDeal.leaseStartDate)}</strong></div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-8 text-center text-[11px] font-bold">
                <div>
                  CHỦ NHÀ
                  <div className="h-16"></div>
                  <div className="text-slate-700">{selectedDeal.ownerName}</div>
                </div>
                <div>
                  ĐẠI DIỆN MÔI GIỚI
                  <div className="h-16"></div>
                  <div className="text-slate-700">{selectedDeal.sellingAgentName}</div>
                </div>
                <div>
                  BÊN THUÊ
                  <div className="h-16"></div>
                  <div className="text-slate-700">{selectedDeal.tenantName}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Details */}
      {isDetailModalOpen && selectedDeal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-[#001f3f]">Hồ Sơ Thuê {selectedDeal.code}</h3>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Trạng thái:</span>
                <Badge variant="primary">{selectedDeal.status}</Badge>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Bất động sản:</span>
                <span className="font-bold">[{selectedDeal.propertyCode}] {selectedDeal.propertyTitle}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Giá thuê:</span>
                <span className="font-bold text-[#001f3f]">{formatCurrency(selectedDeal.monthlyRent)}/tháng</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Tiền cọc:</span>
                <span className="font-bold text-emerald-700">{formatCurrency(selectedDeal.depositAmount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Thời hạn thuê:</span>
                <span>{selectedDeal.leaseTermMonths} tháng</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Môi giới phụ trách:</span>
                <span>{selectedDeal.sellingAgentName}</span>
              </div>
              {selectedDeal.notes && (
                <div className="py-1">
                  <span className="text-slate-500 block mb-1">Ghi chú:</span>
                  <div className="p-2.5 bg-slate-50 rounded-lg">{selectedDeal.notes}</div>
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
