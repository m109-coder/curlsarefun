import { SalonLocation } from '@/types';
import { getServiceCatalogByLocation } from '@/data/services';

/**
 * Static catalog of salon locations.
 *
 * @remarks
 * `businessHours` here is **informational only** (display/config reference).
 * The authoritative availability rules live in
 * `src/lib/booking/timezone.ts#getLocationShiftsForDate`, because Boston's
 * "first/last Mon or Sun of the month" rule cannot be expressed in a static
 * weekday table. Keep both in sync when changing hours.
 */
export const salonLocations: SalonLocation[] = [
  {
    id: 'new-york',
    name: 'New York',
    timezone: 'America/New_York',
    address: '269 W 39th street, 7th Floor, New York, NY 10018',
    phone: '917-932-4459',
    email: 'ny@curlsarefun.com',
    coordinates: {
      lat: 40.7568,
      lng: -73.9903,
    },
    businessHours: {
      monday: { closed: true, shifts: [] },
      tuesday: { closed: true, shifts: [] },
      wednesday: { closed: false, shifts: [{ open: '12:00', close: '15:00' }] },
      thursday: { closed: false, shifts: [{ open: '10:00', close: '18:00' }] },
      friday: { closed: false, shifts: [{ open: '10:00', close: '12:00' }, { open: '16:00', close: '18:00' }] },
      saturday: { closed: false, shifts: [{ open: '09:00', close: '15:00' }] },
      sunday: { closed: true, shifts: [] },
    },
    services: getServiceCatalogByLocation('new-york'),
  },
  {
    id: 'boston',
    name: 'Boston',
    timezone: 'America/New_York',
    address: 'PHATOS SALON, 270 Newbury Street, Boston, MA 02116',
    phone: '917-932-4459',
    email: 'boston@curlsarefun.com',
    coordinates: {
      lat: 42.3472,
      lng: -71.0895,
    },
    businessHours: {
      monday: { closed: false, shifts: [{ open: '09:00', close: '17:00' }] },
      tuesday: { closed: false, shifts: [{ open: '09:00', close: '17:00' }] },
      wednesday: { closed: false, shifts: [{ open: '09:00', close: '17:00' }] },
      thursday: { closed: false, shifts: [{ open: '09:00', close: '17:00' }] },
      friday: { closed: false, shifts: [{ open: '09:00', close: '17:00' }] },
      saturday: { closed: true, shifts: [] },
      sunday: { closed: true, shifts: [] },
    },
    services: getServiceCatalogByLocation('boston'),
  },
  {
    id: 'los-angeles',
    name: 'Los Angeles',
    timezone: 'America/Los_Angeles',
    address: 'STUDIO 210, 11677 San Vicente Blvd # 210, Los Angeles, CA 90049',
    phone: '310-714-1732',
    email: 'la@curlsarefun.com',
    coordinates: {
      lat: 34.0522,
      lng: -118.4242,
    },
    businessHours: {
      monday: { closed: true, shifts: [] },
      tuesday: { closed: true, shifts: [] },
      wednesday: { closed: true, shifts: [] },
      thursday: { closed: true, shifts: [] },
      friday: { closed: false, shifts: [{ open: '09:00', close: '17:00' }] },
      saturday: { closed: false, shifts: [{ open: '09:00', close: '17:00' }] },
      sunday: { closed: false, shifts: [{ open: '09:00', close: '17:00' }] },
    },
    services: getServiceCatalogByLocation('los-angeles'),
  },
];

/** Looks up a location by its slug id (`new-york` | `boston` | `los-angeles`). */
export function getLocationById(id: string): SalonLocation | undefined {
  return salonLocations.find(loc => loc.id === id);
}

/**
 * Returns the IANA timezone for a location, defaulting to
 * `"America/New_York"` when the id is unknown — a safe default because two of
 * the three salons are on Eastern Time.
 */
export function getLocationTimezone(id: string): string {
  const location = getLocationById(id);
  return location?.timezone || 'America/New_York';
}
