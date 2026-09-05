import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Property,
  User,
  Team,
  PropertyFilterState,
  PropertyStatus,
  Customer,
  CustomerInteraction,
  Appointment,
  PropertyMatch,
  Transaction,
  RentalDeal,
  RentalContract,
  RentalPayment,
  Commission,
  CommissionSplit,
  AuditLog,
  Notification,
  SystemSettings,
  LocationItem,
} from '../types';
import {
  SAMPLE_PROPERTIES,
  SAMPLE_USERS,
  SAMPLE_TEAMS,
  SAMPLE_CUSTOMERS,
  SAMPLE_APPOINTMENTS,
  SAMPLE_MATCHES,
  SAMPLE_TRANSACTIONS,
  SAMPLE_RENTAL_DEALS,
  SAMPLE_RENTAL_CONTRACTS,
  SAMPLE_RENTAL_PAYMENTS,
  SAMPLE_COMMISSIONS,
  SAMPLE_AUDIT_LOGS,
  SAMPLE_NOTIFICATIONS,
  DEFAULT_SYSTEM_SETTINGS,
} from '../data/sampleData';
import { MASTER_LOCATIONS } from '../data/locationsData';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { generatePropertyCode } from '../utils/formatters';
import { isFirebaseConfigured, db } from '../config/firebase';
import { cleanUndefined } from '../utils/firestoreSanitizer';
import { sendAuditLogToBackend } from '../services/auditLogService';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  writeBatch,
} from 'firebase/firestore';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  reasons: string[];
  matchedProperties: Property[];
}

export interface DuplicateCustomerCheckResult {
  isDuplicate: boolean;
  matchedCustomer?: Customer;
  message?: string;
}

interface DataContextType {
  properties: Property[];
  users: User[];
  teams: Team[];
  customers: Customer[];
  appointments: Appointment[];
  matches: PropertyMatch[];
  transactions: Transaction[];
  rentalDeals: RentalDeal[];
  rentalContracts: RentalContract[];
  rentalPayments: RentalPayment[];
  commissions: Commission[];
  auditLogs: AuditLog[];
  notifications: Notification[];
  systemSettings: SystemSettings;
  isLoading: boolean;
  filterState: PropertyFilterState;
  setFilterState: React.Dispatch<React.SetStateAction<PropertyFilterState>>;
  resetFilters: () => void;
  filteredProperties: Property[];

  // Property Actions
  addProperty: (data: Omit<Property, 'id' | 'code' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<Property>;
  updateProperty: (id: string, data: Partial<Property>) => Promise<void>;
  deleteProperty: (id: string, reason?: string) => Promise<void>;
  restoreProperty: (id: string) => Promise<void>;
  permanentDeleteProperty: (id: string) => Promise<void>;
  updatePropertyStatus: (id: string, status: PropertyStatus) => Promise<void>;
  assignPropertyAgent: (id: string, agentId: string) => Promise<void>;
  bulkUpdateStatus: (ids: string[], status: PropertyStatus) => Promise<void>;
  bulkAssignAgent: (ids: string[], agentId: string) => Promise<void>;
  bulkDeleteProperties: (ids: string[], reason?: string) => Promise<void>;
  checkDuplicateProperty: (data: Partial<Property>, excludeId?: string) => DuplicateCheckResult;

  // User Actions
  addUser: (userData: Omit<User, 'id' | 'createdAt'>) => Promise<User>;
  updateUser: (id: string, userData: Partial<User>) => Promise<void>;
  updateUserAvatar: (userId: string, avatarUrl: string | null) => Promise<void>;
  toggleUserStatus: (id: string) => Promise<void>;

  // Team Actions
  addTeam: (teamData: Omit<Team, 'id' | 'createdAt' | 'memberIds'>) => Promise<Team>;
  updateTeam: (id: string, teamData: Partial<Team>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;

  // Customer Actions
  addCustomer: (customerData: Omit<Customer, 'id' | 'code' | 'createdAt' | 'updatedAt'>) => Promise<Customer>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string, reason?: string) => Promise<void>;
  restoreCustomer: (id: string) => Promise<void>;
  permanentDeleteCustomer: (id: string) => Promise<void>;
  addCustomerInteraction: (customerId: string, interaction: Omit<CustomerInteraction, 'id' | 'createdAt'>) => Promise<void>;
  assignCustomerAgent: (customerId: string, agentId: string, transferNote?: string) => Promise<void>;
  bulkAssignCustomerAgent: (customerIds: string[], agentId: string) => Promise<void>;
  bulkUpdateCustomerStatus: (customerIds: string[], status: Customer['status']) => Promise<void>;
  bulkDeleteCustomers: (customerIds: string[], reason?: string) => Promise<void>;
  checkDuplicateCustomerPhone: (phone: string, excludeId?: string) => DuplicateCustomerCheckResult;

  // Match Actions
  addMatch: (matchData: Omit<PropertyMatch, 'id' | 'createdAt'>) => Promise<PropertyMatch>;
  updateMatch: (id: string, data: Partial<PropertyMatch>) => Promise<void>;
  deleteMatch: (id: string) => Promise<void>;
  markMatchSent: (id: string, method?: string) => Promise<void>;

  // Appointment Actions
  addAppointment: (appointmentData: Omit<Appointment, 'id' | 'createdAt'>) => Promise<Appointment>;
  updateAppointment: (id: string, data: Partial<Appointment>) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  rescheduleAppointment: (id: string, newStartDate: string, newStartTime: string, reason?: string) => Promise<void>;
  completeAppointment: (id: string, resultNotes: string, customerFeedback?: string, nextAction?: string) => Promise<void>;

  // Transaction Actions (Bán & Sang nhượng)
  addTransaction: (
    transData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>,
    commissionDraft?: Omit<Commission, 'id' | 'dealId' | 'dealCode' | 'createdAt' | 'updatedAt'>
  ) => Promise<{ transaction: Transaction; commission?: Commission }>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  updateTransactionStatus: (id: string, status: Transaction['status'], step?: number) => Promise<void>;
  deleteTransaction: (id: string, reason?: string) => Promise<void>;

  // Rental Deal Actions (Cho thuê)
  addRentalDeal: (dealData: Omit<RentalDeal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<RentalDeal>;
  updateRentalDeal: (id: string, data: Partial<RentalDeal>) => Promise<void>;
  updateRentalDealStatus: (id: string, status: RentalDeal['status'], step?: number) => Promise<void>;
  deleteRentalDeal: (id: string, reason?: string) => Promise<void>;

  // Rental Contract Actions (Hợp đồng thuê)
  addRentalContract: (contractData: Omit<RentalContract, 'id' | 'createdAt' | 'updatedAt'>) => Promise<RentalContract>;
  updateRentalContract: (id: string, data: Partial<RentalContract>) => Promise<void>;
  renewRentalContract: (id: string, newEndDate: string, newRentAmount?: number, notes?: string) => Promise<void>;
  terminateRentalContract: (id: string, terminationDate: string, reason?: string) => Promise<void>;
  deleteRentalContract: (id: string, reason?: string) => Promise<void>;

  // Rental Payment Actions
  addRentalPayment: (paymentData: Omit<RentalPayment, 'id' | 'createdAt' | 'updatedAt'>) => Promise<RentalPayment>;
  updateRentalPayment: (id: string, data: Partial<RentalPayment>) => Promise<void>;
  markPaymentPaid: (id: string, paidAmount: number, paymentMethod: 'TIEN_MAT' | 'CHUYEN_KHOAN' | 'KHAC', receiptUrl?: string) => Promise<void>;

  // Commission Actions
  addCommission: (commData: Omit<Commission, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Commission>;
  updateCommission: (id: string, data: Partial<Commission>) => Promise<void>;
  updateCommissionSplits: (id: string, splits: CommissionSplit[], netCommission: number) => Promise<void>;
  markCommissionSplitPaid: (commissionId: string, splitId: string, receiptUrl?: string) => Promise<void>;
  deleteCommission: (id: string, reason?: string) => Promise<void>;

  // Audit Logs & Notifications
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => Promise<void>;
  addNotification: (notif: Omit<Notification, 'id' | 'createdAt'>) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;

  // Settings Actions
  updateSystemSettings: (data: Partial<SystemSettings>) => Promise<void>;
  restoreDefaultLogo: () => Promise<void>;

  // Locations (Địa bàn hoạt động)
  locations: LocationItem[];
  addLocation: (locationData: Omit<LocationItem, 'id'>) => Promise<LocationItem>;
  updateLocation: (id: string, data: Partial<LocationItem>) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;

  // Reset / Seed
  seedInitialDataToFirestore: (forceClean?: boolean) => Promise<void>;
  resetDemoData: () => void;
}

const defaultFilterState: PropertyFilterState = {
  searchQuery: '',
  transactionType: 'ALL',
  propertyType: 'ALL',
  city: 'ALL',
  district: 'ALL',
  status: 'ALL',
  minPrice: undefined,
  maxPrice: undefined,
  minArea: undefined,
  maxArea: undefined,
  bedrooms: undefined,
  direction: 'ALL',
  assignedAgentId: 'ALL',
  teamId: 'ALL',
  legalStatus: 'ALL',
  hasImagesOnly: false,
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { success, error, info } = useToast();

  // Real Firestore operational data - Default to empty state (Requirement 10, 11, 12)
  const [properties, setProperties] = useState<Property[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [matches, setMatches] = useState<PropertyMatch[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rentalDeals, setRentalDeals] = useState<RentalDeal[]>([]);
  const [rentalContracts, setRentalContracts] = useState<RentalContract[]>([]);
  const [rentalPayments, setRentalPayments] = useState<RentalPayment[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>(MASTER_LOCATIONS);

  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    try {
      const saved = localStorage.getItem('tp_system_settings');
      return saved ? { ...DEFAULT_SYSTEM_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SYSTEM_SETTINGS;
    } catch {
      return DEFAULT_SYSTEM_SETTINGS;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterState, setFilterState] = useState<PropertyFilterState>(defaultFilterState);

  // Helper to log user actions to Audit Logs (Delegated strictly to Backend Admin SDK)
  const addAuditLog = async (log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    const newId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newLog: AuditLog = cleanUndefined({
      ...log,
      id: newId,
      timestamp: new Date().toISOString(),
      userId: log.userId || currentUser?.id || 'system',
      userName: log.userName || currentUser?.fullName || 'Hệ thống',
      userEmail: log.userEmail || currentUser?.email || 'system@truongphatreal.vn',
      userRole: log.userRole || currentUser?.role || 'ADMIN',
      teamId: log.teamId || currentUser?.teamId || null,
    });

    // Update local state for immediate screen feedback
    setAuditLogs((prev) => [newLog, ...prev.slice(0, 499)]);

    // Write via Backend Admin SDK (Client write to auditLogs is forbidden by Firestore rules)
    try {
      await sendAuditLogToBackend({
        action: newLog.action,
        module: newLog.module,
        description: newLog.description,
        details: newLog.details,
        recordId: newLog.recordId,
        recordCode: newLog.recordCode,
        recordName: newLog.recordName,
        teamId: newLog.teamId || null,
        userId: newLog.userId,
        userName: newLog.userName,
        userEmail: newLog.userEmail,
        userRole: newLog.userRole,
        level: newLog.level,
      });
    } catch (err: any) {
      console.warn('[AuditLog Service] Backend recording notice:', err.message);
    }
  };

  // Helper to trigger notifications
  const addNotification = async (notif: Omit<Notification, 'id' | 'createdAt'>) => {
    const newId = `notif_${Date.now()}`;
    const newNotif: Notification = {
      ...notif,
      id: newId,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev]);
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'notifications', newId), newNotif);
      } catch (err) {
        console.warn('Notification write notice:', err);
      }
    }
  };

  const markNotificationAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'notifications', id), { isRead: true });
      } catch (err) {
        console.warn('Mark notif read notice:', err);
      }
    }
  };

  const markAllNotificationsAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    if (isFirebaseConfigured) {
      try {
        const snap = await getDocs(collection(db, 'notifications'));
        for (const d of snap.docs) {
          if (!d.data().isRead) {
            await updateDoc(doc(db, 'notifications', d.id), { isRead: true });
          }
        }
      } catch (err) {
        console.warn('Mark all notif read notice:', err);
      }
    }
  };

  // Helper to synchronize administrative locations and settings to Firestore (No sample mock data)
  const seedInitialDataToFirestore = async (forceCleanOld: boolean = false) => {
    if (!isFirebaseConfigured) return;
    try {
      await setDoc(doc(db, 'settings', 'general'), DEFAULT_SYSTEM_SETTINGS, { merge: true });
      for (const loc of MASTER_LOCATIONS) {
        await setDoc(doc(db, 'locations', loc.id), loc, { merge: true });
      }
    } catch (err) {
      console.warn('Sync locations notice:', err);
    }
  };

  // Firebase Realtime Snapshots
  // Requirement 7: Không khởi tạo Firestore listener trước khi Firebase xác nhận đăng nhập
  // Requirement 11: Không dùng fallback data khi Firestore trống hoặc bị từ chối quyền
  // Requirement 12: Khi Firestore trống, hiển thị số liệu bằng 0
  // Requirement 13: Không được bắt lỗi Firebase rồi âm thầm thay bằng mock data
  useEffect(() => {
    if (!currentUser || !isFirebaseConfigured) {
      setProperties([]);
      setUsers([]);
      setTeams([]);
      setCustomers([]);
      setAppointments([]);
      setMatches([]);
      setTransactions([]);
      setRentalDeals([]);
      setRentalContracts([]);
      setRentalPayments([]);
      setCommissions([]);
      setAuditLogs([]);
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'general'),
      (snapshot) => {
        if (snapshot.exists()) {
          const loaded = { ...DEFAULT_SYSTEM_SETTINGS, ...snapshot.data() } as SystemSettings;
          setSystemSettings(loaded);
          localStorage.setItem('tp_system_settings', JSON.stringify(loaded));
        }
      },
      (err) => console.warn('Snapshot listener notice on settings:', err?.message || err)
    );

    const unsubProps = onSnapshot(
      collection(db, 'properties'),
      (snapshot) => {
        const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Property));
        setProperties(loaded);
        setIsLoading(false);
      },
      (err) => {
        console.warn('Snapshot listener notice on properties:', err?.message || err);
        setProperties([]);
        setIsLoading(false);
      }
    );

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as User));
        setUsers(loaded);
      },
      (err) => {
        console.warn('Snapshot listener notice on users:', err?.message || err);
        setUsers([]);
      }
    );

    const unsubTeams = onSnapshot(
      collection(db, 'teams'),
      (snapshot) => {
        const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Team));
        setTeams(loaded);
      },
      (err) => {
        console.warn('Snapshot listener notice on teams:', err?.message || err);
        setTeams([]);
      }
    );

    const unsubCustomers = onSnapshot(
      collection(db, 'customers'),
      (snapshot) => {
        const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Customer));
        setCustomers(loaded);
      },
      (err) => {
        console.warn('Snapshot listener notice on customers:', err?.message || err);
        setCustomers([]);
      }
    );

    const unsubAppointments = onSnapshot(
      collection(db, 'appointments'),
      (snapshot) => {
        const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment));
        setAppointments(loaded);
      },
      (err) => {
        console.warn('Snapshot listener notice on appointments:', err?.message || err);
        setAppointments([]);
      }
    );

    const unsubMatches = onSnapshot(
      collection(db, 'propertyMatches'),
      (snapshot) => {
        const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PropertyMatch));
        setMatches(loaded);
      },
      (err) => {
        console.warn('Snapshot listener notice on propertyMatches:', err?.message || err);
        setMatches([]);
      }
    );

    const unsubTransactions = onSnapshot(
      collection(db, 'transactions'),
      (snapshot) => {
        const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
        setTransactions(loaded);
      },
      (err) => {
        console.warn('Snapshot listener notice on transactions:', err?.message || err);
        setTransactions([]);
      }
    );

    const unsubRentalDeals = onSnapshot(
      collection(db, 'rentalDeals'),
      (snapshot) => {
        const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as RentalDeal));
        setRentalDeals(loaded);
      },
      (err) => {
        console.warn('Snapshot listener notice on rentalDeals:', err?.message || err);
        setRentalDeals([]);
      }
    );

    const unsubContracts = onSnapshot(
      collection(db, 'rentalContracts'),
      (snapshot) => {
        const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as RentalContract));
        setRentalContracts(loaded);
      },
      (err) => {
        console.warn('Snapshot listener notice on rentalContracts:', err?.message || err);
        setRentalContracts([]);
      }
    );

    const unsubPayments = onSnapshot(
      collection(db, 'rentalPayments'),
      (snapshot) => {
        const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as RentalPayment));
        setRentalPayments(loaded);
      },
      (err) => {
        console.warn('Snapshot listener notice on rentalPayments:', err?.message || err);
        setRentalPayments([]);
      }
    );

    const unsubCommissions = onSnapshot(
      collection(db, 'commissions'),
      (snapshot) => {
        const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Commission));
        setCommissions(loaded);
      },
      (err) => {
        console.warn('Snapshot listener notice on commissions:', err?.message || err);
        setCommissions([]);
      }
    );

    const unsubAuditLogs = onSnapshot(
      collection(db, 'auditLogs'),
      (snapshot) => {
        const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog));
        loaded.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setAuditLogs(loaded);
      },
      (err) => {
        console.warn('Snapshot listener notice on auditLogs:', err?.message || err);
        setAuditLogs([]);
      }
    );

    const unsubNotifs = onSnapshot(
      collection(db, 'notifications'),
      (snapshot) => {
        const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
        loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(loaded);
      },
      (err) => {
        console.warn('Snapshot listener notice on notifications:', err?.message || err);
        setNotifications([]);
      }
    );

    const unsubLocations = onSnapshot(
      collection(db, 'locations'),
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as LocationItem));
          loaded.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
          setLocations(loaded);
        }
      },
      (err) => console.warn('Snapshot listener notice on locations:', err?.message || err)
    );

    return () => {
      unsubSettings();
      unsubProps();
      unsubUsers();
      unsubTeams();
      unsubCustomers();
      unsubAppointments();
      unsubMatches();
      unsubTransactions();
      unsubRentalDeals();
      unsubContracts();
      unsubPayments();
      unsubCommissions();
      unsubAuditLogs();
      unsubNotifs();
      unsubLocations();
    };
  }, [currentUser?.id, isFirebaseConfigured]);

  // Clean orphaned commissions automatically (commissions referencing non-existent dealId)
  useEffect(() => {
    if (!isFirebaseConfigured || commissions.length === 0) return;
    if (transactions.length === 0 && rentalDeals.length === 0) return;

    const validDealIds = new Set([
      ...transactions.map((t) => t.id),
      ...rentalDeals.map((r) => r.id),
    ]);

    const orphaned = commissions.filter((c) => !c.dealId || !validDealIds.has(c.dealId));
    if (orphaned.length > 0) {
      console.warn(`[Clean Orphan Commissions] Detected ${orphaned.length} orphaned commissions. Deleting from Firestore...`);
      for (const orphan of orphaned) {
        deleteDoc(doc(db, 'commissions', orphan.id)).catch((err) => {
          console.warn('Failed to delete orphaned commission:', orphan.id, err);
        });
        addAuditLog({
          action: 'DELETE_ORPHAN_COMMISSION',
          module: 'COMMISSIONS',
          recordId: orphan.id,
          recordCode: orphan.code,
          description: `Hệ thống tự động dọn dẹp hoa hồng mồ côi [${orphan.code || orphan.id}] (dealId: ${orphan.dealId || 'không xác định'} không còn tồn tại)`,
          oldData: orphan,
          level: 'WARNING',
        }).catch((err) => console.warn('Failed to log orphan commission deletion:', err));
      }
      setCommissions((prev) => prev.filter((c) => c.dealId && validDealIds.has(c.dealId)));
    }
  }, [commissions.length, transactions.length, rentalDeals.length, isFirebaseConfigured]);

  const resetFilters = () => {
    setFilterState(defaultFilterState);
  };

  const resetDemoData = async () => {
    if (!currentUser || currentUser.role !== 'ADMIN') {
      error('Từ chối quyền', 'Chỉ Quản trị viên mới có quyền thực hiện thao tác này.');
      return;
    }
    // Only synchronize master administrative locations - Zero sample data injection
    for (const loc of MASTER_LOCATIONS) {
      await setDoc(doc(db, 'locations', loc.id), loc, { merge: true });
    }
    success('Đã chuẩn hóa địa bàn', 'Danh mục địa bàn hành chính An Giang đã được đồng bộ.');
  };

  // Duplicate Check logic for Properties
  const checkDuplicateProperty = (data: Partial<Property>, excludeId?: string): DuplicateCheckResult => {
    const reasons: string[] = [];
    const matchedProps: Property[] = [];

    const activeList = properties.filter((p) => !p.isDeleted && p.id !== excludeId);

    for (const prop of activeList) {
      let isMatch = false;

      if (data.ownerPhone && prop.ownerPhone) {
        const p1 = data.ownerPhone.replace(/\D/g, '');
        const p2 = prop.ownerPhone.replace(/\D/g, '');
        if (p1 && p2 && p1 === p2) {
          reasons.push(`Trùng số điện thoại chủ nhà (${data.ownerPhone}) với mã ${prop.code}`);
          isMatch = true;
        }
      }

      if (
        data.cadastralLotNumber &&
        data.cadastralSheetNumber &&
        prop.cadastralLotNumber &&
        prop.cadastralSheetNumber &&
        data.cadastralLotNumber.trim() === prop.cadastralLotNumber.trim() &&
        data.cadastralSheetNumber.trim() === prop.cadastralSheetNumber.trim()
      ) {
        reasons.push(`Trùng số thửa (${data.cadastralLotNumber}) & số tờ (${data.cadastralSheetNumber}) với mã ${prop.code}`);
        isMatch = true;
      }

      if (data.address && prop.address) {
        const a1 = data.address.toLowerCase().trim();
        const a2 = prop.address.toLowerCase().trim();
        if (a1 === a2 || (a1.length > 10 && a2.includes(a1))) {
          reasons.push(`Địa chỉ tương đồng: "${prop.address}" (Mã: ${prop.code})`);
          isMatch = true;
        }
      }

      if (isMatch) {
        matchedProps.push(prop);
      }
    }

    return {
      isDuplicate: matchedProps.length > 0,
      reasons,
      matchedProperties: matchedProps,
    };
  };

  // Check duplicate customer phone
  const checkDuplicateCustomerPhone = (phone: string, excludeId?: string): DuplicateCustomerCheckResult => {
    if (!phone || phone.trim().length < 8) {
      return { isDuplicate: false };
    }

    const cleanInput = phone.replace(/\D/g, '');
    if (!cleanInput) return { isDuplicate: false };

    const activeCustomers = customers.filter((c) => !c.isDeleted && c.id !== excludeId);
    for (const cust of activeCustomers) {
      const p1 = cust.phone ? cust.phone.replace(/\D/g, '') : '';
      const p2 = cust.secondaryPhone ? cust.secondaryPhone.replace(/\D/g, '') : '';
      const pZalo = cust.zalo ? cust.zalo.replace(/\D/g, '') : '';

      if ((p1 && p1 === cleanInput) || (p2 && p2 === cleanInput) || (pZalo && pZalo === cleanInput)) {
        return {
          isDuplicate: true,
          matchedCustomer: cust,
          message: `Số điện thoại ${phone} đã tồn tại trên hệ thống thuộc về khách hàng "${cust.fullName}" (${cust.code}) do môi giới "${cust.assignedAgentName || 'Hệ thống'}" phụ trách.`,
        };
      }
    }

    return { isDuplicate: false };
  };

  // Property Actions
  const addProperty = async (data: Partial<Property> & Omit<Property, 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<Property> => {
    const sequence = properties.length + 1;
    const newCode = (data as any).code || generatePropertyCode(data.transactionType, sequence);
    const newId = (data as any).id || `prop_${Date.now()}`;
    const now = new Date().toISOString();

    const assignedAgent = users.find((u) => u.id === data.assignedAgentId);
    const team = teams.find((t) => t.id === (data.teamId || assignedAgent?.teamId));

    const newProp: Property = {
      ...data,
      id: newId,
      code: newCode,
      assignedAgentName: assignedAgent?.fullName || 'Chưa phân công',
      teamId: team?.id,
      teamName: team?.name,
      createdAt: now,
      createdBy: currentUser?.id || 'anonymous',
      createdByName: currentUser?.fullName || 'Người dùng',
      updatedAt: now,
      updatedBy: currentUser?.id,
      isDeleted: false,
    };

    const sanitizedProp = cleanUndefined(newProp);

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'properties', newId), sanitizedProp);
      } catch (err: any) {
        console.error('Save to Firestore error:', err);
        throw new Error(`Lỗi lưu bất động sản: ${err.message || 'Không xác định'}`);
      }
    }

    setProperties((prev) => [sanitizedProp, ...prev]);

    await addAuditLog({
      action: 'CREATE_PROPERTY',
      module: 'PROPERTIES',
      recordId: newId,
      recordCode: newCode,
      recordName: newProp.title,
      description: `Tạo nguồn hàng BĐS mới: [${newCode}] ${newProp.title}`,
      newData: newProp,
      level: 'INFO',
    });

    success('Thêm nguồn hàng thành công', `Đã lưu bất động sản mã ${newCode} lên hệ thống.`);
    return newProp;
  };

  const updateProperty = async (id: string, data: Partial<Property>): Promise<void> => {
    const now = new Date().toISOString();
    const oldProp = properties.find((p) => p.id === id);

    setProperties((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            ...data,
            updatedAt: now,
            updatedBy: currentUser?.id,
          };
        }
        return p;
      })
    );

    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'properties', id), {
          ...data,
          updatedAt: now,
          updatedBy: currentUser?.id,
        });
      } catch (err) {
        console.error('Update property error:', err);
      }
    }

    if (oldProp) {
      const isStatusChange = Boolean(data.status && data.status !== oldProp.status);
      await addAuditLog({
        action: isStatusChange ? 'STATUS_CHANGE' : 'UPDATE',
        module: 'PROPERTIES',
        recordId: id,
        recordCode: oldProp.code,
        recordName: oldProp.title,
        description: isStatusChange
          ? `Đổi trạng thái bất động sản ${oldProp.code} từ "${oldProp.status}" sang "${data.status}"`
          : `Cập nhật thông tin bất động sản ${oldProp.code}`,
        oldData: oldProp,
        newData: data,
        level: 'INFO',
      });
    }

    success('Cập nhật thành công', 'Thông tin bất động sản đã được lưu.');
  };

  const deleteProperty = async (id: string, reason?: string): Promise<void> => {
    const now = new Date().toISOString();
    const prop = properties.find((p) => p.id === id);
    const updateData = {
      isDeleted: true,
      deletedAt: now,
      deletedBy: currentUser?.id || 'anonymous',
      deleteReason: reason || 'Người dùng xóa vào thùng rác',
    };

    setProperties((prev) => prev.map((p) => (p.id === id ? { ...p, ...updateData } : p)));

    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'properties', id), updateData);
      } catch (err) {
        console.error(err);
      }
    }

    if (prop) {
      await addAuditLog({
        action: 'DELETE',
        module: 'PROPERTIES',
        recordId: id,
        recordCode: prop.code,
        recordName: prop.title,
        description: `Chuyển bất động sản ${prop.code} vào thùng rác (${reason || 'Không rõ lý do'})`,
        level: 'WARNING',
      });
    }

    info('Đã chuyển vào thùng rác', 'Bất động sản đã được đưa vào thùng rác.');
  };

  const restoreProperty = async (id: string): Promise<void> => {
    const prop = properties.find((p) => p.id === id);
    const updateData = {
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      deleteReason: null,
      updatedAt: new Date().toISOString(),
    };

    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'properties', id), cleanUndefined(updateData) as any);
      } catch (err: any) {
        console.error('[restoreProperty] Firestore update error:', err);
        throw new Error(`Lỗi khi khôi phục bất động sản: ${err.message || 'Lỗi kết nối'}`);
      }
    }

    setProperties((prev) => prev.map((p) => (p.id === id ? { ...p, ...updateData } : p)));

    if (prop) {
      await addAuditLog({
        action: 'RESTORE',
        module: 'PROPERTIES',
        recordId: id,
        recordCode: prop.code,
        recordName: prop.title,
        description: `Khôi phục bất động sản ${prop.code} (${prop.title}) từ thùng rác`,
        level: 'INFO',
      });
    }

    success('Khôi phục thành công', 'Bất động sản đã được đưa trở lại danh sách hoạt động.');
  };

  const permanentDeleteProperty = async (id: string): Promise<void> => {
    setProperties((prev) => prev.filter((p) => p.id !== id));
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'properties', id));
      } catch (err) {
        console.error(err);
      }
    }
    info('Đã xóa vĩnh viễn', 'Bất động sản đã được xóa hoàn toàn khỏi cơ sở dữ liệu.');
  };

  const updatePropertyStatus = async (id: string, status: PropertyStatus): Promise<void> => {
    await updateProperty(id, { status });
  };

  const bulkUpdateStatus = async (ids: string[], status: PropertyStatus): Promise<void> => {
    if (ids.length === 0) return;
    const now = new Date().toISOString();
    setProperties((prev) =>
      prev.map((p) => (ids.includes(p.id) ? { ...p, status, updatedAt: now } : p))
    );

    if (isFirebaseConfigured) {
      for (const id of ids) {
        try {
          await updateDoc(doc(db, 'properties', id), { status, updatedAt: now });
        } catch (err) {
          console.error(err);
        }
      }
    }

    await addAuditLog({
      action: 'STATUS_CHANGE',
      module: 'PROPERTIES',
      recordId: ids[0] || 'bulk',
      recordCode: `BULK_${ids.length}`,
      recordName: `${ids.length} Bất động sản`,
      description: `Đổi trạng thái hàng loạt cho ${ids.length} bất động sản sang "${status}"`,
      newData: { status, affectedIds: ids },
      level: 'INFO',
    });

    success(`Đã chuyển trạng thái ${ids.length} BĐS`, `Tất cả đã chuyển sang "${status}"`);
  };

  const assignPropertyAgent = async (id: string, agentId: string): Promise<void> => {
    const agent = users.find((u) => u.id === agentId);
    if (!agent) return;
    await updateProperty(id, {
      assignedAgentId: agent.id,
      assignedAgentName: agent.fullName,
      teamId: agent.teamId,
      teamName: agent.teamName,
    });
  };

  const bulkAssignAgent = async (ids: string[], agentId: string): Promise<void> => {
    const agent = users.find((u) => u.id === agentId);
    if (!agent || ids.length === 0) return;
    const now = new Date().toISOString();

    setProperties((prev) =>
      prev.map((p) =>
        ids.includes(p.id)
          ? {
              ...p,
              assignedAgentId: agent.id,
              assignedAgentName: agent.fullName,
              teamId: agent.teamId,
              teamName: agent.teamName,
              updatedAt: now,
            }
          : p
      )
    );

    if (isFirebaseConfigured) {
      for (const id of ids) {
        try {
          await updateDoc(doc(db, 'properties', id), {
            assignedAgentId: agent.id,
            assignedAgentName: agent.fullName,
            teamId: agent.teamId,
            teamName: agent.teamName,
            updatedAt: now,
          });
        } catch (err) {
          console.error(err);
        }
      }
    }

    success(`Đã chuyển giao ${ids.length} BĐS`, `Người phụ trách mới: ${agent.fullName}`);
  };

  const bulkDeleteProperties = async (ids: string[], reason?: string): Promise<void> => {
    if (ids.length === 0) return;
    const now = new Date().toISOString();
    const updateData = {
      isDeleted: true,
      deletedAt: now,
      deletedBy: currentUser?.id || 'anonymous',
      deleteReason: reason || 'Xóa hàng loạt vào thùng rác',
    };

    setProperties((prev) =>
      prev.map((p) => (ids.includes(p.id) ? { ...p, ...updateData } : p))
    );

    if (isFirebaseConfigured) {
      for (const id of ids) {
        try {
          await updateDoc(doc(db, 'properties', id), updateData);
        } catch (err) {
          console.error(err);
        }
      }
    }

    info(`Đã chuyển ${ids.length} BĐS vào thùng rác`);
  };

  // User Actions
  const addUser = async (userData: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
    const newId = `user_${Date.now()}`;
    const now = new Date().toISOString();
    const newUser: User = {
      ...userData,
      id: newId,
      createdAt: now,
      propertiesCount: 0,
      customersCount: 0,
      dealsCount: 0,
    };

    setUsers((prev) => [...prev, newUser]);
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'users', newId), newUser);
      } catch (err) {
        console.error(err);
      }
    }

    await addAuditLog({
      action: 'CREATE',
      module: 'USERS',
      recordId: newId,
      recordName: newUser.fullName,
      description: `Tạo tài khoản nhân sự mới: ${newUser.fullName} (${newUser.role})`,
      level: 'INFO',
    });

    success('Thêm nhân sự thành công', `Đã tạo hồ sơ cho ${newUser.fullName}`);
    return newUser;
  };

  const updateUser = async (id: string, userData: Partial<User>): Promise<void> => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...userData } : u)));
    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'users', id), userData);
      } catch (err) {
        console.error(err);
      }
    }
    success('Cập nhật nhân sự thành công');
  };

  const updateUserAvatar = async (userId: string, avatarUrl: string | null): Promise<void> => {
    await updateUser(userId, { avatarUrl: avatarUrl || undefined });
  };

  const toggleUserStatus = async (id: string): Promise<void> => {
    const user = users.find((u) => u.id === id);
    if (!user) return;
    const newStatus = user.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    await updateUser(id, { status: newStatus });
    await addAuditLog({
      action: 'LOCK_USER',
      module: 'USERS',
      recordId: id,
      recordName: user.fullName,
      description: `Đổi trạng thái tài khoản ${user.fullName} sang [${newStatus}]`,
      level: 'WARNING',
    });
    info('Đã đổi trạng thái tài khoản', `Tài khoản ${user.fullName} hiện ở trạng thái ${newStatus === 'ACTIVE' ? 'Hoạt động' : 'Tạm khóa'}`);
  };

  // Team Actions
  const addTeam = async (teamData: Omit<Team, 'id' | 'createdAt' | 'memberIds'>): Promise<Team> => {
    const newId = `team_${Date.now()}`;
    const newTeam: Team = {
      ...teamData,
      id: newId,
      memberIds: teamData.leaderId ? [teamData.leaderId] : [],
      createdAt: new Date().toISOString(),
    };

    setTeams((prev) => [...prev, newTeam]);
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'teams', newId), newTeam);
      } catch (err) {
        console.error(err);
      }
    }
    success('Tạo đội nhóm thành công', `Đã tạo nhóm ${newTeam.name}`);
    return newTeam;
  };

  const updateTeam = async (id: string, teamData: Partial<Team>): Promise<void> => {
    setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, ...teamData, updatedAt: new Date().toISOString() } : t)));
    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'teams', id), { ...teamData, updatedAt: new Date().toISOString() });
      } catch (err) {
        console.error(err);
      }
    }
    success('Cập nhật đội nhóm thành công');
  };

  const deleteTeam = async (id: string): Promise<void> => {
    setTeams((prev) => prev.filter((t) => t.id !== id));
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'teams', id));
      } catch (err) {
        console.error(err);
      }
    }
    info('Đã xóa đội nhóm');
  };

  // Customer Actions (Không optimistic UI, await xác nhận Firestore trước khi cập nhật state và thông báo)
  const addCustomer = async (customerData: Omit<Customer, 'id' | 'code' | 'createdAt' | 'updatedAt'>): Promise<Customer> => {
    const sequence = customers.length + 1;
    const newCode = `KH-AG${sequence.toString().padStart(4, '0')}`;
    const newId = `cust_${Date.now()}`;
    const now = new Date().toISOString();

    const assignedAgent = users.find((u) => u.id === customerData.assignedAgentId);
    const team = teams.find((t) => t.id === (customerData.teamId || assignedAgent?.teamId));

    const rawCustomer: Customer = {
      ...customerData,
      id: newId,
      code: newCode,
      assignedAgentName: assignedAgent?.fullName || 'Chưa phân công',
      teamId: team?.id || null,
      teamName: team?.name || null,
      createdAt: now,
      createdBy: currentUser?.id || 'anonymous',
      createdByName: currentUser?.fullName || 'Người dùng',
      updatedAt: now,
      updatedBy: currentUser?.id || null,
      isDeleted: false,
    };

    // Deep sanitize to prevent "Unsupported field value: undefined"
    const newCustomer = cleanUndefined(rawCustomer);

    // Ghi vào Firestore TRƯỚC TIÊN - nếu lỗi, ném ra để giao diện giữ form và báo lỗi tiếng Việt
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'customers', newId), newCustomer);
      } catch (err: any) {
        console.error('[Firestore addCustomer Error]', err);
        throw new Error(`Không thể lưu khách hàng vào cơ sở dữ liệu: ${err.message || 'Lỗi kết nối'}`);
      }
    }

    // Chỉ cập nhật state UI sau khi backend/Firestore đã xác nhận thành công
    setCustomers((prev) => [newCustomer, ...prev]);

    await addAuditLog({
      action: 'CREATE_CUSTOMER',
      module: 'CUSTOMERS',
      recordId: newId,
      recordCode: newCode,
      recordName: newCustomer.fullName,
      description: `Tiếp nhận khách hàng mới [${newCode}] ${newCustomer.fullName}`,
      teamId: newCustomer.teamId,
      level: 'INFO',
    });

    success('Thêm khách hàng thành công', `Đã lưu khách hàng mã ${newCode}`);
    return newCustomer;
  };

  const updateCustomer = async (id: string, data: Partial<Customer>): Promise<void> => {
    const now = new Date().toISOString();
    const cleanData = cleanUndefined({
      ...data,
      updatedAt: now,
      updatedBy: currentUser?.id || null,
    });

    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'customers', id), cleanData);
      } catch (err: any) {
        console.error('[Firestore updateCustomer Error]', err);
        throw new Error(`Không thể cập nhật khách hàng: ${err.message || 'Lỗi kết nối'}`);
      }
    }

    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...cleanData } : c)));

    const oldCust = customers.find((c) => c.id === id);
    const isStatusChange = Boolean(data.status && oldCust && data.status !== oldCust.status);

    await addAuditLog({
      action: isStatusChange ? 'STATUS_CHANGE' : 'UPDATE',
      module: 'CUSTOMERS',
      recordId: id,
      recordCode: oldCust?.code || id,
      recordName: oldCust?.fullName || 'Khách hàng',
      description: isStatusChange
        ? `Đổi trạng thái khách hàng ${oldCust?.code} (${oldCust?.fullName}) từ "${oldCust?.status}" sang "${data.status}"`
        : `Cập nhật thông tin khách hàng ${oldCust?.code} (${oldCust?.fullName})`,
      oldData: oldCust,
      newData: cleanData,
      level: 'INFO',
    });

    success('Cập nhật khách hàng thành công');
  };

  const deleteCustomer = async (id: string, reason?: string): Promise<void> => {
    const now = new Date().toISOString();
    const cust = customers.find((c) => c.id === id);
    const updateData = {
      isDeleted: true,
      deletedAt: now,
      deletedBy: currentUser?.id || 'anonymous',
      deleteReason: reason || 'Xóa vào thùng rác',
    };

    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updateData } : c)));
    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'customers', id), updateData);
      } catch (err) {
        console.error(err);
      }
    }

    if (cust) {
      await addAuditLog({
        action: 'DELETE',
        module: 'CUSTOMERS',
        recordId: id,
        recordCode: cust.code,
        recordName: cust.fullName,
        description: `Chuyển khách hàng ${cust.code} (${cust.fullName}) vào thùng rác`,
        level: 'WARNING',
      });
    }

    info('Đã chuyển khách hàng vào thùng rác');
  };

  const restoreCustomer = async (id: string): Promise<void> => {
    const cust = customers.find((c) => c.id === id);
    const updateData = {
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      deleteReason: null,
      updatedAt: new Date().toISOString(),
    };

    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'customers', id), cleanUndefined(updateData) as any);
      } catch (err: any) {
        console.error('[restoreCustomer] Firestore update error:', err);
        throw new Error(`Lỗi khi khôi phục khách hàng: ${err.message || 'Lỗi kết nối'}`);
      }
    }

    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updateData } : c)));

    if (cust) {
      await addAuditLog({
        action: 'RESTORE',
        module: 'CUSTOMERS',
        recordId: id,
        recordCode: cust.code,
        recordName: cust.fullName,
        description: `Khôi phục khách hàng ${cust.code} (${cust.fullName}) từ thùng rác`,
        level: 'INFO',
      });
    }

    success('Khôi phục khách hàng thành công');
  };

  const permanentDeleteCustomer = async (id: string): Promise<void> => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'customers', id));
      } catch (err) {
        console.error(err);
      }
    }
    info('Đã xóa vĩnh viễn khách hàng');
  };

  const addCustomerInteraction = async (customerId: string, interaction: Omit<CustomerInteraction, 'id' | 'createdAt'>): Promise<void> => {
    const newId = `inter_${Date.now()}`;
    const now = new Date().toISOString();
    const newInteraction: CustomerInteraction = {
      ...interaction,
      id: newId,
      createdAt: now,
    };

    const targetCustomer = customers.find((c) => c.id === customerId);
    if (!targetCustomer) return;

    const updatedLogs = [newInteraction, ...(targetCustomer.interactionLogs || [])];
    await updateCustomer(customerId, { interactionLogs: updatedLogs });
    success('Đã lưu nhật ký chăm sóc khách');
  };

  const assignCustomerAgent = async (customerId: string, agentId: string, transferNote?: string): Promise<void> => {
    const agent = users.find((u) => u.id === agentId);
    if (!agent) return;
    await updateCustomer(customerId, {
      assignedAgentId: agent.id,
      assignedAgentName: agent.fullName,
      teamId: agent.teamId,
      teamName: agent.teamName,
      notes: transferNote ? `${transferNote}\n---\n${customers.find((c) => c.id === customerId)?.notes || ''}` : undefined,
    });
  };

  const bulkAssignCustomerAgent = async (customerIds: string[], agentId: string): Promise<void> => {
    const agent = users.find((u) => u.id === agentId);
    if (!agent || customerIds.length === 0) return;
    const now = new Date().toISOString();

    setCustomers((prev) =>
      prev.map((c) =>
        customerIds.includes(c.id)
          ? {
              ...c,
              assignedAgentId: agent.id,
              assignedAgentName: agent.fullName,
              teamId: agent.teamId,
              teamName: agent.teamName,
              updatedAt: now,
            }
          : c
      )
    );

    if (isFirebaseConfigured) {
      for (const id of customerIds) {
        try {
          await updateDoc(doc(db, 'customers', id), {
            assignedAgentId: agent.id,
            assignedAgentName: agent.fullName,
            teamId: agent.teamId,
            teamName: agent.teamName,
            updatedAt: now,
          });
        } catch (err) {
          console.error(err);
        }
      }
    }

    success(`Đã chuyển giao ${customerIds.length} khách hàng`, `Người phụ trách: ${agent.fullName}`);
  };

  const bulkUpdateCustomerStatus = async (customerIds: string[], status: Customer['status']): Promise<void> => {
    if (customerIds.length === 0) return;
    const now = new Date().toISOString();
    setCustomers((prev) => prev.map((c) => (customerIds.includes(c.id) ? { ...c, status, updatedAt: now } : c)));
    if (isFirebaseConfigured) {
      for (const id of customerIds) {
        try {
          await updateDoc(doc(db, 'customers', id), { status, updatedAt: now });
        } catch (err) {
          console.error(err);
        }
      }
    }

    await addAuditLog({
      action: 'STATUS_CHANGE',
      module: 'CUSTOMERS',
      recordId: customerIds[0] || 'bulk',
      recordCode: `BULK_${customerIds.length}`,
      recordName: `${customerIds.length} khách hàng`,
      description: `Đổi trạng thái hàng loạt cho ${customerIds.length} khách hàng sang "${status}"`,
      newData: { status, affectedIds: customerIds },
      level: 'INFO',
    });

    success(`Đã cập nhật trạng thái ${customerIds.length} khách hàng`);
  };

  const bulkDeleteCustomers = async (customerIds: string[], reason?: string): Promise<void> => {
    if (customerIds.length === 0) return;
    const now = new Date().toISOString();
    const updateData = {
      isDeleted: true,
      deletedAt: now,
      deletedBy: currentUser?.id || 'anonymous',
      deleteReason: reason || 'Xóa hàng loạt vào thùng rác',
    };
    setCustomers((prev) => prev.map((c) => (customerIds.includes(c.id) ? { ...c, ...updateData } : c)));
    if (isFirebaseConfigured) {
      for (const id of customerIds) {
        try {
          await updateDoc(doc(db, 'customers', id), updateData);
        } catch (err) {
          console.error(err);
        }
      }
    }
    info(`Đã chuyển ${customerIds.length} khách hàng vào thùng rác`);
  };

  // Match Actions (Ghép sản phẩm)
  const addMatch = async (matchData: Omit<PropertyMatch, 'id' | 'createdAt'>): Promise<PropertyMatch> => {
    const newId = `match_${Date.now()}`;
    const newMatch: PropertyMatch = {
      ...matchData,
      id: newId,
      createdAt: new Date().toISOString(),
    };

    setMatches((prev) => [newMatch, ...prev]);
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'propertyMatches', newId), newMatch);
      } catch (err) {
        console.error(err);
      }
    }
    return newMatch;
  };

  const updateMatch = async (id: string, data: Partial<PropertyMatch>): Promise<void> => {
    const now = new Date().toISOString();
    setMatches((prev) => prev.map((m) => (m.id === id ? { ...m, ...data, updatedAt: now } : m)));
    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'propertyMatches', id), { ...data, updatedAt: now });
      } catch (err) {
        console.error(err);
      }
    }
    success('Đã cập nhật phản hồi ghép sản phẩm');
  };

  const deleteMatch = async (id: string): Promise<void> => {
    setMatches((prev) => prev.filter((m) => m.id !== id));
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'propertyMatches', id));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const markMatchSent = async (id: string, method: string = 'Zalo'): Promise<void> => {
    const now = new Date().toISOString();
    await updateMatch(id, {
      sentAt: now,
      sentBy: currentUser?.id,
      sentByName: currentUser?.fullName,
      responseStatus: 'CHUA_PHAN_HOI',
    });
    success(`Đã ghi nhận gửi sản phẩm qua ${method}`);
  };

  // Appointment Actions (Lịch hẹn)
  const addAppointment = async (appointmentData: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment> => {
    const sequence = appointments.length + 1;
    const newCode = `LH-AG${sequence.toString().padStart(4, '0')}`;
    const newId = `apt_${Date.now()}`;
    const now = new Date().toISOString();

    const agent = users.find((u) => u.id === appointmentData.assignedAgentId);
    const sanitizedAppointment: Appointment = cleanUndefined({
      ...appointmentData,
      id: newId,
      code: newCode,
      agentName: agent?.fullName || currentUser?.fullName || 'Môi giới',
      teamId: appointmentData.teamId || agent?.teamId || currentUser?.teamId || null,
      propertyId: appointmentData.propertyId || null,
      propertyCode: appointmentData.propertyCode || null,
      propertyAddress: appointmentData.propertyAddress || null,
      customerId: appointmentData.customerId || null,
      customerName: appointmentData.customerName || 'Khách hàng',
      customerPhone: appointmentData.customerPhone || null,
      notes: appointmentData.notes || null,
      createdAt: now,
    });

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'appointments', newId), sanitizedAppointment);
      } catch (err: any) {
        console.error('[addAppointment] Firestore setDoc error:', err);
        throw new Error(`Lỗi khi lưu lịch hẹn vào Firestore: ${err.message || 'Lỗi kết nối'}`);
      }
    }

    // Only update local state after Firestore write completes successfully
    setAppointments((prev) => [sanitizedAppointment, ...prev.filter((a) => a.id !== newId)]);

    await addAuditLog({
      action: 'CREATE_APPOINTMENT',
      module: 'APPOINTMENTS',
      recordId: newId,
      recordCode: newCode,
      recordName: sanitizedAppointment.title,
      description: `Lên lịch hẹn mới: [${sanitizedAppointment.type}] ${sanitizedAppointment.title}`,
      level: 'INFO',
    });

    // Notify agent
    await addNotification({
      title: 'Lịch hẹn mới được phân công',
      content: `${sanitizedAppointment.title} lúc ${sanitizedAppointment.startTime || ''} ${sanitizedAppointment.startDate || ''}`,
      type: 'APPOINTMENT',
      link: '/appointments',
      recipientId: sanitizedAppointment.assignedAgentId,
      isRead: false,
    });

    success('Tạo lịch hẹn thành công', `Đã lên lịch "${sanitizedAppointment.title}"`);
    return sanitizedAppointment;
  };

  const updateAppointment = async (id: string, data: Partial<Appointment>): Promise<void> => {
    const now = new Date().toISOString();
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...data, updatedAt: now } : a)));
    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'appointments', id), { ...data, updatedAt: now });
      } catch (err) {
        console.error(err);
      }
    }
    success('Đã cập nhật lịch hẹn');
  };

  const deleteAppointment = async (id: string): Promise<void> => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'appointments', id));
      } catch (err) {
        console.error(err);
      }
    }
    info('Đã xóa lịch hẹn');
  };

  const rescheduleAppointment = async (id: string, newStartDate: string, newStartTime: string, reason?: string): Promise<void> => {
    const apt = appointments.find((a) => a.id === id);
    if (!apt) return;
    await updateAppointment(id, {
      startDate: newStartDate,
      startTime: newStartTime,
      startDateTime: `${newStartDate}T${newStartTime}:00+07:00`,
      status: 'Dời lịch',
      notes: reason ? `Dời lịch: ${reason}\n${apt.notes || ''}` : apt.notes,
    });
    info('Đã dời lịch hẹn', `Thời gian mới: ${newStartTime} ngày ${newStartDate}`);
  };

  const completeAppointment = async (id: string, resultNotes: string, customerFeedback?: string, nextAction?: string): Promise<void> => {
    await updateAppointment(id, {
      status: 'Đã hoàn thành',
      resultNotes,
      customerFeedback,
      nextAction,
    });
    success('Đã hoàn thành buổi hẹn', 'Đã ghi nhận kết quả và phản hồi khách hàng.');
  };

  // Transaction Actions (Bán & Sang nhượng) - Atomic with Commission Draft
  const addTransaction = async (
    transData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>,
    commissionDraft?: Omit<Commission, 'id' | 'dealId' | 'dealCode' | 'createdAt' | 'updatedAt'>
  ): Promise<{ transaction: Transaction; commission?: Commission }> => {
    const sequence = transactions.length + 1;
    const newCode = `GD-AG${sequence.toString().padStart(4, '0')}`;
    const newId = `trans_${Date.now()}`;
    const now = new Date().toISOString();

    const sanitizedTrans: Transaction = cleanUndefined({
      ...transData,
      id: newId,
      code: newCode,
      notarizationDate: transData.notarizationDate || null,
      handoverDate: transData.handoverDate || null,
      teamId: transData.teamId || null,
      notes: transData.notes || null,
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser?.id || null,
    });

    let newCommission: Commission | undefined;
    if (commissionDraft) {
      const commSeq = commissions.length + 1;
      const commCode = `HH-AG${commSeq.toString().padStart(4, '0')}`;
      const commId = `comm_${Date.now()}`;
      newCommission = cleanUndefined({
        ...commissionDraft,
        id: commId,
        code: commCode,
        dealId: newId,
        dealCode: newCode,
        createdAt: now,
        updatedAt: now,
        createdBy: currentUser?.id || null,
      });
    }

    // Atomic execution via Firestore writeBatch so Transaction and Commission succeed or fail together
    if (isFirebaseConfigured) {
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'transactions', newId), sanitizedTrans);
        if (newCommission) {
          batch.set(doc(db, 'commissions', newCommission.id), newCommission);
        }
        if (sanitizedTrans.status === 'Đã đặt cọc' && sanitizedTrans.propertyId) {
          batch.update(doc(db, 'properties', sanitizedTrans.propertyId), {
            status: 'Đã nhận cọc',
            updatedAt: now,
          });
        } else if (sanitizedTrans.status === 'Hoàn tất' && sanitizedTrans.propertyId) {
          batch.update(doc(db, 'properties', sanitizedTrans.propertyId), {
            status: sanitizedTrans.type === 'SALE' ? 'Đã bán' : 'Đã sang nhượng',
            updatedAt: now,
          });
        }
        await batch.commit();
      } catch (err: any) {
        console.error('[addTransaction] Atomic writeBatch commit error:', err);
        throw new Error(`Lỗi khi lưu giao dịch vào Firestore: ${err.message || 'Lỗi kết nối'}`);
      }
    }

    // ONLY update local state AFTER Firestore batch write succeeds
    setTransactions((prev) => [sanitizedTrans, ...prev.filter((t) => t.id !== newId)]);
    if (newCommission) {
      setCommissions((prev) => [newCommission!, ...prev.filter((c) => c.id !== newCommission!.id)]);
    }
    if (sanitizedTrans.propertyId) {
      const newPropStatus = sanitizedTrans.status === 'Đã đặt cọc' ? 'Đã nhận cọc' : sanitizedTrans.status === 'Hoàn tất' ? (sanitizedTrans.type === 'SALE' ? 'Đã bán' : 'Đã sang nhượng') : undefined;
      if (newPropStatus) {
        setProperties((prev) =>
          prev.map((p) => (p.id === sanitizedTrans.propertyId ? { ...p, status: newPropStatus as PropertyStatus, updatedAt: now } : p))
        );
      }
    }

    await addAuditLog({
      action: 'CREATE_TRANSACTION',
      module: 'TRANSACTIONS',
      recordId: newId,
      recordCode: newCode,
      recordName: sanitizedTrans.propertyTitle,
      description: `Tạo giao dịch [${sanitizedTrans.type === 'SALE' ? 'Bán BĐS' : 'Sang nhượng'}] mã ${newCode} cho căn ${sanitizedTrans.propertyCode}${newCommission ? ' kèm phân chia hoa hồng ' + newCommission.code : ''}`,
      newData: sanitizedTrans,
      level: 'INFO',
    });

    if (newCommission) {
      await addAuditLog({
        action: 'CREATE_COMMISSION',
        module: 'COMMISSIONS',
        recordId: newCommission.id,
        recordCode: newCommission.code,
        description: `Tự động tạo hồ sơ hoa hồng [${newCommission.code}] cho giao dịch ${newCode}`,
        newData: newCommission,
        level: 'INFO',
      });
    }

    return { transaction: sanitizedTrans, commission: newCommission };
  };

  const updateTransaction = async (id: string, data: Partial<Transaction>): Promise<void> => {
    const now = new Date().toISOString();
    const oldTrans = transactions.find((t) => t.id === id);
    if (!oldTrans) return;

    const sanitizedData = cleanUndefined({ ...data, updatedAt: now });

    if (isFirebaseConfigured) {
      try {
        const batch = writeBatch(db);
        batch.update(doc(db, 'transactions', id), sanitizedData);

        if (sanitizedData.status && sanitizedData.status !== oldTrans.status) {
          if (sanitizedData.status === 'Đã đặt cọc' && oldTrans.propertyId) {
            batch.update(doc(db, 'properties', oldTrans.propertyId), { status: 'Đã nhận cọc', updatedAt: now });
          } else if (sanitizedData.status === 'Hoàn tất' && oldTrans.propertyId) {
            batch.update(doc(db, 'properties', oldTrans.propertyId), {
              status: oldTrans.type === 'SALE' ? 'Đã bán' : 'Đã sang nhượng',
              updatedAt: now,
            });
          } else if ((sanitizedData.status === 'Hủy cọc' || sanitizedData.status === 'Giao dịch thất bại') && oldTrans.propertyId) {
            batch.update(doc(db, 'properties', oldTrans.propertyId), { status: 'Đang bán', updatedAt: now });
            // Cancel linked commissions
            const linkedComms = commissions.filter((c) => c.dealId === id);
            for (const c of linkedComms) {
              batch.update(doc(db, 'commissions', c.id), { status: 'Đã hủy', updatedAt: now });
            }
          }
        }

        await batch.commit();
      } catch (err: any) {
        console.error('[updateTransaction] Error:', err);
        throw new Error(`Lỗi cập nhật giao dịch: ${err.message || 'Lỗi kết nối'}`);
      }
    }

    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...sanitizedData } : t)));

    if (sanitizedData.status && sanitizedData.status !== oldTrans.status) {
      if (sanitizedData.status === 'Đã đặt cọc' && oldTrans.propertyId) {
        setProperties((prev) => prev.map((p) => (p.id === oldTrans.propertyId ? { ...p, status: 'Đã nhận cọc', updatedAt: now } : p)));
      } else if (sanitizedData.status === 'Hoàn tất' && oldTrans.propertyId) {
        const pStatus = oldTrans.type === 'SALE' ? 'Đã bán' : 'Đã sang nhượng';
        setProperties((prev) => prev.map((p) => (p.id === oldTrans.propertyId ? { ...p, status: pStatus, updatedAt: now } : p)));
      } else if ((sanitizedData.status === 'Hủy cọc' || sanitizedData.status === 'Giao dịch thất bại') && oldTrans.propertyId) {
        setProperties((prev) => prev.map((p) => (p.id === oldTrans.propertyId ? { ...p, status: 'Đang bán', updatedAt: now } : p)));
        setCommissions((prev) => prev.map((c) => (c.dealId === id ? { ...c, status: 'Đã hủy', updatedAt: now } : c)));
      }
    }

    await addAuditLog({
      action: 'UPDATE',
      module: 'TRANSACTIONS',
      recordId: id,
      recordCode: oldTrans.code,
      recordName: oldTrans.propertyTitle,
      description: `Cập nhật giao dịch [${oldTrans.code}] ${sanitizedData.status ? 'sang trạng thái ' + sanitizedData.status : ''}`,
      newData: sanitizedData,
      level: 'INFO',
    });

    success('Đã cập nhật tiến độ giao dịch');
  };

  const updateTransactionStatus = async (id: string, status: Transaction['status'], step?: number): Promise<void> => {
    await updateTransaction(id, { status, step });
  };

  const deleteTransaction = async (id: string, reason?: string): Promise<void> => {
    const targetTrans = transactions.find((t) => t.id === id);
    if (!targetTrans) return;

    const linkedComms = commissions.filter((c) => c.dealId === id);
    const now = new Date().toISOString();

    if (isFirebaseConfigured) {
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'transactions', id));

        // Clean up linked commissions
        for (const comm of linkedComms) {
          batch.delete(doc(db, 'commissions', comm.id));
        }

        // Revert property status to available
        if (targetTrans.propertyId) {
          batch.update(doc(db, 'properties', targetTrans.propertyId), {
            status: targetTrans.type === 'RENTAL' ? 'Đang cho thuê' : 'Đang bán',
            updatedAt: now,
          });
        }

        await batch.commit();
      } catch (err: any) {
        console.error('[deleteTransaction] Error:', err);
        throw new Error(`Lỗi khi xóa giao dịch: ${err.message || 'Lỗi kết nối'}`);
      }
    }

    setTransactions((prev) => prev.filter((t) => t.id !== id));
    if (linkedComms.length > 0) {
      const commIds = new Set(linkedComms.map((c) => c.id));
      setCommissions((prev) => prev.filter((c) => !commIds.has(c.id)));
    }
    if (targetTrans.propertyId) {
      const revertStatus = targetTrans.type === 'RENTAL' ? 'Đang cho thuê' : 'Đang bán';
      setProperties((prev) =>
        prev.map((p) => (p.id === targetTrans.propertyId ? { ...p, status: revertStatus, updatedAt: now } : p))
      );
    }

    await addAuditLog({
      action: 'DELETE',
      module: 'TRANSACTIONS',
      recordId: id,
      recordCode: targetTrans.code,
      recordName: targetTrans.propertyTitle,
      description: `Xóa giao dịch [${targetTrans.code}] ${targetTrans.propertyTitle}${reason ? ': ' + reason : ''} và dọn dẹp các hồ sơ hoa hồng liên kết`,
      level: 'WARNING',
    });

    info('Đã xóa giao dịch và đồng bộ các dữ liệu liên quan');
  };

  // Rental Deal Actions (Cho thuê)
  const addRentalDeal = async (dealData: Omit<RentalDeal, 'id' | 'createdAt' | 'updatedAt'>): Promise<RentalDeal> => {
    const sequence = rentalDeals.length + 1;
    const newCode = `THUE-AG${sequence.toString().padStart(4, '0')}`;
    const newId = `rentdeal_${Date.now()}`;
    const now = new Date().toISOString();

    const newDeal: RentalDeal = {
      ...dealData,
      id: newId,
      code: newCode,
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser?.id,
    };

    setRentalDeals((prev) => [newDeal, ...prev]);
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'rentalDeals', newId), newDeal);
      } catch (err) {
        console.error(err);
      }
    }

    if (newDeal.status === 'Đã đặt cọc') {
      await updatePropertyStatus(newDeal.propertyId, 'Đã nhận cọc');
    } else if (newDeal.status === 'Đã ký' || newDeal.status === 'Hoàn tất') {
      await updatePropertyStatus(newDeal.propertyId, 'Đã cho thuê');
    }

    await addAuditLog({
      action: 'CREATE',
      module: 'RENTALS',
      recordId: newId,
      recordCode: newCode,
      recordName: newDeal.propertyTitle,
      description: `Tạo giao dịch cho thuê [${newCode}] BĐS ${newDeal.propertyCode}`,
      level: 'INFO',
    });

    success('Tạo giao dịch thuê thành công', `Đã lưu giao dịch ${newCode}`);
    return newDeal;
  };

  const updateRentalDeal = async (id: string, data: Partial<RentalDeal>): Promise<void> => {
    const now = new Date().toISOString();
    const oldDeal = rentalDeals.find((d) => d.id === id);

    setRentalDeals((prev) => prev.map((d) => (d.id === id ? { ...d, ...data, updatedAt: now } : d)));
    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'rentalDeals', id), { ...data, updatedAt: now });
      } catch (err) {
        console.error(err);
      }
    }

    if (data.status && oldDeal && data.status !== oldDeal.status) {
      if (data.status === 'Đã đặt cọc') {
        await updatePropertyStatus(oldDeal.propertyId, 'Đã nhận cọc');
      } else if (data.status === 'Đã ký' || data.status === 'Hoàn tất') {
        await updatePropertyStatus(oldDeal.propertyId, 'Đã cho thuê');
      } else if (data.status === 'Hủy') {
        await updatePropertyStatus(oldDeal.propertyId, 'Đang cho thuê');
      }
    }

    success('Đã cập nhật giao dịch thuê');
  };

  const updateRentalDealStatus = async (id: string, status: RentalDeal['status'], step?: number): Promise<void> => {
    await updateRentalDeal(id, { status, step });
  };

  const deleteRentalDeal = async (id: string, reason?: string): Promise<void> => {
    setRentalDeals((prev) => prev.filter((d) => d.id !== id));
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'rentalDeals', id));
      } catch (err) {
        console.error(err);
      }
    }
    info('Đã xóa giao dịch thuê');
  };

  // Rental Contract Actions (Hợp đồng thuê)
  const addRentalContract = async (contractData: Omit<RentalContract, 'id' | 'createdAt' | 'updatedAt'>): Promise<RentalContract> => {
    const sequence = rentalContracts.length + 1;
    const newCode = `HDT-AG${sequence.toString().padStart(4, '0')}`;
    const newId = `contract_${Date.now()}`;
    const now = new Date().toISOString();

    const newContract: RentalContract = cleanUndefined({
      ...contractData,
      id: newId,
      code: newCode,
      notes: contractData.notes || '',
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser?.id || null,
    });

    if (isFirebaseConfigured) {
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'rentalContracts', newId), newContract);

        if (newContract.status === 'Đang hiệu lực' && newContract.propertyId) {
          batch.update(doc(db, 'properties', newContract.propertyId), {
            status: 'Đã cho thuê',
            updatedAt: now,
          });
        }
        await batch.commit();
      } catch (err: any) {
        console.error('[addRentalContract] Firestore batch error:', err);
        throw new Error(`Lỗi khi lưu hợp đồng thuê: ${err.message || 'Lỗi kết nối'}`);
      }
    }

    setRentalContracts((prev) => [newContract, ...prev]);
    if (newContract.status === 'Đang hiệu lực' && newContract.propertyId) {
      setProperties((prev) =>
        prev.map((p) => (p.id === newContract.propertyId ? { ...p, status: 'Đã cho thuê', updatedAt: now } : p))
      );
    }

    await addAuditLog({
      action: 'CREATE',
      module: 'CONTRACTS',
      recordId: newId,
      recordCode: newCode,
      recordName: newContract.propertyTitle,
      description: `Tạo hợp đồng thuê mới [${newCode}] cho khách ${newContract.customerName}`,
      newData: newContract,
      level: 'INFO',
    });

    success('Tạo hợp đồng thuê thành công', `Hợp đồng mã ${newCode} đã được lưu.`);
    return newContract;
  };

  const updateRentalContract = async (id: string, data: Partial<RentalContract>): Promise<void> => {
    const now = new Date().toISOString();
    const cleanData = cleanUndefined({ ...data, updatedAt: now });

    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'rentalContracts', id), cleanData);
      } catch (err: any) {
        console.error('[updateRentalContract] Error:', err);
        throw new Error(`Lỗi cập nhật hợp đồng: ${err.message || 'Lỗi kết nối'}`);
      }
    }

    setRentalContracts((prev) => prev.map((c) => (c.id === id ? { ...c, ...cleanData } : c)));
    success('Đã cập nhật hợp đồng thuê');
  };

  const renewRentalContract = async (id: string, newEndDate: string, newRentAmount?: number, notes?: string): Promise<void> => {
    const contract = rentalContracts.find((c) => c.id === id);
    if (!contract) return;
    await updateRentalContract(id, {
      endDate: newEndDate,
      monthlyRent: newRentAmount || contract.monthlyRent,
      status: 'Đã gia hạn',
      notes: notes ? `Gia hạn đến ${newEndDate}: ${notes}\n${contract.notes || ''}` : contract.notes,
    });
    await addAuditLog({
      action: 'UPDATE',
      module: 'CONTRACTS',
      recordId: id,
      recordCode: contract.code,
      description: `Gia hạn hợp đồng ${contract.code} đến ngày ${newEndDate}`,
      level: 'INFO',
    });
    success('Gia hạn hợp đồng thành công');
  };

  const terminateRentalContract = async (id: string, terminationDate: string, reason?: string): Promise<void> => {
    const contract = rentalContracts.find((c) => c.id === id);
    if (!contract) return;
    const now = new Date().toISOString();
    const updateData = {
      status: 'Đã thanh lý' as const,
      notes: `Thanh lý ngày ${terminationDate}: ${reason || 'Kết thúc thời hạn thuê'}\n${contract.notes || ''}`,
      updatedAt: now,
    };

    if (isFirebaseConfigured) {
      try {
        const batch = writeBatch(db);
        batch.update(doc(db, 'rentalContracts', id), updateData);
        if (contract.propertyId) {
          batch.update(doc(db, 'properties', contract.propertyId), {
            status: 'Đang cho thuê',
            updatedAt: now,
          });
        }
        await batch.commit();
      } catch (err: any) {
        console.error('[terminateRentalContract] Error:', err);
        throw new Error(`Lỗi thanh lý hợp đồng: ${err.message || 'Lỗi kết nối'}`);
      }
    }

    setRentalContracts((prev) => prev.map((c) => (c.id === id ? { ...c, ...updateData } : c)));
    if (contract.propertyId) {
      setProperties((prev) =>
        prev.map((p) => (p.id === contract.propertyId ? { ...p, status: 'Đang cho thuê', updatedAt: now } : p))
      );
    }

    await addAuditLog({
      action: 'UPDATE',
      module: 'CONTRACTS',
      recordId: id,
      recordCode: contract.code,
      description: `Thanh lý hợp đồng thuê [${contract.code}], hoàn trả trạng thái nguồn hàng BĐS sang Đang cho thuê`,
      level: 'WARNING',
    });

    info('Đã thanh lý hợp đồng thuê và cập nhật nguồn hàng sang Đang cho thuê');
  };

  const deleteRentalContract = async (id: string, reason?: string): Promise<void> => {
    const target = rentalContracts.find((c) => c.id === id);
    if (!target) return;
    const now = new Date().toISOString();

    if (isFirebaseConfigured) {
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'rentalContracts', id));
        if (target.propertyId && target.status === 'Đang hiệu lực') {
          batch.update(doc(db, 'properties', target.propertyId), {
            status: 'Đang cho thuê',
            updatedAt: now,
          });
        }
        await batch.commit();
      } catch (err: any) {
        console.error('[deleteRentalContract] Error:', err);
        throw new Error(`Lỗi xóa hợp đồng: ${err.message || 'Lỗi kết nối'}`);
      }
    }

    setRentalContracts((prev) => prev.filter((c) => c.id !== id));
    if (target.propertyId && target.status === 'Đang hiệu lực') {
      setProperties((prev) =>
        prev.map((p) => (p.id === target.propertyId ? { ...p, status: 'Đang cho thuê', updatedAt: now } : p))
      );
    }

    await addAuditLog({
      action: 'DELETE',
      module: 'CONTRACTS',
      recordId: id,
      recordCode: target.code,
      recordName: target.propertyTitle,
      description: `Xóa hợp đồng thuê [${target.code}]${reason ? ': ' + reason : ''}`,
      level: 'WARNING',
    });

    info('Đã xóa hợp đồng thuê');
  };

  // Rental Payment Actions
  const addRentalPayment = async (paymentData: Omit<RentalPayment, 'id' | 'createdAt' | 'updatedAt'>): Promise<RentalPayment> => {
    const newId = `pay_${Date.now()}`;
    const now = new Date().toISOString();
    const newPayment: RentalPayment = cleanUndefined({
      ...paymentData,
      id: newId,
      createdAt: now,
      updatedAt: now,
    });

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'rentalPayments', newId), newPayment);
      } catch (err: any) {
        console.error('[addRentalPayment] Error:', err);
        throw new Error(`Lỗi lưu kỳ thanh toán: ${err.message || 'Lỗi kết nối'}`);
      }
    }

    setRentalPayments((prev) => [...prev, newPayment]);
    return newPayment;
  };

  const updateRentalPayment = async (id: string, data: Partial<RentalPayment>): Promise<void> => {
    const now = new Date().toISOString();
    const cleanData = cleanUndefined({ ...data, updatedAt: now });

    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'rentalPayments', id), cleanData);
      } catch (err: any) {
        console.error('[updateRentalPayment] Error:', err);
        throw new Error(`Lỗi cập nhật kỳ thanh toán: ${err.message || 'Lỗi kết nối'}`);
      }
    }

    setRentalPayments((prev) => prev.map((p) => (p.id === id ? { ...p, ...cleanData } : p)));
    success('Đã cập nhật kỳ thanh toán');
  };

  const markPaymentPaid = async (
    id: string,
    paidAmount: number,
    paymentMethod: 'TIEN_MAT' | 'CHUYEN_KHOAN' | 'KHAC',
    receiptUrl?: string
  ): Promise<void> => {
    const payment = rentalPayments.find((p) => p.id === id);
    if (!payment) return;
    const now = new Date().toISOString();
    const remaining = Math.max(0, payment.totalAmount - paidAmount);
    const status = remaining === 0 ? 'Đã thanh toán' : 'Thanh toán một phần';

    await updateRentalPayment(id, {
      paidAmount,
      remainingAmount: remaining,
      paymentMethod,
      paidDate: now.split('T')[0],
      status,
      receiptUrl,
    });
    success('Đã xác nhận thu tiền thuê thành công');
  };

  // Commission Actions (Hoa hồng)
  const addCommission = async (commData: Omit<Commission, 'id' | 'createdAt' | 'updatedAt'>): Promise<Commission> => {
    // Strictly enforce requirement VII.3: "Không tạo hoa hồng độc lập nếu không gắn với giao dịch thật."
    const hasValidDeal =
      commData.dealId &&
      (transactions.some((t) => t.id === commData.dealId) ||
        rentalDeals.some((r) => r.id === commData.dealId) ||
        rentalContracts.some((rc) => rc.id === commData.dealId));

    if (!hasValidDeal) {
      throw new Error('Hoa hồng bắt buộc phải gắn với một giao dịch mua bán hoặc hợp đồng thuê có thật trên hệ thống. Không cho phép tạo hoa hồng độc lập.');
    }

    const sequence = commissions.length + 1;
    const newCode = `HH-AG${sequence.toString().padStart(4, '0')}`;
    const newId = `comm_${Date.now()}`;
    const now = new Date().toISOString();

    const newComm: Commission = cleanUndefined({
      ...commData,
      id: newId,
      code: newCode,
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser?.id || null,
    });

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'commissions', newId), newComm);
      } catch (err: any) {
        console.error('[addCommission] Firestore error:', err);
        throw new Error(`Lỗi khi lưu hồ sơ hoa hồng: ${err.message || 'Lỗi kết nối'}`);
      }
    }

    setCommissions((prev) => [newComm, ...prev]);

    await addAuditLog({
      action: 'CREATE_COMMISSION',
      module: 'COMMISSIONS',
      recordId: newId,
      recordCode: newCode,
      description: `Tạo bảng tính hoa hồng [${newCode}] cho giao dịch ${newComm.dealCode} (Tổng: ${newComm.totalExpectedCommission.toLocaleString('vi-VN')} đ)`,
      newData: newComm,
      level: 'INFO',
    });

    success('Tạo hoa hồng thành công', `Đã lưu hồ sơ hoa hồng ${newCode}`);
    return newComm;
  };

  const updateCommission = async (id: string, data: Partial<Commission>): Promise<void> => {
    const now = new Date().toISOString();
    const cleanData = cleanUndefined({ ...data, updatedAt: now });

    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'commissions', id), cleanData);
      } catch (err: any) {
        console.error('[updateCommission] Error:', err);
        throw new Error(`Lỗi cập nhật hoa hồng: ${err.message || 'Lỗi kết nối'}`);
      }
    }

    setCommissions((prev) => prev.map((c) => (c.id === id ? { ...c, ...cleanData } : c)));
    success('Đã cập nhật thông tin hoa hồng');
  };

  const updateCommissionSplits = async (id: string, splits: CommissionSplit[], netCommission: number): Promise<void> => {
    await updateCommission(id, { splits, netCommission });
    await addAuditLog({
      action: 'SPLIT_COMMISSION',
      module: 'COMMISSIONS',
      recordId: id,
      description: `Cập nhật phân chia tỷ lệ hoa hồng cho hồ sơ ${id}`,
      level: 'INFO',
    });
    success('Đã lưu phân chia hoa hồng');
  };

  const markCommissionSplitPaid = async (commissionId: string, splitId: string, receiptUrl?: string): Promise<void> => {
    const comm = commissions.find((c) => c.id === commissionId);
    if (!comm) return;
    const now = new Date().toISOString();

    const updatedSplits = comm.splits.map((s) =>
      s.id === splitId ? { ...s, isPaid: true, paidDate: now.split('T')[0], receiptUrl } : s
    );

    const allPaid = updatedSplits.every((s) => s.isPaid);
    const somePaid = updatedSplits.some((s) => s.isPaid);
    const newStatus = allPaid ? 'Đã chia đủ' : somePaid ? 'Đã chia một phần' : comm.status;

    await updateCommission(commissionId, { splits: updatedSplits, status: newStatus });
    success('Đã xác nhận chi trả hoa hồng thành công');
  };

  const deleteCommission = async (id: string, reason?: string): Promise<void> => {
    const target = commissions.find((c) => c.id === id);
    if (!target) return;

    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'commissions', id));
      } catch (err: any) {
        console.error('[deleteCommission] Error:', err);
        throw new Error(`Lỗi khi xóa hồ sơ hoa hồng: ${err.message || 'Lỗi kết nối'}`);
      }
    }

    setCommissions((prev) => prev.filter((c) => c.id !== id));

    await addAuditLog({
      action: 'DELETE_COMMISSION',
      module: 'COMMISSIONS',
      recordId: id,
      recordCode: target.code,
      description: `Xóa hồ sơ hoa hồng [${target.code}]${reason ? ': ' + reason : ''}`,
      level: 'WARNING',
    });

    info('Đã xóa hồ sơ hoa hồng');
  };

  // Settings Actions
  const updateSystemSettings = async (data: Partial<SystemSettings>): Promise<void> => {
    const updated = {
      ...systemSettings,
      ...data,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.fullName || 'Quản trị viên',
    };
    setSystemSettings(updated);
    localStorage.setItem('tp_system_settings', JSON.stringify(updated));

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'settings', 'general'), updated, { merge: true });
      } catch (err: any) {
        console.warn('Update settings error:', err.message);
      }
    }

    await addAuditLog({
      action: 'SETTINGS_CHANGE',
      module: 'SETTINGS',
      description: 'Thay đổi cài đặt hệ thống và nhận diện thương hiệu công ty',
      level: 'INFO',
    });

    success('Cập nhật cài đặt thành công', 'Thông tin hệ thống đã được đồng bộ.');
  };

  const restoreDefaultLogo = async (): Promise<void> => {
    await updateSystemSettings({ logoUrl: '' });
  };

  // Location Actions
  const addLocation = async (locationData: Omit<LocationItem, 'id'>): Promise<LocationItem> => {
    const newId = `loc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newLocation: LocationItem = {
      ...locationData,
      id: newId,
    };

    setLocations((prev) => [...prev, newLocation]);
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'locations', newId), newLocation);
      } catch (err: any) {
        console.warn('Add location error:', err.message);
      }
    }

    await addAuditLog({
      action: 'SETTINGS_CHANGE',
      module: 'SETTINGS',
      description: `Thêm địa bàn mới: ${newLocation.currentName} (${newLocation.formerDistrictName})`,
      level: 'INFO',
    });

    success('Thêm địa bàn thành công', `Đã thêm ${newLocation.currentName} vào hệ thống.`);
    return newLocation;
  };

  const updateLocation = async (id: string, data: Partial<LocationItem>): Promise<void> => {
    setLocations((prev) => prev.map((loc) => (loc.id === id ? { ...loc, ...data } : loc)));
    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'locations', id), data);
      } catch (err: any) {
        console.warn('Update location error:', err.message);
      }
    }

    await addAuditLog({
      action: 'SETTINGS_CHANGE',
      module: 'SETTINGS',
      description: `Cập nhật thông tin địa bàn mã: ${id}`,
      level: 'INFO',
    });

    success('Cập nhật địa bàn thành công');
  };

  const deleteLocation = async (id: string): Promise<void> => {
    const targetLoc = locations.find((l) => l.id === id);
    setLocations((prev) => prev.filter((loc) => loc.id !== id));
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'locations', id));
      } catch (err: any) {
        console.warn('Delete location error:', err.message);
      }
    }

    await addAuditLog({
      action: 'SETTINGS_CHANGE',
      module: 'SETTINGS',
      description: `Xóa địa bàn: ${targetLoc?.currentName || id}`,
      level: 'WARNING',
    });

    info('Đã xóa địa bàn khỏi danh sách');
  };

  // Filtered Properties for standard views
  const filteredProperties = properties.filter((prop) => {
    if (prop.isDeleted) return false;

    if (filterState.searchQuery) {
      const q = filterState.searchQuery.toLowerCase();
      const matchCode = prop.code.toLowerCase().includes(q);
      const matchTitle = prop.title.toLowerCase().includes(q);
      const matchAddress = prop.address.toLowerCase().includes(q);
      const matchOwner = prop.ownerName.toLowerCase().includes(q);
      const matchPhone = prop.ownerPhone.includes(q);
      if (!matchCode && !matchTitle && !matchAddress && !matchOwner && !matchPhone) return false;
    }

    if (filterState.transactionType && filterState.transactionType !== 'ALL') {
      if (prop.transactionType !== filterState.transactionType) return false;
    }

    if (filterState.propertyType && filterState.propertyType !== 'ALL') {
      if (prop.propertyType !== filterState.propertyType) return false;
    }

    if (filterState.city && filterState.city !== 'ALL') {
      if (prop.city !== filterState.city) return false;
    }

    if (filterState.district && filterState.district !== 'ALL') {
      if (prop.district !== filterState.district) return false;
    }

    if (filterState.status && filterState.status !== 'ALL') {
      if (prop.status !== filterState.status) return false;
    }

    if (filterState.assignedAgentId && filterState.assignedAgentId !== 'ALL') {
      if (prop.assignedAgentId !== filterState.assignedAgentId) return false;
    }

    if (filterState.teamId && filterState.teamId !== 'ALL') {
      if (prop.teamId !== filterState.teamId) return false;
    }

    const effectivePrice = prop.salePrice || prop.rentPriceMonthly || prop.transferPrice || 0;
    if (filterState.minPrice !== undefined && effectivePrice < filterState.minPrice) return false;
    if (filterState.maxPrice !== undefined && effectivePrice > filterState.maxPrice) return false;

    if (filterState.minArea !== undefined && prop.landArea < filterState.minArea) return false;
    if (filterState.maxArea !== undefined && prop.landArea > filterState.maxArea) return false;

    if (filterState.bedrooms !== undefined && (prop.bedrooms || 0) < filterState.bedrooms) return false;
    if (filterState.hasImagesOnly && (!prop.images || prop.images.length === 0)) return false;

    return true;
  });

  return (
    <DataContext.Provider
      value={{
        properties,
        users,
        teams,
        customers,
        appointments,
        matches,
        transactions,
        rentalDeals,
        rentalContracts,
        rentalPayments,
        commissions,
        auditLogs,
        notifications,
        systemSettings,
        isLoading,
        filterState,
        setFilterState,
        resetFilters,
        filteredProperties,

        addProperty,
        updateProperty,
        deleteProperty,
        restoreProperty,
        permanentDeleteProperty,
        updatePropertyStatus,
        assignPropertyAgent,
        bulkUpdateStatus,
        bulkAssignAgent,
        bulkDeleteProperties,
        checkDuplicateProperty,

        addUser,
        updateUser,
        updateUserAvatar,
        toggleUserStatus,
        addTeam,
        updateTeam,
        deleteTeam,

        addCustomer,
        updateCustomer,
        deleteCustomer,
        restoreCustomer,
        permanentDeleteCustomer,
        addCustomerInteraction,
        assignCustomerAgent,
        bulkAssignCustomerAgent,
        bulkUpdateCustomerStatus,
        bulkDeleteCustomers,
        checkDuplicateCustomerPhone,

        addMatch,
        updateMatch,
        deleteMatch,
        markMatchSent,

        addAppointment,
        updateAppointment,
        deleteAppointment,
        rescheduleAppointment,
        completeAppointment,

        addTransaction,
        updateTransaction,
        updateTransactionStatus,
        deleteTransaction,

        addRentalDeal,
        updateRentalDeal,
        updateRentalDealStatus,
        deleteRentalDeal,

        addRentalContract,
        updateRentalContract,
        renewRentalContract,
        terminateRentalContract,
        deleteRentalContract,

        addRentalPayment,
        updateRentalPayment,
        markPaymentPaid,

        addCommission,
        updateCommission,
        updateCommissionSplits,
        markCommissionSplitPaid,
        deleteCommission,

        addAuditLog,
        addNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,

        updateSystemSettings,
        restoreDefaultLogo,

        locations,
        addLocation,
        updateLocation,
        deleteLocation,

        seedInitialDataToFirestore,
        resetDemoData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
