import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Send,
  Building,
  UserCheck,
  ArrowRightLeft,
  ChevronRight,
  ExternalLink,
  DollarSign,
  MapPin,
  Maximize2,
  Calendar,
  Layers,
  Phone,
  MessageSquare,
  BadgeCheck,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Property, Customer, PropertyMatch } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Badge } from '../../components/common/Badge';

export const PropertyMatching: React.FC = () => {
  const {
    properties,
    customers,
    matches,
    addMatch,
    updateMatch,
    markMatchSent,
    addAppointment,
    users,
  } = useData();
  const { currentUser, isTeamLeader } = useAuth();
  const { success, info } = useToast();

  // Mode: 'PROP_TO_CUST' (Chọn BĐS -> Tìm khách phù hợp) | 'CUST_TO_PROP' (Chọn Khách -> Tìm BĐS phù hợp) | 'MATCH_HISTORY'
  const [activeTab, setActiveTab] = useState<'PROP_TO_CUST' | 'CUST_TO_PROP' | 'MATCH_HISTORY'>('PROP_TO_CUST');

  // Selected item for matching
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('ALL');
  const [filterScoreMin, setFilterScoreMin] = useState<number>(50);

  // Quick Action Modals
  const [matchModalData, setMatchModalData] = useState<{
    prop: Property;
    cust: Customer;
    score: number;
    reasons: string[];
  } | null>(null);

  const [appointmentModalData, setAppointmentModalData] = useState<{
    prop: Property;
    cust: Customer;
  } | null>(null);
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointmentTime, setAppointmentTime] = useState('09:00');
  const [appointmentNotes, setAppointmentNotes] = useState('');

  // Active items
  const activeProperties = useMemo(() => {
    return properties.filter((p) => !p.isDeleted && (p.status === 'Đang bán' || p.status === 'Đang cho thuê'));
  }, [properties]);

  const activeCustomers = useMemo(() => {
    return customers.filter((c) => !c.isDeleted && c.status !== 'LOST' && c.status !== 'WON');
  }, [customers]);

  // Compatibility Calculation Algorithm
  const calculateMatchScore = (prop: Property, cust: Customer) => {
    let score = 0;
    const reasons: string[] = [];

    // 1. Transaction Type Check (Bán / Thuê / Sang nhượng) - Weight 25%
    const typeMap: Record<string, string[]> = {
      'SALE': ['MUA', 'DAU_TU'],
      'RENT': ['THUE'],
      'TRANSFER': ['SANG_NHUONG', 'MUA'],
    };
    const expectedNeeds = typeMap[prop.transactionType] || [];
    if (expectedNeeds.includes(cust.demandType)) {
      score += 25;
      reasons.push(`Khớp loại nhu cầu (${prop.transactionType === 'SALE' ? 'Mua bán' : prop.transactionType === 'RENT' ? 'Cho thuê' : 'Sang nhượng'})`);
    }

    // 2. Property Type Check - Weight 20%
    if (cust.propertyTypes && cust.propertyTypes.length > 0) {
      if (cust.propertyTypes.includes(prop.propertyType)) {
        score += 20;
        reasons.push(`Khớp loại BĐS (${prop.propertyType})`);
      }
    } else {
      score += 10;
    }

    // 3. Location / District Check - Weight 25%
    const customerDistricts = cust.preferredDistricts || cust.areas || [];
    if (customerDistricts.length > 0) {
      if (customerDistricts.includes(prop.district) || customerDistricts.some((d) => prop.address?.toLowerCase().includes(d.toLowerCase()))) {
        score += 25;
        reasons.push(`Khớp khu vực quận/huyện (${prop.district})`);
      } else if (prop.city === 'An Giang') {
        score += 10;
        reasons.push(`Cùng tỉnh An Giang`);
      }
    } else {
      score += 15;
    }

    // 4. Budget Range Check - Weight 20%
    const propPrice倍 = prop.salePrice || prop.rentPriceMonthly || prop.transferPrice || 0;
    const bMin = cust.budgetMin !== undefined ? cust.budgetMin : cust.minPrice;
    const bMax萃 = cust.budgetMax !== undefined ? cust.budgetMax : cust.maxPrice;

    if (bMin !== undefined && bMax萃 !== undefined && bMax萃 > 0) {
      if (propPrice倍 >= bMin && propPrice倍 <= bMax萃) {
        score += 20;
        reasons.push('Giá nằm hoàn toàn trong ngân sách dự kiến');
      } else if (propPrice倍 >= bMin * 0.85 && propPrice倍 <= bMax萃 * 1.15) {
        score += 12;
        reasons.push('Giá tiệm cận ngân sách (±15%)');
      }
    } else if (bMax萃 !== undefined && bMax萃 > 0) {
      if (propPrice倍 <= bMax萃) {
        score += 20;
        reasons.push('Giá dưới ngân sách tối đa');
      }
    } else {
      score += 10;
    }

    // 5. Area Check - Weight 10%
    if (cust.minArea !== undefined && cust.maxArea !== undefined) {
      if (prop.landArea >= cust.minArea && prop.landArea <= cust.maxArea) {
        score += 10;
        reasons.push(`Khớp diện tích (${prop.landArea} m²)`);
      }
    } else if (cust.minArea !== undefined) {
      if (prop.landArea >= cust.minArea) {
        score += 10;
        reasons.push(`Diện tích đạt yêu cầu (≥ ${cust.minArea} m²)`);
      }
    } else {
      score += 5;
    }

    return {
      score: Math.min(100, score),
      reasons,
    };
  };

  // Matched Customers for Selected Property
  const matchedCustomersForProperty = useMemo(() => {
    if (!selectedPropertyId) return [];
    const prop = activeProperties.find((p) => p.id === selectedPropertyId);
    if (!prop) return [];

    return activeCustomers
      .map((cust) => {
        const { score, reasons } = calculateMatchScore(prop, cust);
        return {
          customer: cust,
          score,
          reasons,
        };
      })
      .filter((item) => item.score >= filterScoreMin)
      .sort((a, b) => b.score - a.score);
  }, [selectedPropertyId, activeProperties, activeCustomers, filterScoreMin]);

  // Matched Properties for Selected Customer
  const matchedPropertiesForCustomer = useMemo(() => {
    if (!selectedCustomerId) return [];
    const cust = activeCustomers.find((c) => c.id === selectedCustomerId);
    if (!cust) return [];

    return activeProperties
      .map((prop) => {
        const { score, reasons } = calculateMatchScore(prop, cust);
        return {
          property: prop,
          score,
          reasons,
        };
      })
      .filter((item) => item.score >= filterScoreMin)
      .sort((a, b) => b.score - a.score);
  }, [selectedCustomerId, activeCustomers, activeProperties, filterScoreMin]);

  // Auto select first item if empty
  React.useEffect(() => {
    if (!selectedPropertyId && activeProperties.length > 0) {
      setSelectedPropertyId(activeProperties[0].id);
    }
    if (!selectedCustomerId && activeCustomers.length > 0) {
      setSelectedCustomerId(activeCustomers[0].id);
    }
  }, [activeProperties, activeCustomers]);

  // Handle Quick Send / Register Match
  const handleSaveMatch = async (prop: Property, cust: Customer, score: number, reasons: string[]) => {
    try {
      const match = await addMatch({
        propertyId: prop.id,
        propertyCode: prop.code,
        propertyTitle: prop.title,
        customerId: cust.id,
        customerCode: cust.code,
        customerName: cust.fullName,
        customerPhone: cust.phone,
        matchScore: score,
        matchReasons: reasons,
        status: 'DA_GUI_KHACH',
        sentAt: new Date().toISOString(),
        sentBy: currentUser?.id,
        sentByName: currentUser?.fullName,
        responseStatus: 'CHUA_PHAN_HOI',
      });
      setMatchModalData(null);
      success('Đã lưu ghép sản phẩm & gửi thông tin cho khách');
    } catch (e: any) {
      console.error(e);
    }
  };

  // Handle Create Appointment from Match
  const handleCreateAppointment = async () => {
    if (!appointmentModalData) return;
    const { prop, cust } = appointmentModalData;

    try {
      await addAppointment({
        title: `Dẫn khách [${cust.fullName}] xem [${prop.code}]`,
        type: 'Dẫn khách xem BĐS',
        startDate: appointmentDate,
        startTime: appointmentTime,
        startDateTime: `${appointmentDate}T${appointmentTime}:00+07:00`,
        status: 'Đã lên lịch',
        propertyId: prop.id,
        propertyCode: prop.code,
        propertyAddress: prop.address,
        customerId: cust.id,
        customerName: cust.fullName,
        customerPhone: cust.phone,
        assignedAgentId: currentUser?.id || 'agent_1',
        agentName: currentUser?.fullName || 'Môi giới',
        notes: appointmentNotes || `Hẹn khảo sát thực tế BĐS ${prop.code} cho khách ${cust.fullName}.`,
      });

      setAppointmentModalData(null);
      setAppointmentNotes('');
      success('Tạo lịch hẹn thành công', `Đã lên lịch dẫn khách lúc ${appointmentTime} ngày ${formatDate(appointmentDate)}`);
    } catch (e) {
      console.error(e);
    }
  };

  const selectedProperty = activeProperties.find((p) => p.id === selectedPropertyId);
  const selectedCustomer = activeCustomers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl">
              <Sparkles className="w-6 h-6" />
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-[#001f3f]">
              Ghép Sản Phẩm & Khớp Nhu Cầu Tự Động
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Thuật toán so khớp đa chiều giữa nguồn hàng ký gửi và hồ sơ khách hàng tại An Giang.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('PROP_TO_CUST')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'PROP_TO_CUST'
                ? 'bg-[#001f3f] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Nguồn hàng ➔ Khách hàng</span>
          </button>
          <button
            onClick={() => setActiveTab('CUST_TO_PROP')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'CUST_TO_PROP'
                ? 'bg-[#001f3f] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Khách hàng ➔ Nguồn hàng</span>
          </button>
          <button
            onClick={() => setActiveTab('MATCH_HISTORY')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'MATCH_HISTORY'
                ? 'bg-[#001f3f] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Lịch sử ghép ({matches.length})</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Nguồn hàng -> Khách hàng */}
      {activeTab === 'PROP_TO_CUST' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Select Property */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#001f3f] uppercase tracking-wider flex items-center gap-2">
                  <Building className="w-4 h-4 text-[#D4AF37]" />
                  1. Chọn Bất Động Sản ({activeProperties.length})
                </h2>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm mã BĐS, tiêu đề, địa chỉ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#001f3f] focus:bg-white outline-none"
                />
              </div>

              <div className="max-h-[560px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {activeProperties
                  .filter((p) => {
                    if (!searchQuery) return true;
                    const q = searchQuery.toLowerCase();
                    return (
                      p.code.toLowerCase().includes(q) ||
                      p.title.toLowerCase().includes(q) ||
                      p.address.toLowerCase().includes(q)
                    );
                  })
                  .map((prop) => {
                    const isSelected = prop.id === selectedPropertyId;
                    const price = prop.salePrice || prop.rentPriceMonthly || prop.transferPrice || 0;
                    return (
                      <div
                        key={prop.id}
                        onClick={() => setSelectedPropertyId(prop.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-50/70 border-[#001f3f] shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[11px] font-mono font-bold text-[#001f3f] bg-slate-200/80 px-1.5 py-0.5 rounded">
                              {prop.code}
                            </span>
                            <span className="ml-2 text-xs font-semibold text-slate-900 line-clamp-1">
                              {prop.title}
                            </span>
                          </div>
                          <Badge variant={prop.transactionType === 'SALE' ? 'primary' : 'success'}>
                            {prop.transactionType === 'SALE' ? 'Bán' : prop.transactionType === 'RENT' ? 'Thuê' : 'Sang nhượng'}
                          </Badge>
                        </div>

                        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                          <span className="font-bold text-[#D4AF37]">{formatCurrency(price)}</span>
                          <span>{prop.landArea} m² • {prop.district}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Selected Property Preview */}
            {selectedProperty && (
              <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-mono">Đang chọn khảo sát:</span>
                  <span className="text-xs bg-[#D4AF37] text-slate-900 font-bold px-2 py-0.5 rounded">
                    {selectedProperty.code}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-white line-clamp-2">{selectedProperty.title}</h3>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 bg-white/10 p-3 rounded-xl">
                  <div>
                    <span className="text-slate-400">Giá:</span>{' '}
                    <strong className="text-[#D4AF37]">
                      {formatCurrency(selectedProperty.salePrice || selectedProperty.rentPriceMonthly || 0)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Diện tích:</span>{' '}
                    <strong>{selectedProperty.landArea} m²</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Vị trí:</span>{' '}
                    <strong>{selectedProperty.district}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Pháp lý:</span>{' '}
                    <strong>{selectedProperty.legalStatus}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Matched Customers */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-[#001f3f] uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                    2. Khách Hàng Phù Hợp ({matchedCustomersForProperty.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Sắp xếp theo độ tương thích và tỷ lệ chốt deal cao nhất
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Độ khớp tối thiểu:</span>
                  <select
                    value={filterScoreMin}
                    onChange={(e) => setFilterScoreMin(Number(e.target.value))}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-[#001f3f] outline-none"
                  >
                    <option value={40}>≥ 40% (Rộng)</option>
                    <option value={50}>≥ 50% (Khuyến nghị)</option>
                    <option value={70}>≥ 70% (Chính xác cao)</option>
                    <option value={85}>≥ 85% (Rất tiềm năng)</option>
                  </select>
                </div>
              </div>

              {matchedCustomersForProperty.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <Sparkles className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
                  <p className="text-sm font-semibold">Chưa có khách hàng nào đạt độ tương thích yêu cầu</p>
                  <p className="text-xs text-slate-400">Hãy thử hạ mức độ khớp tối thiểu hoặc chọn bất động sản khác.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {matchedCustomersForProperty.map(({ customer, score, reasons }) => {
                    const scoreColor =
                      score >= 80
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : score >= 60
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200';

                    return (
                      <div
                        key={customer.id}
                        className="p-4 rounded-xl border border-slate-200 bg-white hover:shadow-xs transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-900">{customer.fullName}</span>
                              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {customer.code}
                              </span>
                              <Badge variant={customer.status === 'HOT' ? 'danger' : 'neutral'}>
                                {customer.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="flex items-center gap-1 font-medium text-slate-700">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {customer.phone}
                              </span>
                              <span>• Môi giới: <strong>{customer.assignedAgentName}</strong></span>
                              <span>• Nhóm: {customer.teamName || 'Văn phòng chính'}</span>
                            </div>
                          </div>

                          {/* Match Score Badge */}
                          <div className={`px-3 py-1.5 rounded-xl border flex flex-col items-center shrink-0 ${scoreColor}`}>
                            <span className="text-base font-extrabold leading-none">{score}%</span>
                            <span className="text-[10px] font-semibold uppercase tracking-wider mt-0.5">Tương thích</span>
                          </div>
                        </div>

                        {/* Match Reasons */}
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
                          <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                            <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Tiêu chí so khớp đạt được:
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {reasons.map((r, i) => (
                              <span key={i} className="text-[11px] bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                                ✓ {r}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="text-xs text-slate-500">
                            Ngân sách: <strong className="text-slate-800 font-bold">{formatCurrency(customer.budgetMax || 0)}</strong>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                if (selectedProperty) {
                                  setAppointmentModalData({
                                    prop: selectedProperty,
                                    cust: customer,
                                  });
                                }
                              }}
                              className="px-3 py-1.5 text-xs font-bold text-[#001f3f] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              Lên lịch hẹn
                            </button>

                            <button
                              onClick={() => {
                                if (selectedProperty) {
                                  setMatchModalData({
                                    prop: selectedProperty,
                                    cust: customer,
                                    score,
                                    reasons,
                                  });
                                }
                              }}
                              className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#001f3f] hover:bg-[#002f5f] rounded-lg transition-all flex items-center gap-1.5 shadow-xs"
                            >
                              <Send className="w-3.5 h-3.5 text-[#D4AF37]" />
                              Gửi cho khách
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Khách hàng -> Nguồn hàng */}
      {activeTab === 'CUST_TO_PROP' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Select Customer */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#001f3f] uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#D4AF37]" />
                  1. Chọn Khách Hàng ({activeCustomers.length})
                </h2>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm tên khách, số điện thoại, mã..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#001f3f] focus:bg-white outline-none"
                />
              </div>

              <div className="max-h-[560px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {activeCustomers
                  .filter((c) => {
                    if (!searchQuery) return true;
                    const q = searchQuery.toLowerCase();
                    return (
                      c.fullName.toLowerCase().includes(q) ||
                      c.code.toLowerCase().includes(q) ||
                      c.phone.includes(q)
                    );
                  })
                  .map((cust) => {
                    const isSelected = cust.id === selectedCustomerId;
                    return (
                      <div
                        key={cust.id}
                        onClick={() => setSelectedCustomerId(cust.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-50/70 border-[#001f3f] shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[11px] font-mono font-bold text-[#001f3f] bg-slate-200/80 px-1.5 py-0.5 rounded">
                              {cust.code}
                            </span>
                            <span className="ml-2 text-xs font-bold text-slate-900">{cust.fullName}</span>
                          </div>
                          <Badge variant={cust.status === 'HOT' ? 'danger' : 'neutral'}>
                            {cust.status}
                          </Badge>
                        </div>

                        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                          <span className="font-bold text-[#D4AF37]">{formatCurrency(cust.budgetMax || 0)}</span>
                          <span>Nhu cầu: {cust.demandType}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Selected Customer Card Preview */}
            {selectedCustomer && (
              <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-mono">Hồ sơ khách hàng:</span>
                  <span className="text-xs bg-[#D4AF37] text-slate-900 font-bold px-2 py-0.5 rounded">
                    {selectedCustomer.code}
                  </span>
                </div>
                <h3 className="font-bold text-base text-white">{selectedCustomer.fullName}</h3>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 bg-white/10 p-3 rounded-xl">
                  <div>
                    <span className="text-slate-400">Ngân sách:</span>{' '}
                    <strong className="text-[#D4AF37]">{formatCurrency(selectedCustomer.budgetMax || 0)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Loại BĐS:</span>{' '}
                    <strong>{selectedCustomer.propertyTypes?.join(', ') || 'Tất cả'}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400">Khu vực ưu tiên:</span>{' '}
                    <strong>{selectedCustomer.preferredDistricts?.join(', ') || 'An Giang'}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Matched Properties */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-[#001f3f] uppercase tracking-wider flex items-center gap-2">
                    <Building className="w-4 h-4 text-[#D4AF37]" />
                    2. Bất Động Sản Phù Hợp ({matchedPropertiesForCustomer.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Nguồn hàng đang hoạt động khớp với tiêu chí của khách hàng
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Độ khớp:</span>
                  <select
                    value={filterScoreMin}
                    onChange={(e) => setFilterScoreMin(Number(e.target.value))}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-[#001f3f] outline-none"
                  >
                    <option value={40}>≥ 40%</option>
                    <option value={50}>≥ 50%</option>
                    <option value={70}>≥ 70%</option>
                  </select>
                </div>
              </div>

              {matchedPropertiesForCustomer.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <Building className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
                  <p className="text-sm font-semibold">Chưa tìm thấy BĐS nào khớp nhu cầu khách này</p>
                  <p className="text-xs text-slate-400">Hãy thử điều chỉnh bộ lọc hoặc bổ sung thêm nguồn hàng mới.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {matchedPropertiesForCustomer.map(({ property, score, reasons }) => {
                    const price = property.salePrice || property.rentPriceMonthly || property.transferPrice || 0;
                    return (
                      <div
                        key={property.id}
                        className="p-4 rounded-xl border border-slate-200 bg-white hover:shadow-xs transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-[#001f3f] bg-slate-100 px-1.5 py-0.5 rounded">
                                {property.code}
                              </span>
                              <span className="text-sm font-bold text-slate-900 line-clamp-1">{property.title}</span>
                            </div>
                            <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {property.address}
                              </span>
                              <span>• {property.landArea} m²</span>
                              <span>• Môi giới: {property.assignedAgentName}</span>
                            </div>
                          </div>

                          <div className="px-3 py-1.5 rounded-xl border bg-emerald-50 text-emerald-700 border-emerald-200 flex flex-col items-center shrink-0">
                            <span className="text-base font-extrabold leading-none">{score}%</span>
                            <span className="text-[10px] font-semibold uppercase tracking-wider mt-0.5">Khớp</span>
                          </div>
                        </div>

                        {/* Match Reasons */}
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
                          <div className="flex flex-wrap gap-1.5">
                            {reasons.map((r, i) => (
                              <span key={i} className="text-[11px] bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                                ✓ {r}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div className="text-sm font-extrabold text-[#D4AF37]">{formatCurrency(price)}</div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                if (selectedCustomer) {
                                  setAppointmentModalData({
                                    prop: property,
                                    cust: selectedCustomer,
                                  });
                                }
                              }}
                              className="px-3 py-1.5 text-xs font-bold text-[#001f3f] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              Lên lịch xem nhà
                            </button>

                            <button
                              onClick={() => {
                                if (selectedCustomer) {
                                  setMatchModalData({
                                    prop: property,
                                    cust: selectedCustomer,
                                    score,
                                    reasons,
                                  });
                                }
                              }}
                              className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#001f3f] hover:bg-[#002f5f] rounded-lg transition-all flex items-center gap-1.5"
                            >
                              <Send className="w-3.5 h-3.5 text-[#D4AF37]" />
                              Gửi cho khách
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mode 3: Match History */}
      {activeTab === 'MATCH_HISTORY' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-[#001f3f]">Lịch Sử Ghép & Gửi Nguồn Hàng</h2>
              <p className="text-xs text-slate-500">Ghi nhận các lượt ghép nối và phản hồi từ phía khách hàng</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 uppercase font-bold text-[11px] border-b border-slate-200">
                  <th className="p-3">Bất Động Sản</th>
                  <th className="p-3">Khách Hàng</th>
                  <th className="p-3">Tương thích</th>
                  <th className="p-3">Ngày gửi</th>
                  <th className="p-3">Trạng thái phản hồi</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      Chưa có lượt gửi sản phẩm nào
                    </td>
                  </tr>
                ) : (
                  matches.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-medium">
                        <div className="font-bold text-[#001f3f]">{m.propertyCode}</div>
                        <div className="text-slate-500 line-clamp-1">{m.propertyTitle}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{m.customerName}</div>
                        <div className="text-slate-500">{m.customerPhone}</div>
                      </td>
                      <td className="p-3 font-bold text-emerald-600">{m.matchScore}%</td>
                      <td className="p-3 text-slate-600">{m.sentAt ? formatDate(m.sentAt) : 'Chưa gửi'}</td>
                      <td className="p-3">
                        <Badge
                          variant={
                            m.responseStatus === 'DONG_Y_XEM'
                              ? 'success'
                              : m.responseStatus === 'TU_CHOI'
                              ? 'danger'
                              : 'neutral'
                          }
                        >
                          {m.responseStatus === 'DONG_Y_XEM'
                            ? 'Đồng ý đi xem'
                            : m.responseStatus === 'TU_CHOI'
                            ? 'Từ chối / Chưa thích'
                            : 'Đang chờ phản hồi'}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => updateMatch(m.id, { responseStatus: 'DONG_Y_XEM' })}
                            title="Khách đồng ý xem"
                            className="px-2 py-1 text-[11px] bg-emerald-100 text-emerald-800 font-bold rounded hover:bg-emerald-200"
                          >
                            Đồng ý
                          </button>
                          <button
                            onClick={() => updateMatch(m.id, { responseStatus: 'TU_CHOI' })}
                            title="Khách không thích"
                            className="px-2 py-1 text-[11px] bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                          >
                            Từ chối
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Send Match to Customer */}
      {matchModalData && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-[#001f3f] flex items-center gap-2">
                <Send className="w-4 h-4 text-[#D4AF37]" />
                Xác Nhận Gửi BĐS Cho Khách Hàng
              </h3>
              <button
                onClick={() => setMatchModalData(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-xs">
              <div>
                <span className="text-slate-500">Khách nhận:</span>{' '}
                <strong className="text-slate-900">{matchModalData.cust.fullName}</strong> ({matchModalData.cust.phone})
              </div>
              <div>
                <span className="text-slate-500">Bất động sản:</span>{' '}
                <strong className="text-[#001f3f]">[{matchModalData.prop.code}] {matchModalData.prop.title}</strong>
              </div>
              <div>
                <span className="text-slate-500">Độ khớp:</span>{' '}
                <strong className="text-emerald-600 font-bold">{matchModalData.score}%</strong>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Hình thức gửi:</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 border rounded-xl bg-blue-50/50 border-blue-200 font-semibold text-blue-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  Zalo / SMS Trực tiếp
                </div>
                <div className="p-3 border rounded-xl bg-slate-50 border-slate-200 text-slate-600 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-500" />
                  Gọi điện tư vấn
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setMatchModalData(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() =>
                  handleSaveMatch(
                    matchModalData.prop,
                    matchModalData.cust,
                    matchModalData.score,
                    matchModalData.reasons
                  )
                }
                className="px-4 py-2 text-xs font-bold text-white bg-[#001f3f] hover:bg-[#002f5f] rounded-xl flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                Lưu và Đánh dấu đã gửi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Quick Create Appointment from Match */}
      {appointmentModalData && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-[#001f3f] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#D4AF37]" />
                Lên Lịch Hẹn Khảo Sát Thực Tế
              </h3>
              <button
                onClick={() => setAppointmentModalData(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl space-y-1.5 text-xs text-slate-700">
              <div>
                <span className="text-slate-500">Khách hàng:</span>{' '}
                <strong>{appointmentModalData.cust.fullName}</strong> ({appointmentModalData.cust.phone})
              </div>
              <div>
                <span className="text-slate-500">Khảo sát BĐS:</span>{' '}
                <strong className="text-[#001f3f]">[{appointmentModalData.prop.code}] {appointmentModalData.prop.title}</strong>
              </div>
              <div>
                <span className="text-slate-500">Địa chỉ:</span>{' '}
                <span>{appointmentModalData.prop.address}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Ngày hẹn:</label>
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#001f3f]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Giờ hẹn:</label>
                <input
                  type="time"
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#001f3f]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Ghi chú cuộc hẹn:</label>
              <textarea
                rows={3}
                placeholder="Ví dụ: Khách hẹn xem nhà lúc 9h sáng, chú ý dẫn xem thêm đường hẻm phụ..."
                value={appointmentNotes}
                onChange={(e) => setAppointmentNotes(e.target.value)}
                className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#001f3f]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setAppointmentModalData(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateAppointment}
                className="px-4 py-2 text-xs font-bold text-white bg-[#001f3f] hover:bg-[#002f5f] rounded-xl flex items-center gap-2"
              >
                <Calendar className="w-4 h-4 text-[#D4AF37]" />
                Lên Lịch Hẹn Ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
