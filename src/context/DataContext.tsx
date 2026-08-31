import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Property, User, Team, PropertyFilterState, TransactionType, PropertyStatus, Customer, Appointment, AuditLog } from '../types';
import { SAMPLE_PROPERTIES, SAMPLE_USERS, SAMPLE_TEAMS } from '../data/sampleData';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { generatePropertyCode } from '../utils/formatters';
import { isFirebaseConfigured, db } from '../config/firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  reasons: string[];
  matchedProperties: Property[];
}

interface DataContextType {
  properties: Property[];
  users: User[];
  teams: Team[];
  customers: Customer[];
  appointments: Appointment[];
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
  updatePropertyStatus: (id: string, status: PropertyStatus) => Promise<void>;
  assignPropertyAgent: (id: string, agentId: string) => Promise<void>;
  bulkUpdateStatus: (ids: string[], status: PropertyStatus) => Promise<void>;
  bulkAssignAgent: (ids: string[], agentId: string) => Promise<void>;
  bulkDeleteProperties: (ids: string[], reason?: string) => Promise<void>;
  checkDuplicateProperty: (data: Partial<Property>, excludeId?: string) => DuplicateCheckResult;
  
  // User Actions
  addUser: (userData: Omit<User, 'id' | 'createdAt'>) => Promise<User>;
  updateUser: (id: string, userData: Partial<User>) => Promise<void>;
  toggleUserStatus: (id: string) => Promise<void>;
  
  // Team Actions
  addTeam: (teamData: Omit<Team, 'id' | 'createdAt' | 'memberIds'>) => Promise<Team>;
  updateTeam: (id: string, teamData: Partial<Team>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;

  // Customer Actions
  addCustomer: (customerData: Omit<Customer, 'id' | 'code' | 'createdAt' | 'updatedAt'>) => Promise<Customer>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;

  // Appointment Actions
  addAppointment: (appointmentData: Omit<Appointment, 'id' | 'createdAt'>) => Promise<Appointment>;
  updateAppointment: (id: string, data: Partial<Appointment>) => Promise<void>;
  
  // Reset / Seed
  seedInitialDataToFirestore: () => Promise<void>;
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
  const { currentUser, isAdmin } = useAuth();
  const { success, error, info } = useToast();

  const [properties, setProperties] = useState<Property[]>(SAMPLE_PROPERTIES);
  const [users, setUsers] = useState<User[]>(SAMPLE_USERS);
  const [teams, setTeams] = useState<Team[]>(SAMPLE_TEAMS);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterState, setFilterState] = useState<PropertyFilterState>(defaultFilterState);

  // Helper to seed initial sample data into Firestore if empty
  const seedInitialDataToFirestore = async () => {
    if (!isFirebaseConfigured) return;
    try {
      // Seed users
      for (const u of SAMPLE_USERS) {
        await setDoc(doc(db, 'users', u.id), u, { merge: true });
      }
      // Seed teams
      for (const t of SAMPLE_TEAMS) {
        await setDoc(doc(db, 'teams', t.id), t, { merge: true });
      }
      // Seed properties
      for (const p of SAMPLE_PROPERTIES) {
        await setDoc(doc(db, 'properties', p.id), p, { merge: true });
      }
      success('Đã đồng bộ cơ sở dữ liệu lên Cloud Firestore');
    } catch (err) {
      console.error('Seeding error:', err);
    }
  };

  // Firebase Realtime Snapshots
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // 1. Properties realtime listener
    const unsubProps = onSnapshot(
      collection(db, 'properties'),
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Property));
          setProperties(loaded);
        } else {
          // If collection is empty on first boot, auto seed default properties
          seedInitialDataToFirestore();
        }
        setIsLoading(false);
      },
      (err) => {
        console.warn('Firestore properties snapshot notice:', err.message);
        setIsLoading(false);
      }
    );

    // 2. Users realtime listener
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as User));
          setUsers(loaded);
        }
      },
      (err) => {
        console.warn('Firestore users snapshot notice:', err.message);
      }
    );

    // 3. Teams realtime listener
    const unsubTeams = onSnapshot(
      collection(db, 'teams'),
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Team));
          setTeams(loaded);
        }
      },
      (err) => {
        console.warn('Firestore teams snapshot notice:', err.message);
      }
    );

    // 4. Customers realtime listener
    const unsubCustomers = onSnapshot(
      collection(db, 'customers'),
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Customer));
          setCustomers(loaded);
        }
      },
      (err) => {
        console.warn('Firestore customers snapshot notice:', err.message);
      }
    );

    // 5. Appointments listener
    const unsubAppointments = onSnapshot(
      collection(db, 'appointments'),
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment));
          setAppointments(loaded);
        }
      },
      (err) => {
        console.warn('Firestore appointments snapshot notice:', err.message);
      }
    );

    return () => {
      unsubProps();
      unsubUsers();
      unsubTeams();
      unsubCustomers();
      unsubAppointments();
    };
  }, []);

  const resetFilters = () => {
    setFilterState(defaultFilterState);
  };

  const resetDemoData = () => {
    setProperties(SAMPLE_PROPERTIES);
    setUsers(SAMPLE_USERS);
    setTeams(SAMPLE_TEAMS);
    seedInitialDataToFirestore();
    success('Đã nạp lại dữ liệu chuẩn', 'Dữ liệu bất động sản và nhân sự đã được đồng bộ chuẩn Cloud.');
  };

  // Duplicate Check logic
  const checkDuplicateProperty = (data: Partial<Property>, excludeId?: string): DuplicateCheckResult => {
    const reasons: string[] = [];
    const matchedProps: Property[] = [];

    const activeList = properties.filter((p) => !p.isDeleted && p.id !== excludeId);

    for (const prop of activeList) {
      let isMatch = false;

      // Phone match
      if (data.ownerPhone && prop.ownerPhone) {
        const p1 = data.ownerPhone.replace(/\D/g, '');
        const p2 = prop.ownerPhone.replace(/\D/g, '');
        if (p1 && p2 && p1 === p2) {
          reasons.push(`Trùng số điện thoại chủ nhà (${data.ownerPhone}) với mã ${prop.code}`);
          isMatch = true;
        }
      }

      // Cadastral lot & sheet match
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

      // Address similarity
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

  // Add Property (Saves directly to Firestore)
  const addProperty = async (data: Omit<Property, 'id' | 'code' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<Property> => {
    const sequence = properties.length + 1;
    const newCode = generatePropertyCode(data.transactionType, sequence);
    const newId = `prop_${Date.now()}`;
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

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'properties', newId), newProp);
      } catch (err: any) {
        console.error('Save to Firestore error:', err);
      }
    }

    setProperties((prev) => [newProp, ...prev]);
    success('Thêm nguồn hàng thành công', `Đã lưu bất động sản mã ${newCode} lên hệ thống.`);
    return newProp;
  };

  // Update Property (Saves directly to Firestore)
  const updateProperty = async (id: string, data: Partial<Property>): Promise<void> => {
    const now = new Date().toISOString();
    let updatedObj: Property | null = null;

    setProperties((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const assignedAgent = data.assignedAgentId ? users.find((u) => u.id === data.assignedAgentId) : undefined;
          const team = data.teamId ? teams.find((t) => t.id === data.teamId) : undefined;

          updatedObj = {
            ...p,
            ...data,
            assignedAgentName: assignedAgent ? assignedAgent.fullName : p.assignedAgentName,
            teamName: team ? team.name : p.teamName,
            updatedAt: now,
            updatedBy: currentUser?.id,
          };
          return updatedObj;
        }
        return p;
      })
    );

    if (isFirebaseConfigured && updatedObj) {
      try {
        await updateDoc(doc(db, 'properties', id), updatedObj as any);
      } catch (err) {
        console.error('Update Firestore error:', err);
      }
    }

    success('Cập nhật thành công', 'Thông tin bất động sản đã được lưu.');
  };

  // Delete Property (Soft delete synced to Firestore)
  const deleteProperty = async (id: string, reason?: string): Promise<void> => {
    const now = new Date().toISOString();
    const updateData = {
      isDeleted: true,
      deletedAt: now,
      deletedBy: currentUser?.id,
      deleteReason: reason || 'Người dùng xóa vào thùng rác',
    };

    setProperties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updateData } : p))
    );

    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'properties', id), updateData);
      } catch (err) {
        console.error(err);
      }
    }

    info('Đã chuyển vào thùng rác', 'Bất động sản đã được đưa vào thùng rác.');
  };

  // Restore Property
  const restoreProperty = async (id: string): Promise<void> => {
    const updateData = {
      isDeleted: false,
      deletedAt: undefined,
      deletedBy: undefined,
      deleteReason: undefined,
    };

    setProperties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updateData } : p))
    );

    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'properties', id), updateData as any);
      } catch (err) {
        console.error(err);
      }
    }

    success('Khôi phục thành công', 'Bất động sản đã được đưa trở lại danh sách hoạt động.');
  };

  // Update Status
  const updatePropertyStatus = async (id: string, status: PropertyStatus): Promise<void> => {
    await updateProperty(id, { status });
  };

  // Bulk Update Status
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

    success(`Đã chuyển trạng thái ${ids.length} BĐS`, `Tất cả đã chuyển sang "${status}"`);
  };

  // Assign Agent
  const assignPropertyAgent = async (id: string, agentId: string): Promise<void> => {
    const agent = users.find((u) => u.id === agentId);
    if (!agent) return;
    await updateProperty(id, {
      assignedAgentId: agent.id,
      assignedAgentName: agent.fullName,
      assignedAgentPhone: agent.phone,
      teamId: agent.teamId,
      teamName: agent.teamName,
    });
    success('Đã phân công môi giới', `Đã giao sản phẩm cho ${agent.fullName}`);
  };

  // Bulk Assign Agent
  const bulkAssignAgent = async (ids: string[], agentId: string): Promise<void> => {
    if (ids.length === 0) return;
    const agent = users.find((u) => u.id === agentId);
    if (!agent) return;
    const now = new Date().toISOString();
    const updatePayload = {
      assignedAgentId: agent.id,
      assignedAgentName: agent.fullName,
      assignedAgentPhone: agent.phone,
      teamId: agent.teamId,
      teamName: agent.teamName,
      updatedAt: now,
    };

    setProperties((prev) =>
      prev.map((p) => (ids.includes(p.id) ? { ...p, ...updatePayload } : p))
    );

    if (isFirebaseConfigured) {
      for (const id of ids) {
        try {
          await updateDoc(doc(db, 'properties', id), updatePayload);
        } catch (err) {
          console.error(err);
        }
      }
    }

    success(`Đã phân công ${ids.length} BĐS`, `Giao cho nhân sự ${agent.fullName}`);
  };

  // Bulk Delete Properties
  const bulkDeleteProperties = async (ids: string[], reason = 'Xóa hàng loạt'): Promise<void> => {
    if (ids.length === 0) return;
    const now = new Date().toISOString();
    const updatePayload = {
      isDeleted: true,
      deletedAt: now,
      deletedBy: currentUser?.id,
      deleteReason: reason,
    };

    setProperties((prev) =>
      prev.map((p) => (ids.includes(p.id) ? { ...p, ...updatePayload } : p))
    );

    if (isFirebaseConfigured) {
      for (const id of ids) {
        try {
          await updateDoc(doc(db, 'properties', id), updatePayload);
        } catch (err) {
          console.error(err);
        }
      }
    }

    info(`Đã chuyển ${ids.length} BĐS vào thùng rác`, 'Bạn có thể khôi phục bất cứ lúc nào.');
  };

  // User management (Firestore synced)
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

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'users', newId), newUser);
      } catch (err) {
        console.error(err);
      }
    }

    setUsers((prev) => [newUser, ...prev]);
    success('Tạo tài khoản thành công', `Đã thêm nhân viên ${newUser.fullName} (${newUser.employeeCode})`);
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

  const toggleUserStatus = async (id: string): Promise<void> => {
    const user = users.find((u) => u.id === id);
    if (!user) return;
    const newStatus = user.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    await updateUser(id, { status: newStatus });
    info(newStatus === 'ACTIVE' ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản', user.fullName);
  };

  // Team management (Firestore synced)
  const addTeam = async (teamData: Omit<Team, 'id' | 'createdAt' | 'memberIds'>): Promise<Team> => {
    const newId = `team_${Date.now()}`;
    const now = new Date().toISOString();
    const leader = users.find((u) => u.id === teamData.leaderId);

    const newTeam: Team = {
      ...teamData,
      id: newId,
      leaderName: leader?.fullName,
      memberIds: teamData.leaderId ? [teamData.leaderId] : [],
      createdAt: now,
    };

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'teams', newId), newTeam);
      } catch (err) {
        console.error(err);
      }
    }

    setTeams((prev) => [...prev, newTeam]);
    success('Tạo nhóm thành công', `Đã tạo nhóm ${newTeam.name}`);
    return newTeam;
  };

  const updateTeam = async (id: string, teamData: Partial<Team>): Promise<void> => {
    const leader = teamData.leaderId ? users.find((u) => u.id === teamData.leaderId) : undefined;
    const now = new Date().toISOString();
    setTeams((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              ...teamData,
              leaderName: leader ? leader.fullName : t.leaderName,
              updatedAt: now,
            }
          : t
      )
    );
    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'teams', id), { ...teamData, updatedAt: now });
      } catch (err) {
        console.error(err);
      }
    }
    success('Cập nhật nhóm thành công');
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
    info('Đã xóa nhóm');
  };

  // Customer Management (Firestore synced)
  const addCustomer = async (customerData: Omit<Customer, 'id' | 'code' | 'createdAt' | 'updatedAt'>): Promise<Customer> => {
    const newId = `cust_${Date.now()}`;
    const newCode = `KH-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();
    const newCust: Customer = {
      ...customerData,
      id: newId,
      code: newCode,
      createdAt: now,
      updatedAt: now,
    };

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'customers', newId), newCust);
      } catch (err) {
        console.error(err);
      }
    }

    setCustomers((prev) => [newCust, ...prev]);
    success('Thêm khách hàng thành công', `Đã tạo khách hàng mã ${newCode}`);
    return newCust;
  };

  const updateCustomer = async (id: string, data: Partial<Customer>): Promise<void> => {
    const now = new Date().toISOString();
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data, updatedAt: now } : c))
    );
    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'customers', id), { ...data, updatedAt: now });
      } catch (err) {
        console.error(err);
      }
    }
    success('Cập nhật khách hàng thành công');
  };

  const deleteCustomer = async (id: string): Promise<void> => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'customers', id));
      } catch (err) {
        console.error(err);
      }
    }
    info('Đã xóa khách hàng');
  };

  // Appointment Management (Firestore synced)
  const addAppointment = async (appointmentData: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment> => {
    const newId = `apt_${Date.now()}`;
    const now = new Date().toISOString();
    const newApt: Appointment = {
      ...appointmentData,
      id: newId,
      createdAt: now,
    };

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'appointments', newId), newApt);
      } catch (err) {
        console.error(err);
      }
    }

    setAppointments((prev) => [newApt, ...prev]);
    success('Đã lên lịch hẹn', newApt.title);
    return newApt;
  };

  const updateAppointment = async (id: string, data: Partial<Appointment>): Promise<void> => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...data } : a))
    );
    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'appointments', id), data);
      } catch (err) {
        console.error(err);
      }
    }
    success('Cập nhật lịch hẹn thành công');
  };

  // Filtered Properties Computation
  const filteredProperties = properties.filter((prop) => {
    if (prop.isDeleted) return false;

    if (filterState.searchQuery) {
      const q = filterState.searchQuery.toLowerCase().trim();
      const matchCode = prop.code?.toLowerCase().includes(q);
      const matchTitle = prop.title?.toLowerCase().includes(q);
      const matchAddress = prop.address?.toLowerCase().includes(q);
      const matchOwner = prop.ownerName?.toLowerCase().includes(q) || prop.ownerPhone?.includes(q);
      const matchLot = prop.cadastralLotNumber?.toLowerCase().includes(q) || prop.cadastralSheetNumber?.toLowerCase().includes(q);
      if (!matchCode && !matchTitle && !matchAddress && !matchOwner && !matchLot) {
        return false;
      }
    }

    if (filterState.transactionType && filterState.transactionType !== 'ALL') {
      if (filterState.transactionType === 'SALE' && prop.transactionType !== 'SALE' && prop.transactionType !== 'SALE_AND_RENT') return false;
      if (filterState.transactionType === 'RENT' && prop.transactionType !== 'RENT' && prop.transactionType !== 'SALE_AND_RENT') return false;
      if (filterState.transactionType === 'TRANSFER' && prop.transactionType !== 'TRANSFER') return false;
    }

    if (filterState.propertyType && filterState.propertyType !== 'ALL') {
      if (prop.propertyType !== filterState.propertyType) return false;
    }

    if (filterState.city && filterState.city !== 'ALL') {
      if (!prop.city?.includes(filterState.city)) return false;
    }

    if (filterState.district && filterState.district !== 'ALL') {
      if (!prop.district?.includes(filterState.district)) return false;
    }

    if (filterState.status && filterState.status !== 'ALL') {
      if (prop.status !== filterState.status) return false;
    }

    if (filterState.direction && filterState.direction !== 'ALL') {
      if (prop.direction !== filterState.direction) return false;
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
        isLoading,
        filterState,
        setFilterState,
        resetFilters,
        filteredProperties,
        addProperty,
        updateProperty,
        deleteProperty,
        restoreProperty,
        updatePropertyStatus,
        assignPropertyAgent,
        bulkUpdateStatus,
        bulkAssignAgent,
        bulkDeleteProperties,
        checkDuplicateProperty,
        addUser,
        updateUser,
        toggleUserStatus,
        addTeam,
        updateTeam,
        deleteTeam,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addAppointment,
        updateAppointment,
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
