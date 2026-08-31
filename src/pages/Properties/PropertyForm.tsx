import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Building2,
  Save,
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  Trash2,
  Star,
  AlertTriangle,
  Info,
  MapPin,
  FileCheck,
  Phone,
  DollarSign,
  Layers,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import {
  Property,
  TransactionType,
  PropertyType,
  PropertyStatus,
  Direction,
  LegalType,
} from '../../types';
import { compressImage } from '../../utils/imageCompressor';
import { uploadPropertyImage } from '../../utils/fileUpload';
import { DuplicateWarningModal } from '../../components/common/DuplicateWarningModal';

const VIETNAM_CITIES = ['Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Bình Dương', 'Đồng Nai', 'Bà Rịa - Vũng Tàu', 'Long An', 'Cần Thơ'];
const PROPERTY_TYPES: PropertyType[] = [
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

const DIRECTIONS: Direction[] = ['Đông', 'Tây', 'Nam', 'Bắc', 'Đông Nam', 'Đông Bắc', 'Tây Nam', 'Tây Bắc'];
const LEGAL_TYPES: LegalType[] = [
  'Sổ hồng riêng',
  'Sổ đỏ chính chủ',
  'Hợp đồng mua bán (HĐMB)',
  'Đang chờ cấp sổ',
  'Sổ chung / Vi bằng',
  'Giấy tờ tay hợp lệ',
];

export const PropertyForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const { properties, addProperty, updateProperty, checkDuplicateProperty, users, teams } = useData();
  const { currentUser, canEditProperty, isAdmin } = useAuth();
  const { success, error, warning } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    isOpen: boolean;
    reasons: string[];
    matchedProperties: Property[];
  }>({
    isOpen: false,
    reasons: [],
    matchedProperties: [],
  });

  // Form State
  const [formData, setFormData] = useState<Partial<Property>>({
    title: '',
    description: '',
    highlights: '',
    transactionType: 'SALE',
    propertyType: 'Nhà phố',
    status: 'Đang bán',
    
    // Address
    city: 'Hồ Chí Minh',
    district: 'Quận 1',
    ward: 'Phường Bến Nghé',
    street: '',
    houseNumber: '',
    address: '',
    mapsUrl: '',

    // Technical specs
    landArea: 80,
    usableArea: 240,
    width: 4.5,
    length: 18,
    floors: 4,
    bedrooms: 4,
    bathrooms: 4,
    direction: 'Đông Nam',
    balconyDirection: 'Đông Nam',
    roadWidth: 6,
    structure: 'Bê tông cốt thép',
    amenities: ['Thang máy', 'Sân đỗ ô tô', 'Nội thất cao cấp'],

    // Specific transaction details
    salePrice: 12500000000,
    rentPriceMonthly: undefined,
    depositMonths: 2,
    minLeaseTermMonths: 12,
    transferPrice: undefined,
    transferIncludesInventory: true,
    transferInventoryDetails: '',
    monthlyRevenueEstimate: undefined,
    monthlyProfitEstimate: undefined,
    commissionRateSale: 1.5,
    commissionRateRentMonths: 1,

    // Legal
    legalType: 'Sổ hồng riêng',
    cadastralLotNumber: '',
    cadastralSheetNumber: '',
    planningStatus: 'Quy hoạch đất ở đô thị lâu dài',
    hasConstructionPermit: true,

    // Owner
    ownerName: '',
    ownerPhone: '',
    ownerPhoneAlt: '',
    ownerIdentityNumber: '',
    ownerRelationship: 'Chính chủ đứng tên sổ',
    ownerContactNote: 'Gọi trước 30 phút khi dẫn khách',

    // Images
    images: [],
    coverImage: '',

    // Assignment
    assignedAgentId: currentUser?.id || users[0]?.id || '',
    teamId: currentUser?.teamId || teams[0]?.id || '',
    internalNotes: '',
    keysLocation: 'Chìa khóa gửi tại văn phòng công ty',
  });

  // Load existing property in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const existing = properties.find((p) => p.id === id);
      if (existing) {
        if (!canEditProperty(existing.createdBy, existing.assignedAgentId)) {
          error('Từ chối truy cập', 'Bạn không có quyền chỉnh sửa sản phẩm của môi giới khác.');
          navigate('/properties');
          return;
        }
        setFormData(existing);
      } else {
        error('Không tìm thấy BĐS', 'Sản phẩm không tồn tại hoặc đã bị xóa.');
        navigate('/properties');
      }
    }
  }, [id, isEditMode, properties]);

  // Auto-compose full address
  const handleAddressFieldChange = (field: string, val: string) => {
    const updated = { ...formData, [field]: val };
    const parts = [
      updated.houseNumber,
      updated.street,
      updated.ward,
      updated.district,
      updated.city,
    ].filter(Boolean);
    
    setFormData({
      ...updated,
      address: parts.join(', '),
    });
  };

  // Image Upload with Smart Compression & Firebase Storage
  const handleImageFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newImageUrls: string[] = [];
    const propertyPrefix = formData.code || 'BDS';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      try {
        const uploadedUrl = await uploadPropertyImage(file, propertyPrefix);
        newImageUrls.push(uploadedUrl);
      } catch (err) {
        console.error('Upload image error:', err);
      }
    }

    setFormData((prev) => {
      const currentImages = prev.images || [];
      const combined = [...currentImages, ...newImageUrls];
      return {
        ...prev,
        images: combined,
        coverImage: prev.coverImage || combined[0] || '',
      };
    });

    setIsUploading(false);
    success(`Đã thêm ${newImageUrls.length} ảnh`, 'Đã lưu trữ an toàn trên Firebase Storage.');
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => {
      const newImages = [...(prev.images || [])];
      const removed = newImages.splice(index, 1)[0];
      let newCover = prev.coverImage;
      if (newCover === removed) {
        newCover = newImages[0] || '';
      }
      return { ...prev, images: newImages, coverImage: newCover };
    });
  };

  const handleSetCover = (url: string) => {
    setFormData((prev) => ({ ...prev, coverImage: url }));
    success('Đã chọn ảnh đại diện');
  };

  const validateForm = () => {
    if (!formData.title?.trim()) {
      error('Thiếu thông tin', 'Vui lòng nhập tiêu đề bất động sản.');
      return false;
    }
    if (!formData.ownerName?.trim() || !formData.ownerPhone?.trim()) {
      error('Thiếu thông tin chủ nhà', 'Vui lòng nhập tên và số điện thoại liên hệ của chủ nhà.');
      return false;
    }
    if (!formData.landArea || formData.landArea <= 0) {
      error('Diện tích không hợp lệ', 'Vui lòng nhập diện tích đất lớn hơn 0.');
      return false;
    }
    return true;
  };

  // Submit Handler
  const handleSave = async (bypassDuplicate = false) => {
    if (!validateForm()) return;

    // Check duplicate
    if (!bypassDuplicate) {
      const dupCheck = checkDuplicateProperty(formData, id);
      if (dupCheck.isDuplicate) {
        setDuplicateWarning({
          isOpen: true,
          reasons: dupCheck.reasons,
          matchedProperties: dupCheck.matchedProperties,
        });
        return;
      }
    }

    try {
      if (isEditMode && id) {
        await updateProperty(id, formData);
        navigate(`/properties/${id}`);
      } else {
        const created = await addProperty(formData as any);
        navigate(`/properties/${created.id}`);
      }
    } catch (err: any) {
      error('Lưu thất bại', err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/properties')}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isEditMode ? `Chỉnh sửa BĐS ${formData.code || ''}` : 'Tiếp nhận ký gửi BĐS mới'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Nhập đầy đủ thông số kỹ thuật, pháp lý và bảo mật thông tin chủ nhà.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/properties')}
            className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all active:scale-98"
          >
            <Save className="w-4 h-4" />
            <span>{isEditMode ? 'Lưu thay đổi' : 'Tạo mới nguồn hàng'}</span>
          </button>
        </div>
      </div>

      {/* Main Form Fields */}
      <div className="space-y-6">
        {/* SECTION 1: Transaction Type & Basic Info */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="w-4 h-4 text-amber-600" />
            1. Phân loại giao dịch & Thông tin cơ bản
          </h2>

          {/* Transaction Type Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">Loại hình nghiệp vụ *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { label: 'Ký gửi Bán', value: 'SALE', desc: 'Bán nhà đất, căn hộ' },
                { label: 'Ký gửi Cho thuê', value: 'RENT', desc: 'Thuê mặt bằng, phòng' },
                { label: 'Sang nhượng', value: 'TRANSFER', desc: 'Sang nhượng quán/shop' },
                { label: 'Bán & Cho thuê', value: 'SALE_AND_RENT', desc: 'Song song bán hoặc thuê' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, transactionType: item.value as any })}
                  className={`p-3 rounded-xl text-left border transition-all ${
                    formData.transactionType === item.value
                      ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20 text-slate-950'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  <div className="font-bold text-xs">{item.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Property Type & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Loại bất động sản *</label>
              <select
                value={formData.propertyType}
                onChange={(e) => setFormData({ ...formData, propertyType: e.target.value as PropertyType })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              >
                {PROPERTY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái hiện tại</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as PropertyStatus })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              >
                <option value="Đang bán">Đang bán</option>
                <option value="Đang cho thuê">Đang cho thuê</option>
                <option value="Đang sang nhượng">Đang sang nhượng</option>
                <option value="Mới tiếp nhận">Mới tiếp nhận</option>
                <option value="Chờ xác minh">Chờ xác minh</option>
                <option value="Có khách quan tâm">Có khách quan tâm</option>
                <option value="Đang thương lượng">Đang thương lượng</option>
                <option value="Đã nhận cọc">Đã nhận cọc</option>
                <option value="Đã hoàn tất">Đã hoàn tất</option>
                <option value="Tạm ngưng giao dịch">Tạm ngưng giao dịch</option>
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tiêu đề hiển thị (Quảng cáo / Nội bộ) *
            </label>
            <input
              type="text"
              placeholder="VD: Bán gấp biệt thự góc 2 mặt tiền đường Nguyễn Huệ Quận 1 DT 120m2"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* Highlights & Description */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Điểm nổi bật ngắn</label>
              <input
                type="text"
                placeholder="VD: Hẻm xe hơi tránh nhau, nở hậu tài lộc, dòng tiền cho thuê 40tr/tháng..."
                value={formData.highlights}
                onChange={(e) => setFormData({ ...formData, highlights: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả chi tiết</label>
              <textarea
                rows={3}
                placeholder="Mô tả kỹ kết cấu, tiện ích xung quanh, lý do bán/thuê..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Location & Address */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <MapPin className="w-4 h-4 text-amber-600" />
            2. Vị trí & Địa chỉ
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tỉnh / Thành phố *</label>
              <select
                value={formData.city}
                onChange={(e) => handleAddressFieldChange('city', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              >
                {VIETNAM_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quận / Huyện *</label>
              <input
                type="text"
                placeholder="VD: Quận 1, Bình Thạnh, Cầu Giấy..."
                value={formData.district}
                onChange={(e) => handleAddressFieldChange('district', e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phường / Xã</label>
              <input
                type="text"
                placeholder="VD: Phường Bến Nghé"
                value={formData.ward}
                onChange={(e) => handleAddressFieldChange('ward', e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tên đường</label>
              <input
                type="text"
                placeholder="VD: Nguyễn Huệ"
                value={formData.street}
                onChange={(e) => handleAddressFieldChange('street', e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Số nhà / Số phòng</label>
              <input
                type="text"
                placeholder="VD: 88/12"
                value={formData.houseNumber}
                onChange={(e) => handleAddressFieldChange('houseNumber', e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Full address preview */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Địa chỉ đầy đủ hiển thị</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* SECTION 3: Technical Specifications & Dimensions */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Layers className="w-4 h-4 text-amber-600" />
            3. Thông số kỹ thuật & Kích thước
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Diện tích đất (m²) *</label>
              <input
                type="number"
                value={formData.landArea || ''}
                onChange={(e) => setFormData({ ...formData, landArea: Number(e.target.value) })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Diện tích sử dụng (m²)</label>
              <input
                type="number"
                value={formData.usableArea || ''}
                onChange={(e) => setFormData({ ...formData, usableArea: Number(e.target.value) })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mặt tiền / Ngang (m)</label>
              <input
                type="number"
                step="0.1"
                value={formData.width || ''}
                onChange={(e) => setFormData({ ...formData, width: Number(e.target.value) })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Chiều dài (m)</label>
              <input
                type="number"
                step="0.1"
                value={formData.length || ''}
                onChange={(e) => setFormData({ ...formData, length: Number(e.target.value) })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Số tầng</label>
              <input
                type="number"
                value={formData.floors || ''}
                onChange={(e) => setFormData({ ...formData, floors: Number(e.target.value) })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Số phòng ngủ</label>
              <input
                type="number"
                value={formData.bedrooms || ''}
                onChange={(e) => setFormData({ ...formData, bedrooms: Number(e.target.value) })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Số WC</label>
              <input
                type="number"
                value={formData.bathrooms || ''}
                onChange={(e) => setFormData({ ...formData, bathrooms: Number(e.target.value) })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Đường trước nhà (m)</label>
              <input
                type="number"
                step="0.5"
                value={formData.roadWidth || ''}
                onChange={(e) => setFormData({ ...formData, roadWidth: Number(e.target.value) })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hướng nhà chính</label>
              <select
                value={formData.direction}
                onChange={(e) => setFormData({ ...formData, direction: e.target.value as Direction })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              >
                {DIRECTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kết cấu xây dựng</label>
              <input
                type="text"
                placeholder="VD: 1 Trệt 3 Lầu sân thượng BTCT..."
                value={formData.structure}
                onChange={(e) => setFormData({ ...formData, structure: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nơi giữ chìa khóa / Pass cửa</label>
              <input
                type="text"
                placeholder="VD: Chìa khóa gửi công ty, pass: 1234"
                value={formData.keysLocation}
                onChange={(e) => setFormData({ ...formData, keysLocation: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: Transaction Specifics & Pricing */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <DollarSign className="w-4 h-4 text-amber-600" />
            4. Giá cả, Hoa hồng & Nghiệp vụ chi tiết
          </h2>

          {/* If SALE or SALE_AND_RENT */}
          {(formData.transactionType === 'SALE' || formData.transactionType === 'SALE_AND_RENT') && (
            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-3">
              <div className="text-xs font-bold text-emerald-900 uppercase">Nghiệp vụ Ký gửi Bán</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Giá bán (VNĐ) *</label>
                  <input
                    type="number"
                    value={formData.salePrice || ''}
                    onChange={(e) => setFormData({ ...formData, salePrice: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phí hoa hồng bán (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.commissionRateSale || ''}
                    onChange={(e) => setFormData({ ...formData, commissionRateSale: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Thương lượng giá</label>
                  <select
                    value={formData.isNegotiable ? 'yes' : 'no'}
                    onChange={(e) => setFormData({ ...formData, isNegotiable: e.target.value === 'yes' })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  >
                    <option value="yes">Có bớt lộc / thương lượng</option>
                    <option value="no">Giá chốt cứng</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* If RENT or SALE_AND_RENT */}
          {(formData.transactionType === 'RENT' || formData.transactionType === 'SALE_AND_RENT') && (
            <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 space-y-3">
              <div className="text-xs font-bold text-blue-900 uppercase">Nghiệp vụ Ký gửi Cho thuê</div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Giá thuê / tháng (VNĐ) *</label>
                  <input
                    type="number"
                    value={formData.rentPriceMonthly || ''}
                    onChange={(e) => setFormData({ ...formData, rentPriceMonthly: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tiền cọc (Số tháng)</label>
                  <input
                    type="number"
                    value={formData.depositMonths || ''}
                    onChange={(e) => setFormData({ ...formData, depositMonths: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Thời hạn thuê tối thiểu (tháng)</label>
                  <input
                    type="number"
                    value={formData.minLeaseTermMonths || ''}
                    onChange={(e) => setFormData({ ...formData, minLeaseTermMonths: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hoa hồng thuê (tháng)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.commissionRateRentMonths || ''}
                    onChange={(e) => setFormData({ ...formData, commissionRateRentMonths: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* If TRANSFER */}
          {formData.transactionType === 'TRANSFER' && (
            <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-3">
              <div className="text-xs font-bold text-amber-900 uppercase">Nghiệp vụ Sang nhượng mặt bằng</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Giá sang nhượng toàn bộ (VNĐ) *</label>
                  <input
                    type="number"
                    value={formData.transferPrice || ''}
                    onChange={(e) => setFormData({ ...formData, transferPrice: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Doanh thu ước tính / tháng</label>
                  <input
                    type="number"
                    value={formData.monthlyRevenueEstimate || ''}
                    onChange={(e) => setFormData({ ...formData, monthlyRevenueEstimate: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Lợi nhuận ước tính / tháng</label>
                  <input
                    type="number"
                    value={formData.monthlyProfitEstimate || ''}
                    onChange={(e) => setFormData({ ...formData, monthlyProfitEstimate: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Danh mục cơ sở vật chất sang lại</label>
                <textarea
                  rows={2}
                  placeholder="VD: Để lại toàn bộ bàn ghế gỗ, hệ thống máy lạnh Daikin, máy pha cà phê Faema..."
                  value={formData.transferInventoryDetails}
                  onChange={(e) => setFormData({ ...formData, transferInventoryDetails: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* SECTION 5: Legal & Cadastral (Chống trùng lặp) */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileCheck className="w-4 h-4 text-amber-600" />
            5. Pháp lý & Thông số địa chính (Số thửa & Số tờ bản đồ)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tình trạng pháp lý</label>
              <select
                value={formData.legalType}
                onChange={(e) => setFormData({ ...formData, legalType: e.target.value as LegalType })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              >
                {LEGAL_TYPES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số thửa đất (Hỗ trợ phát hiện trùng)
              </label>
              <input
                type="text"
                placeholder="VD: 142"
                value={formData.cadastralLotNumber}
                onChange={(e) => setFormData({ ...formData, cadastralLotNumber: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số tờ bản đồ (Hỗ trợ phát hiện trùng)
              </label>
              <input
                type="text"
                placeholder="VD: 28"
                value={formData.cadastralSheetNumber}
                onChange={(e) => setFormData({ ...formData, cadastralSheetNumber: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Thông tin quy hoạch & xây dựng</label>
            <input
              type="text"
              placeholder="VD: Đất ở đô thị hiện hữu không quy hoạch lộ giới, được phép xây cao 6 tầng"
              value={formData.planningStatus}
              onChange={(e) => setFormData({ ...formData, planningStatus: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* SECTION 6: Confidential Owner Info */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Phone className="w-4 h-4 text-amber-600" />
              6. Thông tin chủ bất động sản (Bảo mật nội bộ)
            </h2>
            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
              🔒 Phân quyền bảo mật
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Họ tên chủ nhà *</label>
              <input
                type="text"
                placeholder="VD: Nguyễn Văn Hưng"
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại chính *</label>
              <input
                type="tel"
                placeholder="VD: 0908123456"
                value={formData.ownerPhone}
                onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-mono font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại phụ / Zalo</label>
              <input
                type="tel"
                placeholder="VD: 0912345678"
                value={formData.ownerPhoneAlt}
                onChange={(e) => setFormData({ ...formData, ownerPhoneAlt: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mối quan hệ với bất động sản</label>
              <input
                type="text"
                placeholder="VD: Đứng tên trên sổ, Con trai chủ nhà, Quản lý tòa nhà..."
                value={formData.ownerRelationship}
                onChange={(e) => setFormData({ ...formData, ownerRelationship: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lưu ý khi liên hệ chủ nhà</label>
              <input
                type="text"
                placeholder="VD: Báo trước 1 tiếng, không nhắc giá trước mặt người thuê..."
                value={formData.ownerContactNote}
                onChange={(e) => setFormData({ ...formData, ownerContactNote: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 7: Smart Image Upload & Compression */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-600" />
                7. Hình ảnh & Sổ hồng thực tế
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Tự động nén ảnh chất lượng cao để tải nhanh trên điện thoại.
              </p>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploading ? 'Đang nén ảnh...' : 'Chọn ảnh tải lên'}</span>
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept="image/*"
            onChange={(e) => handleImageFiles(e.target.files)}
            className="hidden"
          />

          {/* Upload Dropzone / Gallery */}
          {(!formData.images || formData.images.length === 0) && !isUploading ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-8 border-2 border-dashed border-slate-200 hover:border-amber-400 rounded-2xl text-center cursor-pointer transition-colors bg-slate-50/50"
            >
              <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-800">Chạm hoặc kéo thả ảnh vào đây</p>
              <p className="text-[11px] text-slate-500 mt-1">Hỗ trợ PNG, JPG, JPEG. Chụp trực tiếp từ điện thoại.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {formData.images?.map((url, idx) => {
                const isCover = formData.coverImage === url;
                return (
                  <div
                    key={idx}
                    className={`group relative rounded-xl overflow-hidden border-2 aspect-square bg-slate-100 ${
                      isCover ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200'
                    }`}
                  >
                    <img
                      src={url}
                      alt={`Ảnh ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />

                    {/* Cover badge */}
                    {isCover && (
                      <div className="absolute top-1.5 left-1.5 bg-amber-500 text-slate-950 text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow-xs">
                        Ảnh bìa
                      </div>
                    )}

                    {/* Actions overlay */}
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      {!isCover && (
                        <button
                          type="button"
                          onClick={() => handleSetCover(url)}
                          className="p-1.5 bg-white text-slate-900 rounded-lg hover:bg-amber-400 text-xs"
                          title="Đặt làm ảnh đại diện"
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-xs"
                        title="Xóa ảnh"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add more button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border-2 border-dashed border-slate-300 hover:border-amber-500 flex flex-col items-center justify-center aspect-square text-slate-400 hover:text-slate-700 transition-colors bg-slate-50/50"
              >
                <Upload className="w-5 h-5 mb-1" />
                <span className="text-[11px] font-semibold">Thêm ảnh</span>
              </button>
            </div>
          )}
        </div>

        {/* SECTION 8: Assignment & Internal Notes */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sparkles className="w-4 h-4 text-amber-600" />
            8. Phân công môi giới & Ghi chú nội bộ
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Môi giới phụ trách trực tiếp</label>
              <select
                value={formData.assignedAgentId}
                onChange={(e) => {
                  const agent = users.find((u) => u.id === e.target.value);
                  setFormData({
                    ...formData,
                    assignedAgentId: e.target.value,
                    teamId: agent?.teamId || formData.teamId,
                  });
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.employeeCode}) - {u.role === 'ADMIN' ? 'Admin' : u.role === 'TEAM_LEADER' ? 'Trưởng nhóm' : 'Môi giới'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Thuộc Đội nhóm / Phòng ban</label>
              <select
                value={formData.teamId}
                onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.leaderName || 'Trưởng nhóm'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú nội bộ bí mật</label>
            <textarea
              rows={2}
              placeholder="Ghi chú thêm về tâm lý chủ nhà, hoa hồng thực nhận, nguồn khách tiềm năng..."
              value={formData.internalNotes}
              onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Bottom Floating Actions */}
      <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/properties')}
          className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
        >
          Hủy bỏ
        </button>

        <button
          type="button"
          onClick={() => handleSave(false)}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all active:scale-98"
        >
          <Save className="w-4 h-4" />
          <span>{isEditMode ? 'Lưu thay đổi' : 'Tạo mới nguồn hàng'}</span>
        </button>
      </div>

      {/* Duplicate Warning Modal */}
      <DuplicateWarningModal
        isOpen={duplicateWarning.isOpen}
        onClose={() => setDuplicateWarning((prev) => ({ ...prev, isOpen: false }))}
        onProceed={() => {
          setDuplicateWarning((prev) => ({ ...prev, isOpen: false }));
          handleSave(true);
        }}
        reasons={duplicateWarning.reasons}
        matchedProperties={duplicateWarning.matchedProperties}
      />
    </div>
  );
};
