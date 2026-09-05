/**
 * Firestore Data Sanitizer
 * Duyệt toàn bộ object đệ quy, loại bỏ hoàn toàn các key có giá trị undefined.
 * Chuyển chuỗi rỗng của các trường số thành null hoặc 0 tùy ngữ cảnh.
 * Field không có dữ liệu chuyển về null, không để undefined để tránh:
 * "FirebaseError: Function addDoc/setDoc/updateDoc called with invalid data. Unsupported field value: undefined"
 */

const NUMERIC_FIELDS = new Set([
  'salePrice',
  'rentPriceMonthly',
  'depositMonths',
  'minLeaseTermMonths',
  'transferPrice',
  'monthlyRevenueEstimate',
  'monthlyProfitEstimate',
  'commissionRateSale',
  'commissionRateRentMonths',
  'landArea',
  'usableArea',
  'width',
  'length',
  'floors',
  'bedrooms',
  'bathrooms',
  'roadWidth',
  'budgetMin',
  'budgetMax',
  'minPrice',
  'maxPrice',
  'depositAmount',
  'monthlyRent',
  'totalAmount',
  'commissionAmount',
  'collectedAmount',
  'price',
]);

export function sanitizeFirestoreData<T = any>(obj: T, parentKey = ''): T {
  if (obj === undefined) {
    return null as unknown as T;
  }
  if (obj === null) {
    return null as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => sanitizeFirestoreData(item, parentKey)) as unknown as T;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) {
        // Loại bỏ hoàn toàn các key có giá trị undefined
        continue;
      }
      
      // Chuyển chuỗi rỗng của các trường số thành null
      if (NUMERIC_FIELDS.has(key) && (value === '' || value === null)) {
        cleaned[key] = null;
        continue;
      }

      if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
        cleaned[key] = sanitizeFirestoreData(value, key);
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned as T;
  }
  return obj;
}

export const cleanUndefined = sanitizeFirestoreData;
export const sanitizeForFirestore = sanitizeFirestoreData;
