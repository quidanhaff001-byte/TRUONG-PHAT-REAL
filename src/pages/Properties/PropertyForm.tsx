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
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Database,
  CloudCheck,
} from 'lucide-react';
import {
  Property,
  PropertyType,
  PropertyStatus,
  Direction,
  LegalType,
  PropertyImageItem,
} from '../../types';
import { compressImage } from '../../utils/imageCompressor';
import {
  validatePropertyImageFile,
  uploadPropertyImageToStorage,
  formatFileSize,
} from '../../utils/fileUpload';
import { generatePropertyCode } from '../../utils/formatters';
import { isStorageConfigured } from '../../config/firebase';
import { DuplicateWarningModal } from '../../components/common/DuplicateWarningModal';

const VIETNAM_CITIES = ['An Giang', 'Cần Thơ', 'Kiên Giang', 'Đồng Tháp', 'Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Bình Dương'];
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

export interface StagedImageItem {
  id: string;
  isExisting: boolean;
  file?: File;
  previewUrl: string;
  fileName: string;
  originalSize: number;
  compressedSize?: number;
  width?: number;
  height?: number;
  isCover: boolean;
  sortOrder: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  errorMessage?: string;
  itemMetadata?: PropertyImageItem;
}

export const PropertyForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const { properties, addProperty, updateProperty, checkDuplicateProperty, users, teams } = useData();
  const { currentUser, canEditProperty, isAdmin } = useAuth();
  const { success, error, warning, info } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [stagedImages, setStagedImages] = useState<StagedImageItem[]>([]);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');

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
    imageDetails: [],

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

        // Populate stagedImages with existing images
        const existingImgs = existing.images || (existing.coverImage ? [existing.coverImage] : []);
        const stagedList: StagedImageItem[] = existingImgs.map((imgUrl, idx) => {
          const detail = existing.imageDetails?.find((d) => d.downloadURL === imgUrl);
          return {
            id: detail?.id || `existing_${idx}_${Date.now()}`,
            isExisting: true,
            previewUrl: imgUrl,
            fileName: detail?.fileName || `Ảnh ${idx + 1}`,
            originalSize: detail?.size || 0,
            compressedSize: detail?.size,
            isCover: existing.coverImage ? existing.coverImage === imgUrl : idx === 0,
            sortOrder: detail?.sortOrder ?? idx,
            status: 'success',
            progress: 100,
            itemMetadata: detail || {
              id: `existing_${idx}`,
              propertyId: existing.id,
              fileName: `Ảnh ${idx + 1}`,
              storagePath: '',
              downloadURL: imgUrl,
              contentType: 'image/jpeg',
              size: 0,
              isCover: existing.coverImage ? existing.coverImage === imgUrl : idx === 0,
              sortOrder: idx,
              uploadedAt: existing.createdAt || new Date().toISOString(),
              uploadedBy: existing.assignedAgentName || 'Agent',
            },
          };
        });
        setStagedImages(stagedList);
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

  // Stage selected image files with client-side compression and validation
  const handleSelectFiles = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;

    // 1. Ensure each element is a genuine File instance
    const fileArray = Array.from(files).filter((f): f is File => f instanceof File);
    if (fileArray.length === 0) {
      error('Tệp không hợp lệ', 'Không tìm thấy tệp ảnh hợp lệ từ nguồn chọn.');
      return;
    }

    const MAX_TOTAL_IMAGES = 20;
    if (stagedImages.length + fileArray.length > MAX_TOTAL_IMAGES) {
      error(
        'Vượt quá giới hạn',
        `Mỗi bất động sản chỉ được lưu tối đa ${MAX_TOTAL_IMAGES} ảnh (hiện có: ${stagedImages.length} ảnh).`
      );
      return;
    }

    const newStagedList: StagedImageItem[] = [];
    const existingFileInfo = stagedImages.map((s) => ({ name: s.fileName, size: s.originalSize }));
    const invalidFiles: { name: string; reason: string }[] = [];

    for (const file of fileArray) {
      // Validation (Format, Apple HEIC, Max 10MB, Duplicate)
      const validation = validatePropertyImageFile(file, existingFileInfo);
      if (!validation.valid) {
        invalidFiles.push({ name: file.name, reason: validation.error || 'Ảnh không hợp lệ.' });
        continue;
      }

      existingFileInfo.push({ name: file.name, size: file.size });

      // Client-side compression & preview generation
      try {
        const compressed = await compressImage(file, 1920, 1440, 0.85);
        const stagedId = `staged_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        
        newStagedList.push({
          id: stagedId,
          isExisting: false,
          file: compressed.file,
          previewUrl: compressed.dataUrl,
          fileName: file.name,
          originalSize: file.size,
          compressedSize: compressed.compressedSize,
          width: compressed.width,
          height: compressed.height,
          isCover: false,
          sortOrder: stagedImages.length + newStagedList.length,
          status: 'pending',
          progress: 0,
        });
      } catch (err: any) {
        console.warn('Compress image preview warning:', err);
        // Safe fallback using object URL
        const objUrl = URL.createObjectURL(file);
        newStagedList.push({
          id: `staged_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          isExisting: false,
          file: file,
          previewUrl: objUrl,
          fileName: file.name,
          originalSize: file.size,
          isCover: false,
          sortOrder: stagedImages.length + newStagedList.length,
          status: 'pending',
          progress: 0,
        });
      }
    }

    // Report invalid files if any
    if (invalidFiles.length > 0) {
      invalidFiles.forEach((inv) => {
        warning(`Bỏ qua "${inv.name}"`, inv.reason);
      });
    }

    if (newStagedList.length === 0) {
      if (invalidFiles.length > 0) {
        error('Không có ảnh nào được thêm', 'Vui lòng kiểm tra định dạng (JPG, PNG, WEBP) và dung lượng (<10MB).');
      }
    } else {
      setStagedImages((prev) => {
        const combined = [...prev, ...newStagedList];
        const hasCover = combined.some((img) => img.isCover);
        if (!hasCover && combined.length > 0) {
          combined[0].isCover = true;
        }
        return combined;
      });

      success(
        `Đã thêm ${newStagedList.length} ảnh xem trước`,
        'Ảnh đã được nén tối ưu. Bấm "Lưu thay đổi / Tiếp nhận" để tải lên Firebase Storage.'
      );
    }

    // Reset input value after processing is done
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Set Cover Image
  const handleSetCover = (stagedId: string) => {
    setStagedImages((prev) =>
      prev.map((img) => ({
        ...img,
        isCover: img.id === stagedId,
      }))
    );
    success('Đã chọn làm ảnh bìa');
  };

  // Move Image Left / Right (Reorder)
  const handleMoveImage = (index: number, direction: 'left' | 'right') => {
    setStagedImages((prev) => {
      const newList = [...prev];
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newList.length) return prev;

      const temp = newList[index];
      newList[index] = newList[targetIndex];
      newList[targetIndex] = temp;

      // Re-assign sortOrder
      return newList.map((item, idx) => ({ ...item, sortOrder: idx }));
    });
  };

  // Remove Staged Image
  const handleRemoveImage = (stagedId: string) => {
    setStagedImages((prev) => {
      const removed = prev.find((item) => item.id === stagedId);
      if (removed && !removed.isExisting && removed.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(removed.previewUrl);
      }

      const filtered = prev.filter((item) => item.id !== stagedId);
      // If removed item was cover, assign new cover to first item
      if (removed?.isCover && filtered.length > 0) {
        filtered[0].isCover = true;
      }
      return filtered.map((item, idx) => ({ ...item, sortOrder: idx }));
    });
  };

  // Retry failed image uploads
  const handleRetryFailedImages = () => {
    setStagedImages((prev) =>
      prev.map((img) =>
        img.status === 'error' ? { ...img, status: 'pending', progress: 0, errorMessage: undefined } : img
      )
    );
    info('Đã đặt lại trạng thái', 'Sẵn sàng thử lại tải lên các ảnh bị lỗi.');
  };

  // Form Validation
  const validateForm = () => {
    if (!formData.title?.trim()) {
      error('Thiếu thông tin tiêu đề', 'Vui lòng nhập tiêu đề bất động sản.');
      return false;
    }
    if (!formData.ownerName?.trim() || !formData.ownerPhone?.trim()) {
      error('Thiếu thông tin chủ nhà', 'Vui lòng nhập tên và số điện thoại liên hệ của chủ nhà.');
      return false;
    }
    if (!formData.landArea || formData.landArea <= 0) {
      error('Diện tích không hợp lệ', 'Vui lòng nhập diện tích đất lớn hơn 0 m².');
      return false;
    }
    return true;
  };

  // Core Submit Handler with 3-Step Image Flow and Promise.allSettled:
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

    setIsUploading(true);
    setUploadStatusText('Đang chuẩn bị lưu trữ...');

    // 1. Establish property ID and code
    const propertyId = id || (formData as any).id || `prop_${Date.now()}`;
    const sequence = properties.length + 1;
    const propertyCode = formData.code || generatePropertyCode(formData.transactionType || 'SALE', sequence);

    // 2. Identify pending images needing upload
    const currentStaged = [...stagedImages];
    const pendingUploadIndices: number[] = [];

    currentStaged.forEach((item, idx) => {
      if (!item.isExisting && item.file) {
        pendingUploadIndices.push(idx);
      }
    });

    if (pendingUploadIndices.length > 0) {
      setUploadStatusText(`Đang tải lên ${pendingUploadIndices.length} ảnh lên Firebase Storage...`);

      // Set items to uploading state
      pendingUploadIndices.forEach((idx) => {
        currentStaged[idx] = { ...currentStaged[idx], status: 'uploading', progress: 10 };
      });
      setStagedImages([...currentStaged]);

      // Upload each pending image independently using Promise.allSettled
      const uploadPromises = pendingUploadIndices.map((idx) => {
        const item = currentStaged[idx];
        return uploadPropertyImageToStorage(item.file!, propertyId, {
          fileName: item.fileName,
          isCover: item.isCover,
          sortOrder: idx,
          uploadedBy: currentUser?.fullName || currentUser?.email || 'Môi giới',
          width: item.width,
          height: item.height,
          skipCompress: true,
          onProgress: (p) => {
            currentStaged[idx] = { ...currentStaged[idx], progress: p };
            setStagedImages([...currentStaged]);
          },
        });
      });

      const settledResults = await Promise.allSettled(uploadPromises);

      let uploadedCount = 0;
      const failedList: { index: number; fileName: string; error: string }[] = [];

      settledResults.forEach((res, i) => {
        const originalIndex = pendingUploadIndices[i];
        const item = currentStaged[originalIndex];

        if (res.status === 'fulfilled') {
          uploadedCount++;
          const uploadedMeta = res.value;
          currentStaged[originalIndex] = {
            ...currentStaged[originalIndex],
            status: 'success',
            progress: 100,
            previewUrl: uploadedMeta.downloadURL,
            itemMetadata: uploadedMeta,
          };
        } else {
          const errorReason = res.reason?.message || 'Lỗi kết nối Firebase Storage';
          currentStaged[originalIndex] = {
            ...currentStaged[originalIndex],
            status: 'error',
            progress: 0,
            errorMessage: errorReason,
          };
          failedList.push({
            index: originalIndex,
            fileName: item.fileName,
            error: errorReason,
          });
        }
      });

      setStagedImages([...currentStaged]);

      // NOTIFICATION LOGIC STRICTLY COMPLIANT WITH REQUIREMENTS:
      const totalAttempted = pendingUploadIndices.length;

      if (uploadedCount === 0) {
        setIsUploading(false);
        setUploadStatusText('');
        error('Lỗi tải ảnh', 'Không có ảnh nào được tải lên. Vui lòng kiểm tra và thử lại.');
        return;
      }

      if (uploadedCount > 0 && failedList.length > 0) {
        setIsUploading(false);
        setUploadStatusText('');
        const failedNames = failedList.map((f) => f.fileName).join(', ');
        warning(
          'Tải ảnh hoàn tất một phần',
          `Đã tải thành công ${uploadedCount}/${totalAttempted} ảnh. Có ${failedList.length} ảnh bị lỗi (${failedNames}).`
        );
        return;
      }

      if (uploadedCount === totalAttempted) {
        success('Tải ảnh thành công', `Đã tải thành công ${uploadedCount}/${totalAttempted} ảnh lên Firebase Storage.`);
      }
    }

    // 3. Collect genuine download URLs and metadata (Strictly exclude blob: or data:)
    const finalImageDetails: PropertyImageItem[] = [];
    const finalImageUrls: string[] = [];

    currentStaged.forEach((item, idx) => {
      if (item.status === 'success' && item.itemMetadata) {
        finalImageDetails.push({
          ...item.itemMetadata,
          isCover: item.isCover,
          sortOrder: idx,
        });
        if (item.itemMetadata.downloadURL && !item.itemMetadata.downloadURL.startsWith('blob:') && !item.itemMetadata.downloadURL.startsWith('data:')) {
          finalImageUrls.push(item.itemMetadata.downloadURL);
        }
      } else if (item.isExisting && item.previewUrl && !item.previewUrl.startsWith('blob:') && !item.previewUrl.startsWith('data:')) {
        finalImageUrls.push(item.previewUrl);
        if (item.itemMetadata) {
          finalImageDetails.push({
            ...item.itemMetadata,
            isCover: item.isCover,
            sortOrder: idx,
          });
        }
      }
    });

    // Determine cover image URL
    const coverItem = currentStaged.find((s) => s.isCover && s.status === 'success');
    const coverImageUrl = coverItem?.itemMetadata?.downloadURL || finalImageUrls[0] || '';

    // 4. Save Property document to Firestore / local state
    setUploadStatusText('Đang lưu thông tin BĐS...');
    try {
      const propertyPayload: Partial<Property> = {
        ...formData,
        id: propertyId,
        code: propertyCode,
        images: finalImageUrls,
        coverImage: coverImageUrl,
        imageDetails: finalImageDetails,
      };

      if (isEditMode && id) {
        await updateProperty(id, propertyPayload);
        navigate(`/properties/${id}`);
      } else {
        const created = await addProperty(propertyPayload as any);
        navigate(`/properties/${created.id}`);
      }
    } catch (err: any) {
      console.error('Save property error:', err);
      error('Lỗi khi lưu BĐS', err.message || 'Không thể lưu thông tin vào cơ sở dữ liệu.');
    } finally {
      setIsUploading(false);
      setUploadStatusText('');
    }
  };

  const failedCount = stagedImages.filter((img) => img.status === 'error').length;
  const pendingCount = stagedImages.filter((img) => img.status === 'pending').length;

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
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {isEditMode ? `Chỉnh sửa BĐS ${formData.code || ''}` : 'Tiếp nhận ký gửi BĐS mới'}
              </h1>
              {isStorageConfigured && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Storage Sẵn sàng
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Nhập đầy đủ thông số kỹ thuật, quản lý ảnh thực tế và bảo mật thông tin chủ nhà.
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
            disabled={isUploading}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#001f3f] hover:bg-[#002e5c] text-white rounded-xl text-xs font-bold shadow-md shadow-slate-900/10 transition-all disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#D4AF37]" />
                <span>{uploadStatusText || 'Đang xử lý...'}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-[#D4AF37]" />
                <span>{isEditMode ? 'Lưu thay đổi' : 'Tạo mới nguồn hàng'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Form Fields */}
      <div className="space-y-6">
        {/* SECTION 1: Transaction Type & Categories */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="w-4 h-4 text-amber-600" />
            1. Loại hình giao dịch & Phân loại BĐS
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nhu cầu giao dịch *</label>
              <select
                value={formData.transactionType}
                onChange={(e) => setFormData({ ...formData, transactionType: e.target.value as any })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
              >
                <option value="SALE">Bán bất động sản (SALE)</option>
                <option value="RENT">Cho thuê (RENT)</option>
                <option value="TRANSFER">Sang nhượng mặt bằng (TRANSFER)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Loại hình sản phẩm *</label>
              <select
                value={formData.propertyType}
                onChange={(e) => setFormData({ ...formData, propertyType: e.target.value as any })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái hiện tại *</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
              >
                <option value="Mới tiếp nhận">Mới tiếp nhận</option>
                <option value="Đang bán">Đang bán</option>
                <option value="Đang cho thuê">Đang cho thuê</option>
                <option value="Đang thương lượng">Đang thương lượng</option>
                <option value="Đã nhận cọc">Đã nhận cọc</option>
                <option value="Đã bán">Đã bán</option>
                <option value="Tạm ngưng">Tạm ngưng giao dịch</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tiêu đề tin đăng *</label>
            <input
              type="text"
              placeholder="VD: Bán nhà phố mặt tiền Nguyễn Văn Cừ, P. Cầu Kho, Quận 1 (4.5x18m, 4 lầu đẹp)"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* SECTION 2: Location & Address */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <MapPin className="w-4 h-4 text-amber-600" />
            2. Vị trí & Địa chỉ chi tiết
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tỉnh / Thành phố *</label>
              <select
                value={formData.city}
                onChange={(e) => handleAddressFieldChange('city', e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              >
                {VIETNAM_CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quận / Huyện *</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => handleAddressFieldChange('district', e.target.value)}
                placeholder="VD: Quận 1, Long Xuyên..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phường / Xã</label>
              <input
                type="text"
                value={formData.ward}
                onChange={(e) => handleAddressFieldChange('ward', e.target.value)}
                placeholder="VD: Phường Bến Nghé"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tên đường</label>
              <input
                type="text"
                value={formData.street}
                onChange={(e) => handleAddressFieldChange('street', e.target.value)}
                placeholder="VD: Nguyễn Huệ, Lê Lợi..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Số nhà / Số thửa</label>
              <input
                type="text"
                value={formData.houseNumber}
                onChange={(e) => handleAddressFieldChange('houseNumber', e.target.value)}
                placeholder="VD: 128/4A"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Địa chỉ đầy đủ (Tự động tổng hợp)</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Technical Specs & Price */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Layers className="w-4 h-4 text-amber-600" />
            3. Thông số kỹ thuật & Giá giao dịch
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Diện tích đất (m²) *</label>
              <input
                type="number"
                value={formData.landArea || ''}
                onChange={(e) => setFormData({ ...formData, landArea: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Diện tích sử dụng (m²)</label>
              <input
                type="number"
                value={formData.usableArea || ''}
                onChange={(e) => setFormData({ ...formData, usableArea: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Chiều ngang (m)</label>
              <input
                type="number"
                step="0.1"
                value={formData.width || ''}
                onChange={(e) => setFormData({ ...formData, width: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Chiều dài (m)</label>
              <input
                type="number"
                step="0.1"
                value={formData.length || ''}
                onChange={(e) => setFormData({ ...formData, length: parseFloat(e.target.value) || 0 })}
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
                onChange={(e) => setFormData({ ...formData, floors: parseInt(e.target.value) || 0 })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Số phòng ngủ</label>
              <input
                type="number"
                value={formData.bedrooms || ''}
                onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || 0 })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hướng nhà chính</label>
              <select
                value={formData.direction}
                onChange={(e) => setFormData({ ...formData, direction: e.target.value as any })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              >
                {DIRECTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Đường trước nhà (m)</label>
              <input
                type="number"
                step="0.5"
                value={formData.roadWidth || ''}
                onChange={(e) => setFormData({ ...formData, roadWidth: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {formData.transactionType === 'SALE' ? 'Giá chào bán (VNĐ) *' : formData.transactionType === 'RENT' ? 'Giá cho thuê (VNĐ/tháng) *' : 'Giá sang nhượng (VNĐ) *'}
              </label>
              <input
                type="number"
                value={
                  formData.transactionType === 'SALE'
                    ? formData.salePrice || ''
                    : formData.transactionType === 'RENT'
                    ? formData.rentPriceMonthly || ''
                    : formData.transferPrice || ''
                }
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || undefined;
                  if (formData.transactionType === 'SALE') setFormData({ ...formData, salePrice: val });
                  else if (formData.transactionType === 'RENT') setFormData({ ...formData, rentPriceMonthly: val });
                  else setFormData({ ...formData, transferPrice: val });
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-amber-700 focus:outline-none focus:border-amber-500"
                placeholder="VD: 12500000000 (12.5 tỷ)"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tỷ lệ hoa hồng thỏa thuận</label>
              <input
                type="number"
                step="0.1"
                value={formData.commissionRateSale || 1.5}
                onChange={(e) => setFormData({ ...formData, commissionRateSale: parseFloat(e.target.value) || 0 })}
                placeholder="VD: 1.5 (%) hoặc 1 (tháng)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: Legal & Permits */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileCheck className="w-4 h-4 text-amber-600" />
            4. Pháp lý & Quy hoạch
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Loại giấy tờ pháp lý *</label>
              <select
                value={formData.legalType}
                onChange={(e) => setFormData({ ...formData, legalType: e.target.value as any })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
              >
                {LEGAL_TYPES.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Số thửa đất (Tránh trùng hàng)</label>
              <input
                type="text"
                placeholder="VD: 142"
                value={formData.cadastralLotNumber}
                onChange={(e) => setFormData({ ...formData, cadastralLotNumber: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Số tờ bản đồ</label>
              <input
                type="text"
                placeholder="VD: 36"
                value={formData.cadastralSheetNumber}
                onChange={(e) => setFormData({ ...formData, cadastralSheetNumber: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: Confidential Owner Info */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Phone className="w-4 h-4 text-amber-600" />
              5. Thông tin chủ bất động sản (Bảo mật nội bộ)
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
        </div>

        {/* SECTION 6: Complete Image Management with Firebase Storage */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-amber-600" />
                  6. Quản lý hình ảnh & Sổ hồng thực tế
                </h2>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {stagedImages.length} / 20 ảnh
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Hệ thống nén ảnh trực tiếp trên trình duyệt, lưu trữ bảo mật trên Firebase Storage.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {failedCount > 0 && (
                <button
                  type="button"
                  onClick={handleRetryFailedImages}
                  className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Thử lại {failedCount} ảnh lỗi</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || stagedImages.length >= 20}
                className="flex items-center gap-2 px-3.5 py-2 bg-[#001f3f] hover:bg-[#002e5c] text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Chọn ảnh tải lên</span>
              </button>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => handleSelectFiles(e.target.files)}
            className="hidden"
          />

          {/* Drag and Drop Zone */}
          {stagedImages.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files) handleSelectFiles(e.dataTransfer.files);
              }}
              className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                isDragOver
                  ? 'border-amber-500 bg-amber-50/50 scale-[0.99]'
                  : 'border-slate-300 hover:border-amber-400 bg-slate-50/50'
              }`}
            >
              <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-800">
                Chạm hoặc kéo thả hình ảnh bất động sản vào đây
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Hỗ trợ định dạng JPG, JPEG, PNG, WEBP (Tối đa 10 MB/ảnh, tối đa 20 ảnh).
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Image Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {stagedImages.map((staged, idx) => {
                  return (
                    <div
                      key={staged.id}
                      className={`group relative rounded-xl overflow-hidden border-2 flex flex-col bg-slate-900/5 transition-all ${
                        staged.isCover
                          ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                          : staged.status === 'error'
                          ? 'border-rose-500 bg-rose-50/20'
                          : 'border-slate-200'
                      }`}
                    >
                      {/* Image Thumbnail Container */}
                      <div className="relative aspect-square bg-slate-900/10 overflow-hidden flex items-center justify-center">
                        <img
                          src={staged.previewUrl}
                          alt={staged.fileName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />

                        {/* Top Badges */}
                        <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                          {staged.isCover ? (
                            <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded shadow-xs">
                              Ảnh bìa
                            </span>
                          ) : (
                            <span className="bg-slate-900/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs">
                              #{idx + 1}
                            </span>
                          )}

                          {staged.status === 'success' && (
                            <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Đã lưu
                            </span>
                          )}
                          {staged.status === 'pending' && (
                            <span className="bg-slate-800/80 text-white text-[9px] font-medium px-1.5 py-0.5 rounded">
                              Chờ lưu
                            </span>
                          )}
                          {staged.status === 'error' && (
                            <span className="bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                              <XCircle className="w-2.5 h-2.5" /> Lỗi
                            </span>
                          )}
                        </div>

                        {/* Uploading Progress Overlay */}
                        {staged.status === 'uploading' && (
                          <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center p-2 text-white text-center">
                            <RefreshCw className="w-5 h-5 animate-spin text-amber-400 mb-1" />
                            <span className="text-[11px] font-bold">{staged.progress}%</span>
                            <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
                              <div
                                className="bg-amber-400 h-full transition-all duration-200"
                                style={{ width: `${staged.progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Hover Quick Actions */}
                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                          {/* Set Cover Button */}
                          {!staged.isCover && (
                            <button
                              type="button"
                              onClick={() => handleSetCover(staged.id)}
                              className="p-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-lg text-xs font-bold transition-transform hover:scale-105"
                              title="Đặt làm ảnh bìa đại diện"
                            >
                              <Star className="w-3.5 h-3.5 fill-current" />
                            </button>
                          )}

                          {/* Reorder Arrows */}
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMoveImage(idx, 'left')}
                              className="p-1.5 bg-white/90 hover:bg-white text-slate-900 rounded-lg text-xs transition-transform hover:scale-105"
                              title="Di chuyển sang trái"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {idx < stagedImages.length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleMoveImage(idx, 'right')}
                              className="p-1.5 bg-white/90 hover:bg-white text-slate-900 rounded-lg text-xs transition-transform hover:scale-105"
                              title="Di chuyển sang phải"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(staged.id)}
                            disabled={isUploading}
                            className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs transition-transform hover:scale-105"
                            title="Xóa ảnh khỏi danh sách"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* File Details Footer */}
                      <div className="p-2 text-[10px] text-slate-600 bg-white flex flex-col justify-between flex-1 border-t border-slate-100">
                        <span className="font-semibold text-slate-800 truncate" title={staged.fileName}>
                          {staged.fileName}
                        </span>
                        <div className="flex items-center justify-between text-[9px] text-slate-400 mt-0.5">
                          <span>{formatFileSize(staged.originalSize)}</span>
                          {staged.compressedSize && staged.compressedSize < staged.originalSize && (
                            <span className="text-emerald-600 font-medium">
                              (Nén: {formatFileSize(staged.compressedSize)})
                            </span>
                          )}
                        </div>
                        {staged.errorMessage && (
                          <span className="text-rose-600 text-[9px] font-semibold truncate mt-0.5">
                            {staged.errorMessage}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Add More Slot */}
                {stagedImages.length < 20 && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl border-2 border-dashed border-slate-300 hover:border-amber-500 flex flex-col items-center justify-center aspect-square text-slate-400 hover:text-slate-700 transition-colors bg-slate-50/50 cursor-pointer p-3 text-center"
                  >
                    <Upload className="w-5 h-5 mb-1 text-slate-500" />
                    <span className="text-[11px] font-bold text-slate-700">Thêm ảnh khác</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">Tối đa 20 ảnh</span>
                  </div>
                )}
              </div>

              {/* Summary note */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-1">
                <span>
                  💡 <strong>Mẹo:</strong> Rê chuột lên từng ảnh để chọn làm <em>Ảnh bìa</em> hoặc đổi thứ tự sắp xếp.
                </span>
                {pendingCount > 0 && (
                  <span className="text-amber-700 font-medium">
                    Có {pendingCount} ảnh mới sẽ được tải lên khi bạn bấm nút Lưu.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 7: Assignment & Sharing */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sparkles className="w-4 h-4 text-amber-600" />
            7. Phân công phụ trách & Ghi chú nội bộ
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Môi giới phụ trách *</label>
              <select
                value={formData.assignedAgentId}
                onChange={(e) => setFormData({ ...formData, assignedAgentId: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.employeeCode || u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Vị trí lưu chìa khóa</label>
              <input
                type="text"
                placeholder="VD: Gửi ban quản lý tòa nhà, gửi tại văn phòng..."
                value={formData.keysLocation}
                onChange={(e) => setFormData({ ...formData, keysLocation: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú mật cho đội ngũ nội bộ</label>
            <textarea
              rows={2}
              placeholder="VD: Chủ nhà cần tiền gấp, sẵn sàng bớt thêm 200tr cho khách thiện chí cọc trong tuần..."
              value={formData.internalNotes}
              onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Bottom Floating Action Bar */}
      <div className="sticky bottom-4 z-20 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-lg flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-900">
            {isEditMode ? `Đang sửa: ${formData.code || 'BĐS'}` : 'Nguồn hàng mới'}
          </span>
          <span>•</span>
          <span>{stagedImages.length} ảnh đã chọn</span>
          {failedCount > 0 && <span className="text-rose-600 font-bold">({failedCount} ảnh lỗi)</span>}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/properties')}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isUploading}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#001f3f] hover:bg-[#002e5c] text-white rounded-xl text-xs font-bold shadow-md shadow-slate-900/10 transition-all disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#D4AF37]" />
                <span>{uploadStatusText || 'Đang xử lý...'}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-[#D4AF37]" />
                <span>{isEditMode ? 'Lưu thay đổi' : 'Tạo mới nguồn hàng'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Duplicate Property Warning Modal */}
      {duplicateWarning.isOpen && (
        <DuplicateWarningModal
          isOpen={duplicateWarning.isOpen}
          reasons={duplicateWarning.reasons}
          matchedProperties={duplicateWarning.matchedProperties}
          onClose={() => setDuplicateWarning({ isOpen: false, reasons: [], matchedProperties: [] })}
          onProceed={() => {
            setDuplicateWarning({ isOpen: false, reasons: [], matchedProperties: [] });
            handleSave(true);
          }}
        />
      )}
    </div>
  );
};
