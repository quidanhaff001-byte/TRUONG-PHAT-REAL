import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Customer, PropertyCategory } from '../../types';
import { formatVND } from '../../utils/formatters';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Tag,
  AlertTriangle,
  Calendar,
  DollarSign,
  Building,
  CheckCircle2,
  HelpCircle,
  FileText,
  UserCheck,
} from 'lucide-react';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  onSaved?: (savedCustomer: Customer) => void;
}

const PROPERTY_CATEGORY_OPTIONS: PropertyCategory[] = [
  'Nhà phố',
  'Căn hộ',
  'Biệt thự',
  'Đất nền',
  'Mặt bằng',
  'Cửa hàng',
  'Kho xưởng',
  'Tòa nhà văn phòng',
  'Khách sạn',
  'Văn phòng',
];

const POPULAR_AREAS = [
  'Quận 1',
  'Quận 2',
  'Quận 3',
  'Quận 7',
  'Bình Thạnh',
  'Phú Nhuận',
  'TP. Thủ Đức',
  'Tân Bình',
  'Quận 10',
  'Quận 4',
  'Nhà Bè',
  'Bình Dương',
];

const SOURCES = [
  'Khách hàng giới thiệu',
  'Facebook Ads',
  'Google Search',
  'Website BDS Pro',
  'Trực tiếp / Vãng lai',
  'Telesales / Cold call',
  'Biển bảng / Băng rôn',
  'Cộng tác viên',
  'Khác',
];

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  customer,
  onSaved,
}) => {
  const { users, teams, addCustomer, updateCustomer, checkDuplicateCustomerPhone, locations } = useData();
  const { currentUser, isAdmin, isTeamLeader } = useAuth();

  const isEdit = !!customer;

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [email, setEmail] = useState('');
  const [zalo, setZalo] = useState('');
  const [address, setAddress] = useState('');
  const [source, setSource] = useState('Khách hàng giới thiệu');

  const [demandType, setDemandType] = useState<'MUA' | 'THUE' | 'SANG_NHUONG'>('MUA');
  const [propertyTypes, setPropertyTypes] = useState<PropertyCategory[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [customAreaInput, setCustomAreaInput] = useState('');

  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [minArea, setMinArea] = useState<number | ''>('');
  const [maxArea, setMaxArea] = useState<number | ''>('');

  const [potentialLevel, setPotentialLevel] = useState<Customer['potentialLevel']>('Tiềm năng');
  const [status, setStatus] = useState<Customer['status']>('Mới tiếp nhận');

  const [assignedAgentId, setAssignedAgentId] = useState('');
  const [notes, setNotes] = useState('');

  const [nextAppointmentDate, setNextAppointmentDate] = useState('');
  const [nextAppointmentNote, setNextAppointmentNote] = useState('');

  // Validation & Duplicate check
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or reset form
  useEffect(() => {
    if (customer) {
      setFullName(customer.fullName || '');
      setPhone(customer.phone || '');
      setSecondaryPhone(customer.secondaryPhone || '');
      setEmail(customer.email || '');
      setZalo(customer.zalo || '');
      setAddress(customer.address || '');
      setSource(customer.source || 'Khách hàng giới thiệu');
      setDemandType(customer.demandType || 'MUA');
      setPropertyTypes(customer.propertyTypes || []);
      setAreas(customer.areas || []);
      setMinPrice(customer.minPrice || '');
      setMaxPrice(customer.maxPrice || '');
      setMinArea(customer.minArea || '');
      setMaxArea(customer.maxArea || '');
      setPotentialLevel(customer.potentialLevel || 'Tiềm năng');
      setStatus(customer.status || 'Mới tiếp nhận');
      setAssignedAgentId(customer.assignedAgentId || currentUser?.id || '');
      setNotes(customer.notes || '');
      setNextAppointmentDate(customer.nextAppointmentDate ? customer.nextAppointmentDate.slice(0, 16) : '');
      setNextAppointmentNote(customer.nextAppointmentNote || '');
    } else {
      setFullName('');
      setPhone('');
      setSecondaryPhone('');
      setEmail('');
      setZalo('');
      setAddress('');
      setSource('Khách hàng giới thiệu');
      setDemandType('MUA');
      setPropertyTypes([]);
      setAreas([]);
      setMinPrice('');
      setMaxPrice('');
      setMinArea('');
      setMaxArea('');
      setPotentialLevel('Tiềm năng');
      setStatus('Mới tiếp nhận');
      setAssignedAgentId(currentUser?.id || (users[0]?.id ?? ''));
      setNotes('');
      setNextAppointmentDate('');
      setNextAppointmentNote('');
    }
    setErrors({});
    setDuplicateWarning(null);
  }, [customer, isOpen, currentUser, users]);

  // Real-time Duplicate phone check
  const handlePhoneChange = (val: string) => {
    setPhone(val);
    if (!zalo && val.length >= 8) {
      setZalo(val);
    }
    if (val.trim().length >= 9) {
      const dupCheck = checkDuplicateCustomerPhone(val, customer?.id);
      if (dupCheck.isDuplicate) {
        setDuplicateWarning(dupCheck.message || 'Số điện thoại này đã tồn tại trong hệ thống!');
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  };

  const togglePropertyType = (cat: PropertyCategory) => {
    if (propertyTypes.includes(cat)) {
      setPropertyTypes(propertyTypes.filter((p) => p !== cat));
    } else {
      setPropertyTypes([...propertyTypes, cat]);
    }
    if (errors.propertyTypes) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.propertyTypes;
        return next;
      });
    }
  };

  const toggleArea = (areaName: string) => {
    if (areas.includes(areaName)) {
      setAreas(areas.filter((a) => a !== areaName));
    } else {
      setAreas([...areas, areaName]);
    }
    if (errors.areas) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.areas;
        return next;
      });
    }
  };

  const handleAddCustomArea = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && customAreaInput.trim()) {
      e.preventDefault();
      const val = customAreaInput.trim();
      if (!areas.includes(val)) {
        setAreas([...areas, val]);
      }
      setCustomAreaInput('');
      if (errors.areas) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.areas;
          return next;
        });
      }
    }
  };

  const validate逃 = () => {
    const errs: { [key: string]: string } = {};
    if (!fullName.trim()) errs.fullName = 'Vui lòng nhập họ tên khách hàng';
    if (!phone.trim()) {
      errs.phone = 'Vui lòng nhập số điện thoại liên hệ';
    } else if (phone.replace(/\D/g, '').length < 9) {
      errs.phone = 'Số điện thoại không hợp lệ (tối thiểu 9 số)';
    }

    if (propertyTypes.length === 0) {
      errs.propertyTypes = 'Vui lòng chủ động chọn ít nhất 1 loại hình BĐS mong muốn';
    }

    if (areas.length === 0) {
      errs.areas = 'Vui lòng chủ động chọn hoặc nhập ít nhất 1 khu vực quan tâm';
    }

    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      errs.price = 'Giá tối thiểu không được lớn hơn giá tối đa';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };
  const validate = validate逃;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const selectedAgent = users.find((u) => u.id === assignedAgentId) || users[0];
      const selectedTeam = teams.find((t) => t.id === selectedAgent?.teamId);

      const payload = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        secondaryPhone: secondaryPhone.trim() || undefined,
        email: email.trim() || undefined,
        zalo: zalo.trim() || undefined,
        address: address.trim() || undefined,
        source,
        demandType,
        propertyTypes,
        areas: areas.length > 0 ? areas : ['Toàn thành phố'],
        minPrice: minPrice ? Number(minPrice) : 0,
        maxPrice: maxPrice ? Number(maxPrice) : 0,
        minArea: minArea ? Number(minArea) : undefined,
        maxArea: maxArea ? Number(maxArea) : undefined,
        potentialLevel,
        status,
        assignedAgentId: selectedAgent?.id || 'admin',
        assignedAgentName: selectedAgent?.fullName || 'Hệ thống',
        assignedAgentPhone: selectedAgent?.phone,
        teamId: selectedTeam?.id,
        teamName: selectedTeam?.name,
        notes: notes.trim() || undefined,
        nextAppointmentDate: nextAppointmentDate ? new Date(nextAppointmentDate).toISOString() : undefined,
        nextAppointmentNote: nextAppointmentNote.trim() || undefined,
      };

      if (isEdit && customer) {
        await updateCustomer(customer.id, payload);
        if (onSaved) onSaved({ ...customer, ...payload });
      } else {
        const created = await addCustomer(payload);
        if (onSaved) onSaved(created);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                {isEdit ? `Chỉnh sửa hồ sơ khách hàng: ${customer?.code}` : 'Thêm hồ sơ khách hàng mới'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEdit ? 'Cập nhật nhu cầu, mức độ tiềm năng và người phụ trách' : 'Nhập thông tin nhu cầu tìm kiếm để hệ thống tự động đối soát nguồn hàng'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* Duplicate warning notification */}
          {duplicateWarning && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3 text-amber-900 animate-in shake duration-200">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-bold text-amber-800">CẢNH BÁO TRÙNG SỐ ĐIỆN THOẠI TRÊN HỆ THỐNG</div>
                <div>{duplicateWarning}</div>
                <div className="text-[11px] text-amber-700 italic">
                  * Bạn vẫn có thể tiếp tục lưu nếu khách hàng có nhu cầu giao dịch độc lập mới.
                </div>
              </div>
            </div>
          )}

          {/* Section 1: Demand Type Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              1. Phân loại nhu cầu khách hàng <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { type: 'MUA', label: 'Khách mua BĐS', desc: 'Tìm mua nhà, căn hộ, biệt thự, đất', color: 'emerald' },
                { type: 'THUE', label: 'Khách thuê BĐS', desc: 'Tìm thuê nhà ở, văn phòng, chung cư', color: 'blue' },
                { type: 'SANG_NHUONG', label: 'Khách nhận sang nhượng', desc: 'Tìm nhận nhượng quán cafe, shop, spa', color: 'amber' },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setDemandType(item.type as any)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    demandType === item.type
                      ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="font-bold text-sm">{item.label}</div>
                  <div className={`text-[11px] mt-0.5 ${demandType === item.type ? 'text-slate-300' : 'text-slate-500'}`}>
                    {item.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Contact Information */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              2. Thông tin liên hệ & Nhân khẩu
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên khách hàng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="VD: Anh Phạm Hoàng Bách"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 ${
                    errors.fullName ? 'border-rose-500 ring-rose-200' : 'border-slate-200 focus:border-slate-900 ring-slate-200'
                  }`}
                />
                {errors.fullName && <p className="text-[11px] text-rose-500 mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số điện thoại chính <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="VD: 0909 111 888"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-medium focus:outline-none focus:ring-2 ${
                    errors.phone ? 'border-rose-500 ring-rose-200' : duplicateWarning ? 'border-amber-400 bg-amber-50/40 ring-amber-200' : 'border-slate-200 focus:border-slate-900 ring-slate-200'
                  }`}
                />
                {errors.phone && <p className="text-[11px] text-rose-500 mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số Zalo / Liên hệ phụ
                </label>
                <input
                  type="text"
                  value={zalo}
                  onChange={(e) => setZalo(e.target.value)}
                  placeholder="VD: 0909111888"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:border-slate-900 ring-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="VD: bach.pham@vinacapital.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:border-slate-900 ring-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Địa chỉ hiện tại
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="VD: An Phú, TP. Thủ Đức"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:border-slate-900 ring-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nguồn khách hàng
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:border-slate-900 ring-slate-200"
                >
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Detailed Property Requirements */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              3. Tiêu chí tìm kiếm bất động sản
            </label>

            {/* Property Category Chips */}
            <div>
              <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
                <span>Loại hình BĐS quan tâm:</span>
                <span className="text-[11px] text-slate-400 font-normal">Có thể chọn nhiều loại</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {PROPERTY_CATEGORY_OPTIONS.map((cat) => {
                  const isSelected = propertyTypes.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => togglePropertyType(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {cat}
                    </button>
                  );
                })}
              </div>
              {errors.propertyTypes && <p className="text-[11px] text-rose-500 mt-1">{errors.propertyTypes}</p>}
            </div>

            {/* Areas Selection */}
            <div>
              <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
                <span>Địa bàn / Khu vực mong muốn (An Giang & Kiên Giang cũ):</span>
                <span className="text-[11px] text-slate-400 font-normal">Nhấn để chọn nhanh hoặc nhập thêm</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {locations.filter((l) => l.active !== false).slice(0, 15).map((loc) => {
                  const areaLabel = `${loc.currentName} (${loc.formerDistrictName})`;
                  const isSelected = areas.includes(areaLabel) || areas.includes(loc.currentName);
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => toggleArea(areaLabel)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {loc.currentName}
                    </button>
                  );
                })}
              </div>

              {/* Custom area tags */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customAreaInput}
                  onChange={(e) => setCustomAreaInput(e.target.value)}
                  onKeyDown={handleAddCustomArea}
                  placeholder="Nhập thêm khu vực / ấp / xã khác và gõ Enter..."
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:border-slate-900 ring-slate-200"
                />
              </div>

              {/* Selected areas tags */}
              {areas.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-500 self-center mr-1">Đã chọn:</span>
                  {areas.map((a) => (
                    <span
                      key={a}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-xs font-medium border border-slate-200"
                    >
                      {a}
                      <button
                        type="button"
                        onClick={() => toggleArea(a)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {errors.areas && <p className="text-[11px] text-rose-500 mt-1.5">{errors.areas}</p>}
            </div>

            {/* Budget Range & Area Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ngân sách từ (VNĐ)
                </label>
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : '')}
                  placeholder="VD: 25000000000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:border-slate-900 ring-slate-200"
                />
                {minPrice ? (
                  <p className="text-[11px] text-emerald-700 font-bold mt-1">
                    ≈ {formatVND(Number(minPrice))}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ngân sách đến (VNĐ)
                </label>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : '')}
                  placeholder="VD: 35000000000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:border-slate-900 ring-slate-200"
                />
                {maxPrice ? (
                  <p className="text-[11px] text-emerald-700 font-bold mt-1">
                    ≈ {formatVND(Number(maxPrice))}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Diện tích từ (m²)
                </label>
                <input
                  type="number"
                  value={minArea}
                  onChange={(e) => setMinArea(e.target.value ? Number(e.target.value) : '')}
                  placeholder="VD: 150"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:border-slate-900 ring-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Diện tích đến (m²)
                </label>
                <input
                  type="number"
                  value={maxArea}
                  onChange={(e) => setMaxArea(e.target.value ? Number(e.target.value) : '')}
                  placeholder="VD: 300"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:border-slate-900 ring-slate-200"
                />
              </div>
            </div>
            {errors.price && <p className="text-[11px] text-rose-500">{errors.price}</p>}
          </div>

          {/* Section 4: Potential, Status & Agent Assignment */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              4. Mức độ tiềm năng & Phân công môi giới
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mức độ tiềm năng <span className="text-rose-500">*</span>
                </label>
                <select
                  value={potentialLevel}
                  onChange={(e) => setPotentialLevel(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white font-medium focus:outline-none focus:ring-2 focus:border-slate-900 ring-slate-200"
                >
                  <option value="Nóng">🔥 Nóng (Tài chính sẵn, muốn chốt nhanh)</option>
                  <option value="Tiềm năng">⭐ Tiềm năng (Đang tìm hiểu tích cực)</option>
                  <option value="Tham khảo">🔎 Tham khảo (Chưa vội, khảo sát giá)</option>
                  <option value="Chưa phù hợp">⚠️ Chưa phù hợp</option>
                  <option value="Ngưng chăm sóc">🚫 Ngưng chăm sóc</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trạng thái chăm sóc <span className="text-rose-500">*</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white font-medium focus:outline-none focus:ring-2 focus:border-slate-900 ring-slate-200"
                >
                  <option value="Mới tiếp nhận">Mới tiếp nhận</option>
                  <option value="Đang tư vấn">Đang tư vấn</option>
                  <option value="Đã gửi sản phẩm">Đã gửi sản phẩm</option>
                  <option value="Đã hẹn xem">Đã hẹn xem</option>
                  <option value="Đang thương lượng">Đang thương lượng</option>
                  <option value="Đã giao dịch">Đã giao dịch thành công</option>
                  <option value="Tạm dừng">Tạm dừng</option>
                  <option value="Không có nhu cầu">Không có nhu cầu</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Môi giới phụ trách
                </label>
                <select
                  value={assignedAgentId}
                  onChange={(e) => setAssignedAgentId(e.target.value)}
                  disabled={!isAdmin && !isTeamLeader}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:border-slate-900 ring-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.employeeCode}) - {u.role === 'ADMIN' ? 'Quản trị' : u.role === 'TEAM_LEADER' ? 'Trưởng nhóm' : 'Môi giới'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Next appointment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  Lịch hẹn chăm sóc / dẫn khách tiếp theo
                </label>
                <input
                  type="datetime-local"
                  value={nextAppointmentDate}
                  onChange={(e) => setNextAppointmentDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:border-slate-900 ring-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú lịch hẹn / Công việc cần làm
                </label>
                <input
                  type="text"
                  value={nextAppointmentNote}
                  onChange={(e) => setNextAppointmentNote(e.target.value)}
                  placeholder="VD: Dẫn khách xem căn Thảo Điền BDS-000001 lúc 9h30 sáng"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:border-slate-900 ring-slate-200"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ghi chú chi tiết sở thích, thói quen và yêu cầu đặc biệt của khách
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="VD: Khách thích hướng Đông Nam, phong thủy hợp Tây Tứ Trạch, cần đường xe hơi tránh nhau, ưu tiên khu dân cư an ninh yên tĩnh..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:border-slate-900 ring-slate-200"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Đang lưu...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{isEdit ? 'Lưu thay đổi' : 'Thêm khách hàng'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
