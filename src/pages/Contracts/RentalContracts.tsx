import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  DollarSign,
  Printer,
  RotateCw,
  XCircle,
  Eye,
  Building,
  User,
  ShieldCheck,
  CreditCard,
  BellRing,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { RentalContract, RentalPayment } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Badge } from '../../components/common/Badge';

export const RentalContracts: React.FC = () => {
  const {
    rentalContracts,
    rentalPayments,
    properties,
    customers,
    users,
    addRentalContract,
    updateRentalContract,
    renewRentalContract,
    terminateRentalContract,
    markPaymentPaid,
    addRentalPayment,
  } = useData();
  const { currentUser, isTeamLeader } = useAuth();
  const { success, error, info } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterExpiringOnly, setFilterExpiringOnly] = useState<boolean>(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<RentalContract | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [isTerminateModalOpen, setIsTerminateModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Payment form state
  const [selectedPayment, setSelectedPayment] = useState<RentalPayment | null>(null);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'TIEN_MAT' | 'CHUYEN_KHOAN' | 'KHAC'>('CHUYEN_KHOAN');

  // Renew form state
  const [renewEndDate, setRenewEndDate] = useState('');
  const [renewRentAmount, setRenewRentAmount] = useState<number>(0);
  const [renewNotes, setRenewNotes] = useState('');

  // Terminate form state
  const [terminateDate, setTerminateDate] = useState(new Date().toISOString().split('T')[0]);
  const [terminateReason, setTerminateReason] = useState('');

  // Add contract form state
  const [propertyId, setPropertyId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [monthlyRent, setMonthlyRent] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [paymentDayOfMonth, setPaymentDayOfMonth] = useState<number>(5);
  const [notes, setNotes] = useState('');

  // Filtered contracts
  const filteredContracts = useMemo(() => {
    const today = new Date().getTime();
    const sixtyDaysLater = today + 60 * 24 * 3600 * 1000;

    return rentalContracts.filter((c) => {
      if (filterStatus !== 'ALL' && c.status !== filterStatus) return false;

      const contractEndTime = new Date(c.endDate).getTime();
      const isExpiringSoon = contractEndTime >= today && contractEndTime <= sixtyDaysLater;

      if (filterExpiringOnly && !isExpiringSoon) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchCode述 = c.code.toLowerCase().includes(q);
        const matchProp = c.propertyTitle.toLowerCase().includes(q) || c.propertyCode.toLowerCase().includes(q);
        const matchCust = c.customerName.toLowerCase().includes(q) || c.customerPhone.includes(q);
        const matchLandlord = c.landlordName.toLowerCase().includes(q);
        if (!matchCode述 && !matchProp && !matchCust && !matchLandlord) return false;
      }

      return true;
    });
  }, [rentalContracts, filterStatus, filterExpiringOnly, searchQuery]);

  // Handle Add Contract
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prop = properties.find((p) => p.id === propertyId);
    const cust = customers.find((c) => c.id === customerId);

    if (!prop) {
      error('Vui lòng chọn bất động sản');
      return;
    }
    if (!cust) {
      error('Vui lòng chọn người thuê');
      return;
    }
    if (!endDate) {
      error('Vui lòng chọn ngày kết thúc hợp đồng');
      return;
    }

    try {
      const contract = await addRentalContract({
        code: '',
        propertyId: prop.id,
        propertyCode: prop.code,
        propertyTitle: prop.title,
        propertyAddress: prop.address,
        landlordName: prop.ownerName,
        landlordPhone: prop.ownerPhone,
        customerId: cust.id,
        customerName: cust.fullName,
        customerPhone: cust.phone,
        startDate,
        endDate,
        monthlyRent,
        depositAmount,
        paymentCycleMonths: 1,
        paymentDayOfMonth,
        status: 'Đang hiệu lực',
        assignedAgentId: currentUser?.id,
        agentName: currentUser?.fullName,
        notes,
      });

      // Generate 1st payment period
      await addRentalPayment({
        contractId: contract.id,
        contractCode: contract.code,
        propertyCode: prop.code,
        customerName: cust.fullName,
        periodName: `Kỳ thuê tháng ${new Date(startDate).getMonth() + 1}/${new Date(startDate).getFullYear()}`,
        dueDate: startDate,
        rentAmount: monthlyRent,
        utilitiesAmount: 0,
        totalAmount: monthlyRent,
        paidAmount: 0,
        remainingAmount: monthlyRent,
        status: 'Chưa thanh toán',
      });

      setIsAddModalOpen(false);
      success('Tạo hợp đồng thuê thành công');
    } catch (err: any) {
      error('Lỗi khi tạo hợp đồng: ' + err.message);
    }
  };

  // Handle Mark Payment
  const handlePaymentSubmit = async () => {
    if (!selectedPayment) return;
    await markPaymentPaid(selectedPayment.id, paidAmount, paymentMethod);
    setIsPaymentModalOpen(false);
    setSelectedPayment(null);
  };

  // Handle Renew
  const handleRenewSubmit = async () => {
    if (!selectedContract || !renewEndDate) return;
    await renewRentalContract(selectedContract.id, renewEndDate, renewRentAmount || undefined, renewNotes);
    setIsRenewModalOpen(false);
    setSelectedContract(null);
  };

  // Handle Terminate
  const handleTerminateSubmit丛 = async () => {
    if (!selectedContract) return;
    await terminateRentalContract(selectedContract.id, terminateDate, terminateReason);
    setIsTerminateModalOpen(false);
    setSelectedContract(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl">
              <FileText className="w-6 h-6" />
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-[#001f3f]">
              Quản Trị Hợp Đồng Thuê & Nhắc Hạn
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi thời hạn hợp đồng, cảnh báo hết hạn 30-60 ngày và quản lý các kỳ thu tiền thuê.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-[#001f3f] text-white hover:bg-[#002f5f] rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all"
          >
            <Plus className="w-4 h-4 text-[#D4AF37]" />
            <span>Tạo Hợp Đồng Thuê Mới</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã HĐ, tên khách thuê, căn nhà, chủ nhà..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#001f3f] outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterExpiringOnly(!filterExpiringOnly)}
            className={`px-3 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all ${
              filterExpiringOnly
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Sắp hết hạn (30-60 ngày)</span>
          </button>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 outline-none"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="Đang hiệu lực">Đang hiệu lực</option>
            <option value="Đã gia hạn">Đã gia hạn</option>
            <option value="Đã thanh lý">Đã thanh lý</option>
            <option value="Hết hạn">Đã hết hạn</option>
          </select>
        </div>
      </div>

      {/* Contracts List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Danh sách hợp đồng thuê ({filteredContracts.length})
          </span>
        </div>

        {filteredContracts.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <FileText className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-semibold">Không tìm thấy hợp đồng thuê nào</p>
            <p className="text-xs text-slate-400">Tạo hợp đồng mới hoặc thay đổi bộ lọc tìm kiếm.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredContracts.map((contract) => {
              const today = new Date().getTime();
              const endTime = new Date(contract.endDate).getTime();
              const daysLeft = Math.ceil((endTime - today) / (1000 * 3600 * 24));
              const isExpiringSoon = daysLeft > 0 && daysLeft <= 60;
              const isExpired = daysLeft <= 0 && contract.status === 'Đang hiệu lực';

              // Get payments for this contract
              const contractPayments = rentalPayments.filter((p) => p.contractId === contract.id);

              return (
                <div key={contract.id} className="p-5 hover:bg-slate-50/70 transition-colors space-y-4">
                  {/* Contract Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-mono font-bold text-[#001f3f] bg-slate-100 px-2 py-0.5 rounded">
                          {contract.code}
                        </span>
                        <h3 className="font-bold text-sm text-slate-900">{contract.propertyTitle}</h3>
                        <Badge variant={contract.status === 'Đang hiệu lực' ? 'success' : 'neutral'}>
                          {contract.status}
                        </Badge>
                        {isExpiringSoon && (
                          <span className="text-[11px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Còn {daysLeft} ngày là hết hạn
                          </span>
                        )}
                        {isExpired && (
                          <span className="text-[11px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            Đã quá hạn hợp đồng
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span>BĐS: <strong className="font-mono text-[#001f3f]">{contract.propertyCode}</strong></span>
                        <span>Khách thuê: <strong>{contract.customerName}</strong> ({contract.customerPhone})</span>
                        <span>Chủ nhà: <strong>{contract.landlordName}</strong> ({contract.landlordPhone})</span>
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span>Thời hạn: <strong>{formatDate(contract.startDate)} ➔ {formatDate(contract.endDate)}</strong></span>
                        <span>• Ngày thanh toán: <strong>Mùng {contract.paymentDayOfMonth || 5} hàng tháng</strong></span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-extrabold text-[#D4AF37]">
                        {formatCurrency(contract.monthlyRent)}/tháng
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        Cọc: {formatCurrency(contract.depositAmount)}
                      </div>
                    </div>
                  </div>

                  {/* Payment Periods Grid */}
                  {contractPayments.length > 0 && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                      <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-[#001f3f]" />
                        Kỳ thu tiền thuê:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {contractPayments.map((p) => (
                          <div
                            key={p.id}
                            className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-bold text-slate-800">{p.periodName}</div>
                              <div className="text-slate-500 text-[11px]">Hạn: {formatDate(p.dueDate)}</div>
                              <div className="font-bold text-[#001f3f]">{formatCurrency(p.totalAmount)}</div>
                            </div>

                            <div className="text-right space-y-1">
                              <Badge variant={p.status === 'Đã thanh toán' ? 'success' : 'warning'}>
                                {p.status}
                              </Badge>
                              {p.status !== 'Đã thanh toán' && (
                                <button
                                  onClick={() => {
                                    setSelectedPayment(p);
                                    setPaidAmount(p.remainingAmount || p.totalAmount);
                                    setIsPaymentModalOpen(true);
                                  }}
                                  className="block text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded"
                                >
                                  Thu tiền
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs">
                    <div className="text-slate-500">
                      Môi giới phụ trách: <strong>{contract.agentName}</strong>
                    </div>

                    <div className="flex items-center gap-2">
                      {contract.status === 'Đang hiệu lực' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedContract(contract);
                              setRenewRentAmount(contract.monthlyRent);
                              setIsRenewModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-lg transition-colors flex items-center gap-1"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            Gia hạn
                          </button>

                          <button
                            onClick={() => {
                              setSelectedContract(contract);
                              setIsTerminateModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 font-bold rounded-lg transition-colors flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Thanh lý
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => {
                          setSelectedContract(contract);
                          setIsPrintModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        In Hợp đồng
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Create Contract */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-[#001f3f] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#D4AF37]" />
                Lập Hợp Đồng Thuê Bất Động Sản Mới
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
                  <label className="font-bold text-slate-700 mb-1 block">Bất động sản thuê *</label>
                  <select
                    required
                    value={propertyId}
                    onChange={(e) => {
                      setPropertyId(e.target.value);
                      const p = properties.find((x) => x.id === e.target.value);
                      if (p) {
                        setMonthlyRent(p.rentPriceMonthly || 0);
                        setDepositAmount((p.rentPriceMonthly || 0) * 2);
                      }
                    }}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="">-- Chọn bất động sản --</option>
                    {properties
                      .filter((p) => !p.isDeleted)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.code}] {p.title}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Khách hàng thuê *</label>
                  <select
                    required
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="">-- Chọn người thuê --</option>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Ngày bắt đầu hiệu lực *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Ngày kết thúc hợp đồng *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Giá thuê/tháng (VNĐ) *</label>
                  <input
                    type="number"
                    required
                    value={monthlyRent || ''}
                    onChange={(e) => setMonthlyRent(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-bold text-[#001f3f]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Tiền cọc hợp đồng (VNĐ) *</label>
                  <input
                    type="number"
                    required
                    value={depositAmount || ''}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-bold text-emerald-700"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Ngày thu tiền mỗi tháng</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={paymentDayOfMonth}
                    onChange={(e) => setPaymentDayOfMonth(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 mb-1 block">Điều khoản hợp đồng & ghi chú</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú về tiền cọc, hiện trạng tài sản, nội thất bàn giao..."
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
                  Lưu & Kích Hoạt Hợp Đồng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Rental Payment */}
      {isPaymentModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-[#001f3f] flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Xác Nhận Thu Tiền Thuê
              </h3>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl space-y-1 text-xs">
              <div>Kỳ thu: <strong>{selectedPayment.periodName}</strong></div>
              <div>Người nộp: <strong>{selectedPayment.customerName}</strong></div>
              <div>Số tiền cần thu: <strong className="text-emerald-700 font-bold">{formatCurrency(selectedPayment.totalAmount)}</strong></div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 mb-1 block">Số tiền thực thu (VNĐ) *</label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-bold text-emerald-700"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 mb-1 block">Phương thức thanh toán</label>
                <select
                  value={paymentMethod}
                  onChange={(e: any) => setPaymentMethod(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="CHUYEN_KHOAN">Chuyển khoản ngân hàng</option>
                  <option value="TIEN_MAT">Tiền mặt</option>
                  <option value="KHAC">Khác</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Hủy
              </button>
              <button
                onClick={handlePaymentSubmit}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                Xác Nhận Đã Thu Tiền
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Renew Contract */}
      {isRenewModalOpen && selectedContract && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-[#001f3f] flex items-center gap-2">
                <RotateCw className="w-5 h-5 text-blue-600" />
                Gia Hạn Hợp Đồng Thuê
              </h3>
              <button
                onClick={() => setIsRenewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1">
              <div>Hợp đồng: <strong>{selectedContract.code}</strong></div>
              <div>Hết hạn cũ: <strong>{formatDate(selectedContract.endDate)}</strong></div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 mb-1 block">Ngày hết hạn mới *</label>
                <input
                  type="date"
                  required
                  value={renewEndDate}
                  onChange={(e) => setRenewEndDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 mb-1 block">Giá thuê mới/tháng (nếu có đổi)</label>
                <input
                  type="number"
                  value={renewRentAmount}
                  onChange={(e) => setRenewRentAmount(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-bold text-[#001f3f]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 mb-1 block">Ghi chú gia hạn</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú điều khoản bổ sung khi tái ký..."
                  value={renewNotes}
                  onChange={(e) => setRenewNotes(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsRenewModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Hủy
              </button>
              <button
                onClick={handleRenewSubmit}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-1.5"
              >
                <RotateCw className="w-4 h-4" />
                Xác Nhận Gia Hạn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Terminate Contract */}
      {isTerminateModalOpen && selectedContract && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-red-700 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                Thanh Lý Hợp Đồng Thuê
              </h3>
              <button
                onClick={() => setIsTerminateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-red-50 text-red-900 p-3 rounded-xl text-xs space-y-1 border border-red-200">
              <div>Thanh lý hợp đồng: <strong>{selectedContract.code}</strong></div>
              <div>Bất động sản sẽ tự động chuyển về trạng thái <strong>"Đang cho thuê"</strong>.</div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 mb-1 block">Ngày thanh lý *</label>
                <input
                  type="date"
                  value={terminateDate}
                  onChange={(e) => setTerminateDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 mb-1 block">Lý do thanh lý / hoàn cọc</label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Hết thời hạn thuê, đã hoàn trả lại tiền cọc 10.000.000 đ sau khi trừ tiền điện nước..."
                  value={terminateReason}
                  onChange={(e) => setTerminateReason(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsTerminateModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Hủy
              </button>
              <button
                onClick={handleTerminateSubmit丛}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                Xác Nhận Thanh Lý
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Print Formal Contract */}
      {isPrintModalOpen && selectedContract && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 no-print">
              <h3 className="font-bold text-base text-[#001f3f] flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#D4AF37]" />
                Hợp Đồng Thuê Nhà Đất
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-[#001f3f] text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  In Hợp Đồng
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
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </div>
                <div className="text-[10px] text-slate-500 font-bold">Độc lập - Tự do - Hạnh phúc</div>
                <div className="font-extrabold text-base text-[#D4AF37] pt-2">
                  HỢP ĐỒNG THUÊ BẤT ĐỘNG SẢN
                </div>
                <div className="text-slate-500 font-mono">Số HĐ: {selectedContract.code}</div>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-slate-800 uppercase">BÊN CHO THUÊ (BÊN A):</div>
                <div className="pl-3 space-y-0.5">
                  <div>Họ và tên: <strong>{selectedContract.landlordName}</strong></div>
                  <div>Điện thoại: <strong>{selectedContract.landlordPhone}</strong></div>
                </div>

                <div className="font-bold text-slate-800 uppercase pt-2">BÊN THUÊ (BÊN B):</div>
                <div className="pl-3 space-y-0.5">
                  <div>Họ và tên: <strong>{selectedContract.customerName}</strong></div>
                  <div>Điện thoại: <strong>{selectedContract.customerPhone}</strong></div>
                </div>

                <div className="font-bold text-slate-800 uppercase pt-2">ĐIỀU KHOẢN THUÊ:</div>
                <div className="pl-3 space-y-1">
                  <div>Tài sản thuê: <strong>{selectedContract.propertyTitle}</strong> ({selectedContract.propertyAddress})</div>
                  <div>Giá thuê: <strong className="text-[#001f3f] text-sm">{formatCurrency(selectedContract.monthlyRent)}/tháng</strong></div>
                  <div>Tiền cọc: <strong className="text-emerald-700 text-sm">{formatCurrency(selectedContract.depositAmount)}</strong></div>
                  <div>Thời hạn thuê: Từ ngày <strong>{formatDate(selectedContract.startDate)}</strong> đến <strong>{formatDate(selectedContract.endDate)}</strong></div>
                  <div>Kỳ hạn đóng tiền: Ngày <strong>{selectedContract.paymentDayOfMonth || 5}</strong> hàng tháng</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-8 text-center text-[11px] font-bold">
                <div>
                  BÊN CHO THUÊ (BÊN A)
                  <div className="h-16"></div>
                  <div className="text-slate-700">{selectedContract.landlordName}</div>
                </div>
                <div>
                  BÊN THUÊ (BÊN B)
                  <div className="h-16"></div>
                  <div className="text-slate-700">{selectedContract.customerName}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
