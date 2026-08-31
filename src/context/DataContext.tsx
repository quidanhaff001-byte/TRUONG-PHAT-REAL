import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Property,
  User,
  Team,
  PropertyFilterState,
  TransactionType,
  PropertyStatus,
  Customer,
  CustomerInteraction,
  Appointment,
  AuditLog,
} from '../types';
import { SAMPLE_PROPERTIES, SAMPLE_USERS, SAMPLE_TEAMS, SAMPLE_CUSTOMERS, SAMPLE_APPOINTMENTS } from '../data/sampleData';
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
  deleteCustomer: (id: string, reason?: string) => Promise<void>;
  restoreCustomer: (id: string) => Promise<void>;
  permanentDeleteCustomer: (id: string) => Promise<void>;
  addCustomerInteraction: (customerId: string, interaction: Omit<CustomerInteraction, 'id' | 'createdAt'>) => Promise<void>;
  assignCustomerAgent: (customerId: string, agentId: string, transferNote?: string) => Promise<void>;
  bulkAssignCustomerAgent: (customerIds: string[], agentId: string) => Promise<void>;
  bulkUpdateCustomerStatus: (customerIds: string[], status: Customer['status']) => Promise<void>;
  bulkDeleteCustomers: (customerIds: string[], reason?: string) => Promise<void>;
  checkDuplicateCustomerPhone: (phone: string, excludeId?: string) => DuplicateCustomerCheckResult;

  // Appointment Actions
  addAppointment: (appointmentData: Omit<Appointment, 'id' | 'createdAt'>) => Promise<Appointment>;
  updateAppointment: (id: string, data: Partial<Appointment>) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  
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
  const [customers, setCustomers] = useState<Customer[]>(SAMPLE_CUSTOMERS);
  const [appointments, setAppointments] = useState<Appointment[]>(SAMPLE_APPOINTMENTS);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterState, setFilterState] = useState<PropertyFilterState>(defaultFilterState);

  // Helper to seed initial sample data into Firestore
  const seedInitialDataToFirestore = async (forceCleanOld: boolean = false) => {
    if (!isFirebaseConfigured) return;
    try {
      if (forceCleanOld) {
        // Clean out old stale collections before seeding
        const collectionsToClear = ['properties', 'users', 'teams', 'customers', 'appointments'];
        for (const colName of collectionsToClear) {
          const snap = await getDocs(collection(db, colName));
          for (const docItem of snap.docs) {
            await deleteDoc(doc(db, colName, docItem.id));
          }
        }
      }

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
      // Seed customers
      for (const c of SAMPLE_CUSTOMERS) {
        await setDoc(doc(db, 'customers', c.id), c, { merge: true });
      }
      // Seed appointments
      for (const a of SAMPLE_APPOINTMENTS) {
        await setDoc(doc(db, 'appointments', a.id), a, { merge: true });
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
    setCustomers(SAMPLE_CUSTOMERS);
    setAppointments(SAMPLE_APPOINTMENTS);
    seedInitialDataToFirestore(true);
    success('Đã nạp lại dữ liệu An Giang mới', 'Dữ liệu bất động sản, khách hàng và nhân sự An Giang đã được cập nhật.');
  };

  // Duplicate Check logic for Properties
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

      if (
        (p1 && p1 === cleanInput) ||
        (p2 && p2 === cleanInput) ||
        (pZalo && pZalo === cleanInput)
      ) {
        return {
          isDuplicate: true,
          matchedCustomer: cust,
          message: `Số điện thoại ${phone} đã tồn tại trên hệ thống thuộc về khách hàng "${cust.fullName}" (${cust.code}) do môi giới "${cust.assignedAgentName || 'Hệ thống'}" phụ trách.`,
        };
      }
    }

    return { isDuplicate: false };
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
    const count = customers.length + 1;
    const newCode = `KH-${String(count).padStart(6, '0')}`;
    const now = new Date().toISOString();

    const assignedAgent = users.find((u) => u.id === customerData.assignedAgentId);
    const team = teams.find((t) => t.id === (customerData.teamId || assignedAgent?.teamId));

    const newCust: Customer = {
      ...customerData,
      id: newId,
      code: newCode,
      assignedAgentName: assignedAgent ? assignedAgent.fullName : customerData.assignedAgentName || 'Chưa phân công',
      assignedAgentPhone: assignedAgent ? assignedAgent.phone : undefined,
      teamId: team?.id || customerData.teamId,
      teamName: team?.name || customerData.teamName,
      interactionLogs: customerData.interactionLogs || [],
      isDeleted: false,
      createdAt: now,
      createdBy: currentUser?.id || 'anonymous',
      createdByName: currentUser?.fullName || 'Người dùng',
      updatedAt: now,
      updatedBy: currentUser?.id,
    };

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'customers', newId), newCust);
      } catch (err) {
        console.error('Add customer to Firestore error:', err);
      }
    }

    setCustomers((prev) => [newCust, ...prev]);
    success('Thêm khách hàng thành công', `Đã tạo khách hàng mã ${newCode} (${newCust.fullName})`);
    return newCust;
  };

  const updateCustomer = async (id: string, data: Partial<Customer>): Promise<void> => {
    const now = new Date().toISOString();
    let updatedObj: Customer | null = null;

    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const assignedAgent = data.assignedAgentId ? users.find((u) => u.id === data.assignedAgentId) : undefined;
          const team = data.teamId ? teams.find((t) => t.id === data.teamId) : undefined;

          updatedObj = {
            ...c,
            ...data,
            assignedAgentName: assignedAgent ? assignedAgent.fullName : (data.assignedAgentName !== undefined ? data.assignedAgentName : c.assignedAgentName),
            assignedAgentPhone: assignedAgent ? assignedAgent.phone : c.assignedAgentPhone,
            teamName: team ? team.name : (data.teamName !== undefined ? data.teamName : c.teamName),
            updatedAt: now,
            updatedBy: currentUser?.id,
          };
          return updatedObj;
        }
        return c;
      })
    );

    if (isFirebaseConfigured && updatedObj) {
      try {
        await updateDoc(doc(db, 'customers', id), updatedObj as any);
      } catch (err) {
        console.error('Update customer in Firestore error:', err);
      }
    }
    success('Cập nhật khách hàng thành công', 'Thông tin khách hàng đã được lưu.');
  };

  // Customer Soft Delete
  const deleteCustomer = async (id: string, reason = 'Xóa vào thùng rác'): Promise<void> => {
    const now = new Date().toISOString();
    const updateData = {
      isDeleted: true,
      deletedAt: now,
      deletedBy: currentUser?.id,
      deleteReason: reason,
    };

    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updateData } : c))
    );

    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'customers', id), updateData);
      } catch (err) {
        console.error('Soft delete customer error:', err);
      }
    }

    info('Đã chuyển khách hàng vào thùng rác', 'Bạn có thể khôi phục lại bất kỳ lúc nào.');
  };

  // Customer Restore
  const restoreCustomer = async (id: string): Promise<void> => {
    const updateData = {
      isDeleted: false,
      deletedAt: undefined,
      deletedBy: undefined,
      deleteReason: undefined,
    };

    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updateData } : c))
    );

    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'customers', id), updateData as any);
      } catch (err) {
        console.error('Restore customer error:', err);
      }
    }

    success('Khôi phục khách hàng thành công', 'Khách hàng đã trở lại danh sách hoạt động.');
  };

  // Permanent Delete Customer
  const permanentDeleteCustomer = async (id: string): Promise<void> => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'customers', id));
      } catch (err) {
        console.error('Permanent delete customer error:', err);
      }
    }
    info('Đã xóa vĩnh viễn khách hàng');
  };

  // Add Interaction Log to Customer
  const addCustomerInteraction = async (
    customerId: string,
    interaction: Omit<CustomerInteraction, 'id' | 'createdAt'>
  ): Promise<void> => {
    const targetCust = customers.find((c) => c.id === customerId);
    if (!targetCust) return;

    const newLogId = `log_${Date.now()}`;
    const now = new Date().toISOString();
    const newLog: CustomerInteraction = {
      ...interaction,
      id: newLogId,
      createdAt: now,
    };

    const updatedLogs = [newLog, ...(targetCust.interactionLogs || [])];
    const updatePayload: Partial<Customer> = {
      interactionLogs: updatedLogs,
      updatedAt: now,
    };

    if (interaction.nextActionDate) {
      updatePayload.nextAppointmentDate = interaction.nextActionDate;
      updatePayload.nextAppointmentNote = interaction.nextActionNote || interaction.title;
    }

    await updateCustomer(customerId, updatePayload);
    success('Đã lưu nhật ký chăm sóc', `${interaction.title} (${newLog.agentName})`);
  };

  // Assign Customer to Agent
  const assignCustomerAgent = async (customerId: string, agentId: string, transferNote?: string): Promise<void> => {
    const agent = users.find((u) => u.id === agentId);
    if (!agent) return;
    const targetCust = customers.find((c) => c.id === customerId);
    const now = new Date().toISOString();

    const transferLog: CustomerInteraction = {
      id: `log_${Date.now()}`,
      date: now,
      type: 'NOTE',
      title: `Chuyển người phụ trách sang ${agent.fullName}`,
      content: transferNote || `Chuyển giao khách hàng từ ${targetCust?.assignedAgentName || 'Hệ thống'} sang ${agent.fullName}`,
      agentId: currentUser?.id || 'admin',
      agentName: currentUser?.fullName || 'Quản trị viên',
      createdAt: now,
    };

    const updatedLogs = [transferLog, ...(targetCust?.interactionLogs || [])];

    await updateCustomer(customerId, {
      assignedAgentId: agent.id,
      assignedAgentName: agent.fullName,
      assignedAgentPhone: agent.phone,
      teamId: agent.teamId,
      teamName: agent.teamName,
      interactionLogs: updatedLogs,
    });

    success('Đã chuyển người phụ trách', `Giao khách hàng cho ${agent.fullName}`);
  };

  // Bulk Assign Customer Agent
  const bulkAssignCustomerAgent = async (customerIds: string[], agentId: string): Promise<void> => {
    if (customerIds.length === 0) return;
    const agent = users.find((u) => u.id === agentId);
    if (!agent) return;
    const now = new Date().toISOString();

    for (const cid of customerIds) {
      await assignCustomerAgent(cid, agentId, `Chuyển giao hàng loạt sang ${agent.fullName}`);
    }

    success(`Đã phân công ${customerIds.length} khách hàng`, `Giao cho ${agent.fullName}`);
  };

  // Bulk Update Customer Status
  const bulkUpdateCustomerStatus = async (customerIds: string[], status: Customer['status']): Promise<void> => {
    if (customerIds.length === 0) return;
    const now = new Date().toISOString();

    setCustomers((prev) =>
      prev.map((c) => (customerIds.includes(c.id) ? { ...c, status, updatedAt: now } : c))
    );

    if (isFirebaseConfigured) {
      for (const id of customerIds) {
        try {
          await updateDoc(doc(db, 'customers', id), { status, updatedAt: now });
        } catch (err) {
          console.error(err);
        }
      }
    }

    success(`Đã chuyển trạng thái ${customerIds.length} khách hàng`, `Tất cả sang "${status}"`);
  };

  // Bulk Delete Customers
  const bulkDeleteCustomers = async (customerIds: string[], reason = 'Xóa hàng loạt'): Promise<void> => {
    if (customerIds.length === 0) return;
    const now = new Date().toISOString();
    const updatePayload = {
      isDeleted: true,
      deletedAt: now,
      deletedBy: currentUser?.id,
      deleteReason: reason,
    };

    setCustomers((prev) =>
      prev.map((c) => (customerIds.includes(c.id) ? { ...c, ...updatePayload } : c))
    );

    if (isFirebaseConfigured) {
      for (const id of customerIds) {
        try {
          await updateDoc(doc(db, 'customers', id), updatePayload);
        } catch (err) {
          console.error(err);
        }
      }
    }

    info(`Đã chuyển ${customerIds.length} khách hàng vào thùng rác`);
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

  const deleteAppointment = async (id: string): Promise<void> => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
    if (isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'appointments', id));
      } catch (err) {
        console.error(err);
      }
    }
    info('Đã hủy lịch hẹn');
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
        restoreCustomer,
        permanentDeleteCustomer,
        addCustomerInteraction,
        assignCustomerAgent,
        bulkAssignCustomerAgent,
        bulkUpdateCustomerStatus,
        bulkDeleteCustomers,
        checkDuplicateCustomerPhone,
        addAppointment,
        updateAppointment,
        deleteAppointment,
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

