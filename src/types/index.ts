export type UserRole = 'ADMIN' | 'TEAM_LEADER' | 'AGENT';
export type UserStatus = 'ACTIVE' | 'LOCKED' | 'PENDING';

export interface User {
  id: string;
  uid?: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  role: UserRole;
  teamId?: string | null;
  teamName?: string;
  directManagerId?: string;
  directManagerName?: string;
  status: UserStatus;
  mustChangePassword?: boolean;
  startDate?: string;
  notes?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  lastLoginAt?: string | null;
  lastPasswordChangeAt?: string | null;
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
  | 'Đã bán'
  | 'Đã cho thuê'
  | 'Đã sang nhượng'
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

export interface PropertyImageItem {
  id: string;
  propertyId: string;
  fileName: string;
  storagePath: string;
  downloadURL: string;
  contentType: string;
  size: number;
  width?: number;
  height?: number;
  isCover: boolean;
  sortOrder: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface LocationItem {
  id: string;
  provinceCode: 'AN_GIANG_NEW';
  provinceName: 'An Giang';
  formerProvince: 'AN_GIANG_OLD' | 'KIEN_GIANG_OLD';
  administrativeType: 'WARD' | 'COMMUNE' | 'SPECIAL_ZONE' | 'CITY' | 'DISTRICT';
  currentName: string;
  formerDistrictName: string;
  aliases: string[];
  active: boolean;
  displayOrder: number;
}

export interface Property {
  id: string;
  code: string;
  title: string;
  transactionType: TransactionType;
  propertyType: PropertyType;
  
  // Location Standard (New An Giang Province)
  city: string;
  district: string;
  ward?: string;
  street?: string;
  houseNumber?: string;
  address: string;
  currentProvince?: string;
  currentWardCommune?: string;
  formerProvince?: 'Kiên Giang' | 'An Giang';
  formerDistrictCity?: string;
  addressText?: string;
  locationId?: string;
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
  images?: string[] | any[];
  coverImage?: string;
  imageDetails?: PropertyImageItem[];
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
  
  // System tracking & Migration
  migrationStatus?: 'COMPLETED' | 'NEEDS_REVIEW' | 'PENDING';
  migrationNote?: string;
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
  preferredDistricts?: string[];
  minPrice: number;
  maxPrice: number;
  budgetMin?: number;
  budgetMax?: number;
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

export type AppointmentType =
  | 'Gọi lại cho khách'
  | 'Gửi sản phẩm'
  | 'Gặp khách'
  | 'Gặp chủ bất động sản'
  | 'Khảo sát nguồn hàng'
  | 'Chụp hình'
  | 'Dẫn khách xem'
  | 'Thương lượng'
  | 'Đặt cọc'
  | 'Ký hợp đồng'
  | 'Công chứng'
  | 'Bàn giao'
  | 'Thu tiền thuê'
  | 'Gia hạn hợp đồng'
  | 'Thanh lý hợp đồng'
  | 'Công việc khác';

export type AppointmentStatus =
  | 'Sắp tới'
  | 'Đang thực hiện'
  | 'Đã hoàn thành'
  | 'Khách hủy'
  | 'Môi giới hủy'
  | 'Dời lịch'
  | 'Quá hạn';

export interface Appointment {
  id: string;
  code?: string;
  title: string;
  type: AppointmentType | string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  propertyId?: string;
  propertyCode?: string;
  propertyTitle?: string;
  propertyAddress?: string;
  transactionId?: string;
  contractId?: string;
  assignedAgentId: string;
  agentName?: string;
  participantIds?: string[];
  participantNames?: string[];
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  startDateTime: string;
  endDateTime: string;
  location?: string;
  googleMapsUrl?: string;
  content: string;
  reminderMinutes?: number;
  status: AppointmentStatus;
  resultNotes?: string;
  customerFeedback?: string;
  nextAction?: string;
  notes?: string;
  teamId?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface PropertyMatch {
  id: string;
  customerId: string;
  customerName?: string;
  propertyId: string;
  propertyCode?: string;
  propertyTitle?: string;
  matchScore: number;
  matchedCriteria: string[];
  unmatchedCriteria: string[];
  sentAt?: string;
  sentBy?: string;
  sentByName?: string;
  response?: string;
  responseStatus?: 'CHUA_PHAN_HOI' | 'THICH' | 'KHONG_PHU_HOP' | 'HEN_XEM' | 'DA_CHOT';
  favorite?: boolean;
  note?: string;
  assignedAgentId?: string;
  teamId?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  deletedAt?: string;
  deletedBy?: string;
}

export type TransactionSaleStatus =
  | 'Đang tư vấn'
  | 'Đang xem sản phẩm'
  | 'Đang thương lượng'
  | 'Đã giữ chỗ'
  | 'Đã đặt cọc'
  | 'Đang làm thủ tục'
  | 'Đã công chứng'
  | 'Chờ bàn giao'
  | 'Hoàn tất'
  | 'Hủy giữ chỗ'
  | 'Hủy cọc'
  | 'Giao dịch thất bại';

export interface Transaction {
  id: string;
  code: string;
  type: 'SALE' | 'TRANSFER';
  propertyId: string;
  propertyCode: string;
  propertyTitle: string;
  propertyAddress?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  ownerId?: string;
  ownerName: string;
  ownerPhone: string;
  responsibleAgentId: string;
  responsibleAgentName: string;
  cooperatingAgentIds?: string[];
  cooperatingAgentNames?: string[];
  teamId?: string;
  teamName?: string;
  
  // Financials
  ownerListingPrice: number;
  listedPrice: number;
  finalPrice: number;
  holdingDeposit?: number;
  depositAmount: number;
  
  // Timeline
  holdingDate?: string;
  depositDate: string;
  estimatedNotaryDate?: string;
  actualNotaryDate?: string;
  notarizationDate?: string;
  handoverDate?: string;
  
  // Deals & Financials
  dealPrice?: number;
  expectedCommission?: number;
  commissionRate?: number;
  sellerName?: string;
  sellerPhone?: string;
  buyerId?: string;
  buyerName?: string;
  buyerPhone?: string;
  listingAgentId?: string;
  listingAgentName?: string;
  sellingAgentId?: string;
  sellingAgentName?: string;
  
  // Details
  taxPayer: 'BEN_BAN' | 'BEN_MUA' | 'HAI_BEN_THOA_THUAN';
  estimatedExpenses?: number;
  actualExpenses?: number;
  estimatedCommission: number;
  actualCommission: number;
  paymentTerms?: string;
  notes?: string;
  documents?: string[];
  status: TransactionSaleStatus;
  step?: number;
  
  // System tracking
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deleteReason?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
}

export type RentalDealStatus =
  | 'Mới tiếp nhận'
  | 'Đã gửi sản phẩm'
  | 'Đã xem nhà'
  | 'Đang thương lượng'
  | 'Đã giữ chỗ'
  | 'Đã đặt cọc'
  | 'Chuẩn bị hợp đồng'
  | 'Đã ký'
  | 'Đã bàn giao'
  | 'Hoàn tất'
  | 'Hủy';

export interface RentalDeal {
  id: string;
  code: string;
  propertyId: string;
  propertyCode: string;
  propertyTitle: string;
  propertyAddress?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  ownerId?: string;
  ownerName: string;
  ownerPhone: string;
  responsibleAgentId: string;
  responsibleAgentName: string;
  teamId?: string;
  teamName?: string;
  
  // Rent Specs
  monthlyRent: number;
  holdingDeposit?: number;
  depositAmount: number;
  depositMonths: number;
  paymentCycle: '1_THANG' | '3_THANG' | '6_THANG' | '12_THANG' | string;
  paymentCycleMonths?: number;
  tenantId?: string;
  tenantName?: string;
  tenantPhone?: string;
  sellingAgentId?: string;
  sellingAgentName?: string;
  handoverDate?: string;
  leaseStartDate?: string;
  leaseTermMonths: number;
  leaseEndDate?: string;
  
  // Fees & Utilities
  managementFee?: number;
  electricityPrice?: string;
  waterPrice?: string;
  internetPrice?: string;
  parkingFee?: string;
  otherFees?: string;
  furnitureHandover?: string;
  leaseConditions?: string;
  
  estimatedCommission: number;
  actualCommission: number;
  status: RentalDealStatus;
  step?: number;
  notes?: string;
  documents?: string[];
  rentalContractId?: string;
  
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deleteReason?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
}

export type RentalContractStatus =
  | 'Bản nháp'
  | 'Chờ ký'
  | 'Chờ nhận nhà'
  | 'Đang hiệu lực'
  | 'Sắp hết hạn'
  | 'Chờ gia hạn'
  | 'Đã gia hạn'
  | 'Chờ thanh lý'
  | 'Đã thanh lý'
  | 'Đã hủy';

export interface RentalContract {
  id: string;
  code: string;
  propertyId: string;
  propertyCode: string;
  propertyTitle: string;
  propertyAddress: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerIdentityNumber?: string;
  ownerId?: string;
  ownerName: string;
  ownerPhone: string;
  ownerIdentityNumber?: string;
  rentalDealId?: string;
  assignedAgentId: string;
  assignedAgentName: string;
  teamId?: string;
  teamName?: string;
  
  signingDate: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  depositAmount: number;
  depositMonths: number;
  paymentCycle: string;
  firstPaymentDate: string;
  nextPaymentDate: string;
  allowedLateDays: number;
  priceEscalationPolicy?: string;
  noticePeriodDays: number;
  
  furnitureList?: string;
  electricMeterStart?: string;
  waterMeterStart?: string;
  handoverCondition?: string;
  commissionAmount: number;
  contractFileUrl?: string;
  handoverRecordUrl?: string;
  conditionImages?: string[];
  notes?: string;
  status: RentalContractStatus;
  
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deleteReason?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
}

export type RentalPaymentStatus =
  | 'Chưa đến hạn'
  | 'Sắp đến hạn'
  | 'Đến hạn'
  | 'Đã thanh toán'
  | 'Thanh toán một phần'
  | 'Quá hạn'
  | 'Được miễn'
  | 'Đã hủy';

export interface RentalPayment {
  id: string;
  contractId: string;
  contractCode: string;
  cycleNumber: number;
  periodName: string;
  fromDate: string;
  toDate: string;
  dueDate: string;
  rentAmount: number;
  surcharges?: number;
  deductions?: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paidDate?: string;
  paymentMethod?: 'TIEN_MAT' | 'CHUYEN_KHOAN' | 'KHAC';
  receiptUrl?: string;
  status: RentalPaymentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CommissionDealType = 'SALE' | 'TRANSFER' | 'RENT';

export type CommissionStatus =
  | 'Dự kiến'
  | 'Chờ thu'
  | 'Đã thu một phần'
  | 'Đã thu đủ'
  | 'Chờ chia'
  | 'Đã chia một phần'
  | 'Đã chia đủ'
  | 'Bị hủy';

export type CommissionSplitRole =
  | 'CONG_TY'
  | 'NGUOI_LAY_NGUON'
  | 'NGUOI_BAN_HANG'
  | 'NGUOI_PHOI_HOP'
  | 'TRUONG_NHOM'
  | 'KHAC';

export interface CommissionSplit {
  id: string;
  commissionId: string;
  userId: string;
  userName: string;
  userRole: string;
  roleInDeal: CommissionSplitRole;
  percentage: number;
  amount: number;
  isPaid: boolean;
  paidDate?: string;
  receiptUrl?: string;
  notes?: string;
}

export interface Commission {
  id: string;
  code: string;
  dealType: CommissionDealType;
  dealId: string;
  dealCode: string;
  dealTitle: string;
  propertyId: string;
  propertyCode: string;
  customerId?: string;
  customerName?: string;
  
  totalExpectedCommission: number;
  totalActualCommission: number;
  expectedDate?: string;
  actualReceivedDate?: string;
  payerName: string;
  status: CommissionStatus;
  expensesDeducted: number;
  netCommission: number;
  notes?: string;
  receiptUrls?: string[];
  splits: CommissionSplit[];
  
  assignedAgentId?: string;
  teamId?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
}

export type CommissionRecord = Commission;

export type AuditLogLevel = 'INFO' | 'WARNING' | 'CRITICAL';

export interface AuditLog {
  id: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  teamId?: string;
  action:
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'RESTORE'
    | 'LOGIN'
    | 'LOGOUT'
    | 'ASSIGN'
    | 'VIEW_SENSITIVE'
    | 'LOCK_USER'
    | 'UNLOCK_USER'
    | 'CHANGE_ROLE'
    | 'PASSWORD_RESET'
    | 'TEMP_PASSWORD'
    | 'REVOKE_SESSIONS'
    | 'SETTINGS_CHANGE'
    | 'SPLIT_COMMISSION'
    | 'STATUS_CHANGE';
  module:
    | 'PROPERTIES'
    | 'CUSTOMERS'
    | 'USERS'
    | 'TEAMS'
    | 'TRANSACTIONS'
    | 'RENTALS'
    | 'CONTRACTS'
    | 'COMMISSIONS'
    | 'APPOINTMENTS'
    | 'MATCHES'
    | 'SETTINGS'
    | 'AUTH'
    | 'SYSTEM';
  recordId?: string;
  recordCode?: string;
  recordName?: string;
  targetId?: string;
  targetCode?: string;
  targetUserId?: string;
  targetUserName?: string;
  description?: string;
  details?: string;
  oldData?: any;
  newData?: any;
  beforeData?: any;
  afterData?: any;
  level?: AuditLogLevel;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  status?: 'SUCCESS' | 'FAILURE';
  errorMessage?: string;
}

export interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'APPOINTMENT' | 'PROPERTY' | 'CUSTOMER' | 'DEAL' | 'CONTRACT' | 'PAYMENT' | 'COMMISSION' | 'SYSTEM';
  link: string;
  recipientId: string; // 'all' or userId
  isRead: boolean;
  createdAt: string;
}

export interface SystemSettings {
  id: string;
  parentCompanyLegalName: string; // CÔNG TY TNHH TRƯỜNG PHÁT
  parentCompanyInternationalName: string; // TRUONGPHAT COMPANY LIMITED
  parentCompanyAbbreviation: string; // TRUPHACO
  taxId: string; // 1700442767
  legalRepresentative: string; // Vương Đức Trường
  brandName: string; // TRƯỜNG PHÁT REAL
  companyName: string; // TRƯỜNG PHÁT REAL
  companySlogan: string;
  logoUrl?: string;
  phone: string; // 0297 381 0942
  hotline: string; // 0888 29 28 29
  address: string; // Số 434A Nguyễn Trung Trực, phường Rạch Giá, tỉnh An Giang
  website: string; // https://truongphatreal.vn/
  email: string; // info.truongphatcompany@gmail.com
  defaultProvince: string; // An Giang
  operatingScope: string; // Toàn tỉnh An Giang mới (bao gồm Kiên Giang cũ)
  legalFooterText: string; // “TRƯỜNG PHÁT REAL – Hệ thống quản lý bất động sản thuộc Công ty TNHH Trường Phát”
  updatedAt?: string;
  updatedBy?: string;
}

