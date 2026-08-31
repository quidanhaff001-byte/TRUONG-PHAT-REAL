import { TransactionType } from '../types';

/**
 * Vietnam Timezone Constant
 */
export const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Format currency to short Vietnamese readable text (Tỷ, Triệu, Ngàn VNĐ)
 */
export function formatVND(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Chưa có giá';
  if (amount === 0) return '0 VNĐ';

  if (amount >= 1_000_000_000) {
    const ty = amount / 1_000_000_000;
    const formatted = ty % 1 === 0 ? ty.toString() : ty.toFixed(2).replace(/\.?0+$/, '');
    return `${formatted} tỷ`;
  }
  if (amount >= 1_000_000) {
    const tr = amount / 1_000_000;
    const formatted = tr % 1 === 0 ? tr.toString() : tr.toFixed(1).replace(/\.?0+$/, '');
    return `${formatted} triệu`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)} ngàn VNĐ`;
  }
  return `${amount.toLocaleString('vi-VN')} VNĐ`;
}

export const formatCurrency = formatVND;

/**
 * Format exact Vietnamese currency with thousands separator
 */
export function formatVNDFull(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 VNĐ';
  return `${amount.toLocaleString('vi-VN')} VNĐ`;
}

/**
 * Format land or usable area in square meters (m²)
 */
export function formatArea(area?: number | null): string {
  if (!area || isNaN(area)) return '— m²';
  return `${area.toLocaleString('vi-VN')} m²`;
}

/**
 * Format width x length dimensions
 */
export function formatDimensions(width?: number | null, length?: number | null): string {
  if (!width && !length) return '—';
  if (width && !length) return `Ngang ${width}m`;
  if (!width && length) return `Dài ${length}m`;
  return `${width}m × ${length}m`;
}

/**
 * Format date in Asia/Ho_Chi_Minh timezone to dd/MM/yyyy
 */
export function formatDate(dateString?: string | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: VIETNAM_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

/**
 * Format date & time in Asia/Ho_Chi_Minh timezone to HH:mm dd/MM/yyyy
 */
export function formatDateTime(dateString?: string | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: VIETNAM_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour12: false,
    }).format(d);
  } catch {
    return dateString;
  }
}

export const formatDateVN = formatDateTime;

/**
 * Get date string in Asia/Ho_Chi_Minh timezone formatted as YYYY-MM-DD
 */
export function getVietnamDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Appointment Status Classification for Asia/Ho_Chi_Minh timezone
 */
export type AppointmentStatusClassification = 'TODAY' | 'UPCOMING' | 'OVERDUE' | 'NONE';

export interface AppointmentAnalysis {
  status: AppointmentStatusClassification;
  label: string;
  badgeClass: string;
  isUpcomingOrToday: boolean;
  formattedDateTime: string;
}

/**
 * Classifies an appointment date relative to current time in Asia/Ho_Chi_Minh timezone
 * - TODAY: Scheduled for today's calendar date
 * - UPCOMING: Strictly in future calendar dates
 * - OVERDUE: In the past (past calendar date) - Excluded from upcoming appointment counts
 */
export function classifyAppointment(appointmentIso?: string | null): AppointmentAnalysis {
  if (!appointmentIso) {
    return {
      status: 'NONE',
      label: 'Chưa đặt lịch',
      badgeClass: 'text-slate-400',
      isUpcomingOrToday: false,
      formattedDateTime: '—',
    };
  }

  try {
    const aptDate = new Date(appointmentIso);
    if (isNaN(aptDate.getTime())) {
      return {
        status: 'NONE',
        label: 'Không hợp lệ',
        badgeClass: 'text-slate-400',
        isUpcomingOrToday: false,
        formattedDateTime: appointmentIso,
      };
    }

    const todayVN = getVietnamDateString(new Date());
    const aptVN = getVietnamDateString(aptDate);
    const formattedDateTime = formatDateTime(appointmentIso);

    // If appointment is on today's calendar date in Vietnam
    if (aptVN === todayVN) {
      return {
        status: 'TODAY',
        label: 'Lịch hôm nay',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
        isUpcomingOrToday: true,
        formattedDateTime,
      };
    }

    // If appointment is in future calendar dates
    if (aptVN > todayVN) {
      return {
        status: 'UPCOMING',
        label: 'Sắp tới',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 font-semibold',
        isUpcomingOrToday: true,
        formattedDateTime,
      };
    }

    // If appointment date was in past calendar dates
    return {
      status: 'OVERDUE',
      label: 'Quá hạn / Đã qua',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-medium',
      isUpcomingOrToday: false,
      formattedDateTime,
    };
  } catch {
    return {
      status: 'NONE',
      label: 'Chưa đặt lịch',
      badgeClass: 'text-slate-400',
      isUpcomingOrToday: false,
      formattedDateTime: '—',
    };
  }
}

/**
 * Mask sensitive phone number for unauthorized agents (e.g. 0908123456 -> 0908 *** 456)
 */
export function maskPhone(phone?: string | null, canViewFull: boolean = false): string {
  if (!phone) return '—';
  if (canViewFull) return phone;
  const clean = phone.replace(/\s+/g, '');
  if (clean.length < 7) return '******';
  const prefix = clean.slice(0, 4);
  const suffix = clean.slice(-3);
  return `${prefix} *** ${suffix}`;
}

export const maskPhoneNumber = maskPhone;

/**
 * Format relative date (Hôm nay, Hôm qua, X ngày trước) in Asia/Ho_Chi_Minh
 */
export function formatRelativeDate(dateString?: string | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const todayVN = getVietnamDateString(new Date());
    const targetVN = getVietnamDateString(d);

    if (targetVN === todayVN) return 'Hôm nay';

    const now = new Date();
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 30) return `${diffDays} ngày trước`;
    return formatDate(dateString);
  } catch {
    return formatDate(dateString);
  }
}

/**
 * Auto generate Property Code
 */
export function generatePropertyCode(type: TransactionType, sequence: number): string {
  const pad = String(sequence).padStart(6, '0');
  switch (type) {
    case 'SALE':
      return `BDS-${pad}`;
    case 'RENT':
      return `THUE-${pad}`;
    case 'TRANSFER':
      return `SN-${pad}`;
    case 'SALE_AND_RENT':
      return `BR-${pad}`;
    default:
      return `BDS-${pad}`;
  }
}

