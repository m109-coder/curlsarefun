import { DateTime } from 'luxon';
import { isLocationOpenOnDate, generateTimeSlots } from '../src/lib/booking/timezone';

const locationId = 'boston';
const october2026 = DateTime.local(2026, 10, 1, { zone: 'America/New_York' });

console.log('Boston dynamic calendar test for October 2026\n');
console.log('Open dates and available slot counts (service duration 60 min, buffer 15 min):\n');

let openCount = 0;
for (let day = 1; day <= 31; day++) {
  const date = october2026.set({ day });
  const isOpen = isLocationOpenOnDate(locationId, date);
  if (isOpen) {
    openCount++;
    const slots = generateTimeSlots(date.toJSDate(), locationId, 60);
    console.log(`${date.toFormat('EEEE, MMMM d, yyyy')}: ${slots.length} slots (${slots[0]} - ${slots[slots.length - 1]})`);
  }
}

console.log(`\nTotal open days: ${openCount} (expected: 4)`);

console.log('\n--- First open date slots (60 min service) ---');
const firstOpen = DateTime.local(2026, 10, 4, { zone: 'America/New_York' });
console.log(`Date: ${firstOpen.toFormat('EEEE, MMMM d, yyyy')}`);
console.log('Slots:', generateTimeSlots(firstOpen.toJSDate(), locationId, 60));

console.log('\n--- Guest count test: 3 guests x 60 min = 180 min ---');
const slots180 = generateTimeSlots(firstOpen.toJSDate(), locationId, 180);
console.log(`Slots for 3 guests: ${slots180.length} (${slots180[0]} - ${slots180[slots180.length - 1]})`);
console.log('Expected last slot: 16:15 (16:15 + 180 min service = 19:15; + 15 min buffer = 19:30)');
