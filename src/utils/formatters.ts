import { TransactionType } from '../types';

/**
 * Format currency to short Vietnamese readable text (Tỷ, Triệu, Ngàn VNĐ)
 */
export function formatVND(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Chưa có giá';
  if (amount === 0) return '0 VNĐ';

  if (amount >= 1_000_000_000) {
    const ty = amount / 1_000_000_000;
    // If exact integer or clean decimal
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
 * Format date to dd/MM/yyyy
 */
export function formatDate(dateString?: string | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}

/**
 * Format date & time to HH:mm dd/MM/yyyy
 */
export function formatDateTime(dateString?: string | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  } catch {
    return dateString;
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
export const formatDateVN = formatDateTime;

/**
 * Format relative date (Hôm nay, Hôm qua, X ngày trước)
 */
export function formatRelativeDate(dateString?: string | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hôm nay';
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
