import { DateTime } from 'luxon';
import { getLocationById, getLocationTimezone } from '@/config/locations';

/**
 * Convierte una fecha/hora del usuario a la zona horaria del salón
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
 * Determina si una fecha específica es un día operativo para Boston.
 * Boston abre únicamente el primer y último domingo y lunes de cada mes.
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
 * Devuelve los turnos operativos para una locación en una fecha específica.
 * Usa lógica explícita por locación, sin depender de mapeos de strings de días.
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
 * Verifica si una locación está abierta en una fecha específica.
 */
export function isLocationOpenOnDate(
  locationId: string,
  date: DateTime
): boolean {
  return getLocationShiftsForDate(locationId, date).length > 0;
}

/**
 * Genera slots de tiempo disponibles para un día y locación específicos.
 * Respete los turnos del día, el buffer de limpieza de 15 minutos,
 * y la duración total del servicio.
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
 * Verifica si un slot está disponible considerando citas existentes.
 * Por ahora permite todos los slots generados; aquí se conectaría con Prisma.
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
 * Calcula la hora de fin basada en la duración del servicio
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
