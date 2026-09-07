import { DateTime } from 'luxon';
import { isLocationOpenOnDate, generateTimeSlots } from '../src/lib/booking/timezone';

const testDate = DateTime.local(2026, 10, 12, { zone: 'America/New_York' }); // a Monday in October 2026

console.log('Calendar availability test for NY, LA, and Boston\n');

for (let day = 11; day <= 18; day++) {
  const date = testDate.set({ day });
  console.log(`\n${date.toFormat('EEEE, MMMM d, yyyy')}:`);
  for (const locationId of ['new-york', 'los-angeles', 'boston']) {
    const isOpen = isLocationOpenOnDate(locationId, date);
    const slots = isOpen ? generateTimeSlots(date.toJSDate(), locationId, 60) : [];
    console.log(`  ${locationId}: ${isOpen ? 'OPEN' : 'CLOSED'} (${slots.length} slots)`);
  }
}
