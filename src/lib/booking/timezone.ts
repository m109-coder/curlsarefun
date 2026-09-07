import { DateTime } from 'luxon';
import { getLocationById, getLocationTimezone } from '@/config/locations';

/**
 * Converts a JS `Date` (any timezone) into a Luxon `DateTime` expressed in the
 * salon's local timezone. Every availability/shift computation must happen in
 * salon-local time, because staff schedules are defined by clock time, not by
 * the visitor's device timezone.
 *
 * @param userDate - Date object coming from the client (usually produced by
 *   `date.toISOString()` on the browser).
 * @param locationId - Salon location id used to look up `timezone`.
 * @returns Luxon `DateTime` in the salon timezone.
 */
export function convertToSalonTime(
  userDate: Date,
  locationId: string
): DateTime {
  const salonTimezone = getLocationTimezone(locationId);
  return DateTime.fromJSDate(userDate).setZone(salonTimezone);
}

/**
 * Convierte una fecha/hora del salón a la zona horaria del usuario
 */
export function convertFromSalonTime(
  salonDate: Date,
  locationId: string,
  userTimezone?: string
): DateTime {
  const salonTimezone = getLocationTimezone(locationId);
  const targetTimezone = userTimezone || DateTime.local().zoneName;
  
  return DateTime.fromJSDate(salonDate)
    .setZone(salonTimezone)
    .setZone(targetTimezone);
}

/**
 * Obtiene la zona horaria actual del usuario
 */
export function getUserTimezone(): string {
  return DateTime.local().zoneName;
}

/**
 * Formatea una fecha en la zona horaria del salón
 */
export function formatInSalonTimezone(
  date: Date,
  locationId: string,
  format: string = 'MMMM d, yyyy h:mm a'
): string {
  const salonTime = convertToSalonTime(date, locationId);
  return salonTime.toFormat(format);
}

/**
 * Convierte un string de tiempo 'HH:mm' a minutos desde la medianoche
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convierte minutos desde la medianoche a string 'HH:mm'
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

const BUFFER_MINUTES = 15;
const SLOT_INTERVAL = 15;

interface TimeShift {
  open: string;
  close: string;
}

/**
 * Returns `true` when the given date falls inside one of Boston's operating
 * windows: the first **or** last Monday/Sunday of each month.
 *
 * @remarks
 * The admin decided that Boston only opens on "first/last Mon or Sun" — a
 * business rule that cannot be expressed with a simple weekday map. Keep this
 * helper explicit so a future developer doesn't have to reverse-engineer the
 * day-of-month arithmetic.
 *
 * @param date - Luxon `DateTime` already converted to the salon timezone.
 * @returns `true` if the location should accept appointments on that day.
 */
function isBostonOpenDate(date: DateTime): boolean {
  // Luxon: weekday 1 = Monday, 7 = Sunday
  const isMonday = date.weekday === 1;
  const isSunday = date.weekday === 7;

  if (!isMonday && !isSunday) return false;

  const dayOfMonth = date.day;
  const daysInMonth = date.daysInMonth ?? 31;

  const isFirst = dayOfMonth <= 7;
  const isLast = dayOfMonth + 7 > daysInMonth;

  return isFirst || isLast;
}

/**
 * Resolves the opening shifts of a location for a specific calendar day.
 *
 * @remarks
 * - Returns an array of `{ open, close }` windows in `"HH:mm"` salon-local time.
 * - An empty array means the salon is closed that day — callers should treat
 *   this as "no availability", not as an error.
 * - The weekday map is intentionally written as explicit `switch`/`if` blocks
 *   per location instead of deriving it from `businessHours` in the config.
 *   Boston's rule ("first/last Mon or Sun") is dynamic and cannot be stored in
 *   a static `businessHours` table, so the config field is only informational.
 *
 * @param locationId - `new-york` | `boston` | `los-angeles` (see `src/config/locations.ts`).
 * @param date - Luxon `DateTime` already zoned to the salon timezone.
 * @returns Array of open/close windows for that day.
 */
export function getLocationShiftsForDate(
  locationId: string,
  date: DateTime
): TimeShift[] {
  const location = getLocationById(locationId);
  if (!location) return [];

  const weekday = date.weekday; // 1 = Monday, 7 = Sunday

  // -------------------------------------------------
  // NEW YORK: Wednesday (3), Thursday (4), Friday (5), Saturday (6)
  // -------------------------------------------------
  if (locationId === 'new-york') {
    switch (weekday) {
      case 3:
        return [{ open: '12:00', close: '15:00' }];
      case 4:
        return [{ open: '10:00', close: '18:00' }];
      case 5:
        return [
          { open: '10:00', close: '12:00' },
          { open: '16:00', close: '18:00' },
        ];
      case 6:
        return [{ open: '09:00', close: '15:00' }];
      default:
        return []; // Sunday, Monday, Tuesday closed
    }
  }

  // -------------------------------------------------
  // LOS ANGELES: Friday (5), Saturday (6), Sunday (7)
  // -------------------------------------------------
  if (locationId === 'los-angeles') {
    if (weekday >= 5 && weekday <= 7) {
      return [{ open: '09:00', close: '17:00' }];
    }
    return []; // Monday-Thursday closed
  }

  // -------------------------------------------------
  // BOSTON: dynamic open dates with fixed 9:00 AM - 7:30 PM hours
  // -------------------------------------------------
  if (locationId === 'boston') {
    if (!isBostonOpenDate(date)) return [];
    return [{ open: '09:00', close: '19:30' }];
  }

  return [];
}

/**
 * Fast check used by the `<BookingCalendar>` day grid to disable days where the
 * salon has no operating shifts.
 *
 * @param locationId - Salon location id.
 * @param date - Luxon `DateTime` (callers already pass a salon-zoned value).
 * @returns `true` when at least one shift exists for that day.
 */
export function isLocationOpenOnDate(
  locationId: string,
  date: DateTime
): boolean {
  return getLocationShiftsForDate(locationId, date).length > 0;
}

/**
 * Generates every candidate start time ("HH:mm", salon-local) that can hold an
 * appointment of `serviceDuration` minutes inside the day's shifts.
 *
 * @remarks
 * **Buffer policy:** the 15-minute cleaning buffer is *not* part of this
 * function. We intentionally allow a service to end exactly at `shift.close`
 * (e.g. a 3h service in a 12:00–15:00 shift) — the buffer is only required
 * *between* appointments and is applied by the overlap check in
 * `src/app/api/availability/route.ts` (`slotEnd = start + duration + 15`).
 * Including the buffer here was the cause of the "multi-service shows no
 * slots" bug, because it artificially inflated the required window.
 *
 * @param date - The requested day (any timezone; converted internally).
 * @param locationId - Salon location id.
 * @param serviceDuration - Combined duration of all selected services in
 *   minutes (`service1.duration + service2.duration + ...`, already multiplied
 *   by guest count when applicable).
 * @returns Sorted array of candidate start times, e.g. `["10:00","10:15"]`.
 */
export function generateTimeSlots(
  date: Date,
  locationId: string,
  serviceDuration: number
): string[] {
  const location = getLocationById(locationId);
  if (!location) return [];

  const salonDate = convertToSalonTime(date, locationId);
  const shifts = getLocationShiftsForDate(locationId, salonDate);

  if (shifts.length === 0) return [];

  const slots: string[] = [];

  for (const shift of shifts) {
    const shiftStart = timeToMinutes(shift.open);
    const shiftEnd = timeToMinutes(shift.close);

    // Generate slots every 15 minutes. The service itself must fit inside the shift;
    // the 15-minute cleaning buffer is added when checking conflicts, not here.
    for (
      let current = shiftStart;
      current + serviceDuration <= shiftEnd;
      current += SLOT_INTERVAL
    ) {
      slots.push(minutesToTime(current));
    }
  }

  return slots;
}

/**
 * @deprecated Conflict checking now happens inside
 * `src/app/api/availability/route.ts`, which has access to the database.
 * This helper remains as a placeholder for a future per-slot check that would
 * also need the current booking id to allow rescheduling.
 */
export async function isSlotAvailable(
  date: Date,
  time: string,
  locationId: string,
  serviceId: string
): Promise<boolean> {
  // TODO: Verificar contra citas existentes en Prisma
  // incluyendo el buffer de 15 minutos entre citas.
  return true;
}

/**
 * Computes the appointment end time ("HH:mm") given a start time and the total
 * combined service duration.
 *
 * @remarks
 * This value represents the moment the **services** finish. The 15-minute
 * cleaning buffer is *not* included here: it is only used when evaluating
 * conflicts between appointments. The `Appointment.endTime` stored in the DB
 * equals this value, so downstream code must remember to add `BUFFER_MINUTES`
 * when comparing against other bookings.
 *
 * @param startTime - `"HH:mm"` salon-local start time.
 * @param serviceDuration - Combined duration of all selected services, minutes.
 * @param locationId - Unused today; kept in the signature so future
 *   per-location rounding rules can be introduced without breaking callers.
 * @returns `"HH:mm"` end time (may exceed 24:00 only in invalid input).
 */
export function calculateEndTime(
  startTime: string,
  serviceDuration: number,
  locationId: string
): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + serviceDuration;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}
