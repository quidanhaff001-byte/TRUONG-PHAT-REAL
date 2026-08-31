export type UserRole = 'ADMIN' | 'TEAM_LEADER' | 'AGENT';
export type UserStatus = 'ACTIVE' | 'LOCKED';

export interface User {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  role: UserRole;
  teamId?: string;
  teamName?: string;
  directManagerId?: string;
  directManagerName?: string;
  status: UserStatus;
  startDate?: string;
  notes?: string;
  createdAt: string;
  lastLoginAt?: string;
  propertiesCount?: number;
  customersCount?: number;
  dealsCount?: number;
}

export interface Team {
  id: string;
  name: string;
  code?: string;
  leaderId?: string;
  leaderName?: string;
  description?: string;
  memberIds?: string[];
  createdAt: string;
  updatedAt?: string;
}

export type TransactionType = 'SALE' | 'RENT' | 'TRANSFER' | 'SALE_AND_RENT';

export type PropertyCategory = 
  | 'Nhà phố'
  | 'Căn hộ / Chung cư'
  | 'Đất nền / Đất thổ cư'
  | 'Biệt thự / Villa'
  | 'Mặt bằng kinh doanh'
  | 'Tòa nhà văn phòng'
  | 'Kho xưởng / Đất công nghiệp'
  | 'Kho xưởng'
  | 'Khách sạn / Nhà nghỉ'
  | 'Cửa hàng / Kiot'
  | 'Đất nền'
  | 'Đất nông nghiệp'
  | 'Nhà riêng'
  | 'Biệt thự'
  | 'Căn hộ'
  | 'Phòng trọ'
  | 'Nhà nguyên căn'
  | 'Mặt bằng'
  | 'Cửa hàng'
  | 'Văn phòng'
  | 'Nhà xưởng'
  | 'Kho bãi'
  | 'Khách sạn'
  | 'Homestay'
  | 'Resort'
  | 'Dự án'
  | 'Loại khác';

export type PropertyType = PropertyCategory;

export type PropertyStatus = 
  | 'Mới tiếp nhận'
  | 'Chờ xác minh'
  | 'Đang bán'
  | 'Đang cho thuê'
  | 'Đang sang nhượng'
  | 'Có khách quan tâm'
  | 'Đang thương lượng'
  | 'Đã giữ chỗ'
  | 'Đã nhận cọc'
  | 'Đã đặt cọc'
  | 'Đã công chứng'
  | 'Đã cho thuê'
  | 'Đã bàn giao'
  | 'Đã hoàn tất'
  | 'Tạm ngưng'
  | 'Tạm ngưng giao dịch'
  | 'Hết hạn ký gửi'
  | 'Chủ ngưng bán'
  | 'Chủ ngưng cho thuê'
  | 'Chủ ngưng sang nhượng';

export type Direction = 'Đông' | 'Tây' | 'Nam' | 'Bắc' | 'Đông Nam' | 'Đông Bắc' | 'Tây Nam' | 'Tây Bắc' | 'Không xác định';

export type LegalType = 
  | 'Sổ hồng riêng'
  | 'Sổ đỏ chính chủ'
  | 'Hợp đồng mua bán (HĐMB)'
  | 'Đang chờ cấp sổ'
  | 'Sổ chung / Vi bằng'
  | 'Giấy tờ tay hợp lệ'
  | 'Sổ đỏ'
  | 'Hợp đồng mua bán'
  | 'Giấy tờ tay'
  | 'Đang chờ sổ'
  | 'Khác';

export interface PropertyImage {
  id: string;
  url: string;
  name?: string;
  size?: number;
  isCover?: boolean;
}

export interface Property {
  id: string;
  code: string;
  title: string;
  transactionType: TransactionType;
  propertyType: PropertyType;
  
  // Location
  city: string;
  district: string;
  ward?: string;
  street?: string;
  houseNumber?: string;
  address: string;
  mapsUrl?: string;
  googleMapsUrl?: string;
  latitude?: number;
  longitude?: number;
  
  // Specifications
  landArea: number; // m²
  usableArea?: number; // m²
  buildingArea?: number; // m²
  residentialArea?: number; // m² thổ cư
  width?: number; // m ngang
  length?: number; // m dài
  structure?: string;
  floors?: number;
  bedrooms?: number;
  bathrooms?: number;
  direction?: Direction | string;
  balconyDirection?: string;
  roadWidth?: number; // m
  distanceToMainRoad?: number; // m
  
  // Amenities & condition
  furnitureStatus?: string;
  furnitureList?: string;
  currentStatus?: string;
  description: string;
  highlights?: string;
  drawbacks?: string;
  amenities?: string[];
  
  // Media
  images?: string[] | PropertyImage[] | any[];
  coverImage?: string;
  videoUrl?: string;
  
  // Legal
  legalType?: LegalType | string;
  legalStatus?: string;
  cadastralLotNumber?: string; // Số thửa
  cadastralSheetNumber?: string; // Số tờ bản đồ
  hasConstructionPermit?: boolean;
  hasBuildingPermit?: boolean;
  planningStatus?: string;
  legalNotes?: string;
  legalDocuments?: string[];
  
  // Owner (Confidential)
  ownerName: string;
  ownerPhone: string;
  ownerPhoneAlt?: string;
  ownerSecondaryPhone?: string;
  ownerEmail?: string;
  ownerIdentityNumber?: string; // CMND/CCCD
  ownerRelationship?: string;
  ownerContactNote?: string;
  ownerContactNotes?: string;
  ownerBankInfo?: string;
  
  // Assignment & sharing
  assignedAgentId: string;
  assignedAgentName?: string;
  assignedAgentPhone?: string;
  teamId?: string;
  teamName?: string;
  receivedByAgentId?: string;
  receivedDate?: string;
  expiryDate?: string;
  shareStatus?: 'PUBLIC_INTERNAL' | 'TEAM_ONLY' | 'PRIVATE';
  internalNotes?: string;
  keysLocation?: string;
  
  // Commission General / Sale Specifics
  commissionRate?: number;
  salePrice?: number; // VNĐ
  saleMinPrice?: number;
  pricePerSqm?: number;
  commissionRateSale?: number;
  commissionSale?: string;
  isNegotiable?: boolean;
  isExclusiveSale?: boolean;
  exclusiveExpiryDate?: string;
  paymentTerms?: string;
  handoverStatus?: string;
  notaryEstimatedDate?: string;
  taxPayer?: string;
  negotiationNotes?: string;
  
  // Rental Specifics
  rentPriceMonthly?: number; // VNĐ/tháng
  rentPriceDaily?: number;
  rentDeposit?: number;
  depositMonths?: number;
  rentDepositMonths?: number;
  minLeaseTermMonths?: number;
  rentPaymentCycle?: string;
  commissionRateRentMonths?: number;
  rentMinDuration?: string;
  rentAvailableDate?: string;
  rentManagementFee?: number;
  electricityFee?: string;
  waterFee?: string;
  internetFee?: string;
  parkingFee?: string;
  allowPets?: boolean;
  allowBusinessRegistration?: boolean;
  maxTenants?: number;
  preferredTenants?: string;
  commissionRent?: string;
  
  // Transfer Specifics
  transferPrice?: number;
  transferIncludesInventory?: boolean;
  transferInventoryDetails?: string;
  monthlyRevenueEstimate?: number;
  monthlyProfitEstimate?: number;
  transferBusinessCategory?: string;
  transferBusinessName?: string;
  transferNegotiablePrice?: number;
  transferMonthlyRent?: number;
  transferRentDeposit?: number;
  transferLeaseRemainingMonths?: number;
  transferLandlordAgreed?: boolean;
  transferInventoryValue?: number;
  transferMonthlyRevenue?: number;
  transferMonthlyExpense?: number;
  transferEmployeeCount?: number;
  transferReason?: string;
  commissionTransfer?: string;
  transferHandoverDate?: string;
  transferConfidentialNotes?: string;
  
  // System tracking
  status: PropertyStatus;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deleteReason?: string;
  createdAt: string;
  createdBy: string;
  createdByName?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface CustomerInteraction {
  id: string;
  date: string;
  type: 'CALL' | 'MEETING' | 'ZALO' | 'VIEWING' | 'SEND_PROPERTY' | 'NOTE';
  title: string;
  content: string;
  agentId: string;
  agentName: string;
  nextActionDate?: string;
  nextActionNote?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  secondaryPhone?: string;
  email?: string;
  zalo?: string;
  address?: string;
  source: string;
  demandType: 'MUA' | 'THUE' | 'SANG_NHUONG';
  propertyTypes: PropertyCategory[];
  areas: string[];
  minPrice: number;
  maxPrice: number;
  minArea?: number;
  maxArea?: number;
  potentialLevel: 'Nóng' | 'Tiềm năng' | 'Tham khảo' | 'Chưa phù hợp' | 'Ngưng chăm sóc';
  status: 'Mới tiếp nhận' | 'Đang tư vấn' | 'Đã gửi sản phẩm' | 'Đã hẹn xem' | 'Đang thương lượng' | 'Đã giao dịch' | 'Tạm dừng' | 'Không có nhu cầu';
  assignedAgentId: string;
  assignedAgentName?: string;
  assignedAgentPhone?: string;
  teamId?: string;
  teamName?: string;
  notes?: string;
  interactionLogs?: CustomerInteraction[];
  nextAppointmentDate?: string;
  nextAppointmentNote?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deleteReason?: string;
  createdAt: string;
  createdBy?: string;
  createdByName?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface CustomerFilterState {
  searchQuery: string;
  demandType: string;
  propertyType: string;
  area: string;
  status: string;
  potentialLevel: string;
  assignedAgentId: string;
  teamId: string;
  minPrice?: number;
  maxPrice?: number;
  hasAppointmentOnly?: boolean;
  isDeleted?: boolean;
}

export interface Appointment {
  id: string;
  title: string;
  type: 'Dẫn khách xem' | 'Gặp chủ nhà' | 'Khảo sát sản phẩm' | 'Đặt cọc' | 'Ký hợp đồng' | 'Công chứng' | 'Gọi lại' | 'Khác';
  customerId?: string;
  customerName?: string;
  propertyId?: string;
  propertyCode?: string;
  propertyTitle?: string;
  assignedAgentId: string;
  agentName?: string;
  startDateTime: string;
  endDateTime: string;
  location?: string;
  content: string;
  status: 'Chờ diễn ra' | 'Đã hoàn thành' | 'Đã hủy' | 'Dời lịch';
  resultNotes?: string;
  createdAt: string;
}

export interface PropertyFilterState {
  searchQuery: string;
  transactionType: string;
  propertyType: string;
  city: string;
  district: string;
  status: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  bedrooms?: number;
  direction?: string;
  assignedAgentId?: string;
  teamId?: string;
  legalStatus?: string;
  hasImagesOnly?: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'LOGIN' | 'ASSIGN' | 'VIEW_SENSITIVE' | 'LOCK_USER';
  module: 'PROPERTIES' | 'CUSTOMERS' | 'USERS' | 'TEAMS' | 'TRANSACTIONS';
  targetId: string;
  targetCode?: string;
  description: string;
  oldData?: any;
  newData?: any;
}

export interface SystemSettings {
  id: string;
  companyName: string;
  companySlogan: string;
  logoUrl?: string;
  hotline: string;
  address: string;
  website?: string;
  email?: string;
  updatedAt?: string;
  updatedBy?: string;
}

