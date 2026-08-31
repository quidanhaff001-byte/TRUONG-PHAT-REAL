import { Property, Customer, LocationItem } from '../types';
import { MASTER_LOCATIONS, findLocationByQuery } from '../data/locationsData';

export interface MigrationResult {
  totalProcessed: number;
  migratedCount: number;
  needsReviewCount: number;
  updatedProperties: Property[];
  log: string[];
}

/**
 * Migrate legacy properties to the new An Giang (including former Kiên Giang) location model.
 * Preserves unmatched records by setting migrationStatus: "NEEDS_REVIEW" rather than deleting them.
 */
export function migratePropertiesToNewLocations(
  properties: Property[],
  locationMaster: LocationItem[] = MASTER_LOCATIONS
): MigrationResult {
  let migratedCount = 0;
  let needsReviewCount = 0;
  const log: string[] = [];

  const updatedProperties: Property[] = properties.map((prop) => {
    // If already mapped and active
    if (prop.locationId && prop.migrationStatus === 'COMPLETED') {
      return prop;
    }

    // Try finding matching location from master dataset
    const searchQuery = `${prop.ward || ''} ${prop.district || ''} ${prop.city || ''} ${prop.address || ''}`;
    const matchedList = findLocationByQuery(searchQuery, locationMaster);
    const matchedLoc = matchedList && matchedList.length > 0 ? matchedList[0] : null;

    if (matchedLoc) {
      migratedCount++;
      log.push(`[TỰ ĐỘNG KHỚP] Mã BĐS ${prop.code}: Ghép vào ${matchedLoc.currentName} (${matchedLoc.formerDistrictName})`);
      const formerProv = matchedLoc.formerProvince === 'KIEN_GIANG_OLD' ? 'Kiên Giang' : 'An Giang';
      return {
        ...prop,
        city: 'An Giang',
        locationId: matchedLoc.id,
        formerProvince: formerProv,
        formerDistrictCity: matchedLoc.formerDistrictName,
        currentWardCommune: matchedLoc.currentName,
        migrationStatus: 'COMPLETED' as const,
        migrationNote: `Đã tự động chuẩn hóa theo đơn vị hành chính: ${matchedLoc.currentName} (${matchedLoc.formerDistrictName})`,
      };
    } else {
      needsReviewCount++;
      log.push(`[CẦN KIỂM TRA] Mã BĐS ${prop.code} (${prop.address || prop.district}): Không tìm thấy đơn vị hành chính chuẩn tương ứng.`);
      return {
        ...prop,
        city: prop.city || 'An Giang',
        migrationStatus: 'NEEDS_REVIEW' as const,
        migrationNote: 'Dữ liệu địa chỉ chưa khớp với danh mục hành chính Tỉnh An Giang mới (bao gồm Kiên Giang cũ). Vui lòng chọn lại địa bàn.',
      };
    }
  });

  return {
    totalProcessed: properties.length,
    migratedCount,
    needsReviewCount,
    updatedProperties,
    log,
  };
}
