export interface ServiceData {
  slug: string;
  name: string;
  durationMinutes: number;
  price: number;
  depositAmount: number;
  category: string;
}

function buildService(
  slug: string,
  name: string,
  durationMinutes: number,
  price: number,
  depositAmount: number,
  category: string
): ServiceData {
  return { slug, name, durationMinutes, price, depositAmount, category };
}

// ---------------------------------------------------------------------------
// New York catalog (original catalog provided earlier)
// ---------------------------------------------------------------------------
export const newYorkServices: ServiceData[] = [
  // Cuidado del Cabello
  buildService('conditioning-treatment-long-hair', 'Conditioning Treatment for long hair with sunflow', 60, 110.00, 25.00, 'care'),
  buildService('conditioning-treatment-short-hair', 'Conditioning Treatment for short hair with sunflow', 60, 85.00, 25.00, 'care'),
  buildService('curly-set', 'Curly Set', 60, 100.00, 25.00, 'care'),
  buildService('detangling', 'Detangling', 60, 100.00, 25.00, 'care'),

  // Hair Color
  buildService('consultation', 'Consultation', 15, 65.00, 0.00, 'color'),
  buildService('full-head-highlights', 'Full Head Highlights', 90, 275.00, 50.00, 'color'),
  buildService('gloss-glaze-short-hair', 'Gloss/ Glaze fpr short hair', 30, 90.00, 25.00, 'color'),
  buildService('gloss-glaze-long-hair', 'Gloss/Glaze for long hair', 30, 110.00, 25.00, 'color'),
  buildService('mini-single-process-hairline-touch-up', 'Mini Single Process Hairline Touch-Up', 30, 90.00, 25.00, 'color'),
  buildService('partial-highlights', 'Partial Highlights', 90, 225.00, 50.00, 'color'),
  buildService('partial-highlights-mini-single-hairline', 'Partial Highlights & Mini single Hairline Touch...', 90, 315.00, 50.00, 'color'),
  buildService('single-process-color', 'Single Process Color', 30, 135.00, 35.00, 'color'),
  buildService('single-process-full-highlights', 'Single Process with Full Highlits', 90, 410.00, 75.00, 'color'),
  buildService('single-process-partial-highlights', 'Single Process with Partial Highlights', 90, 360.00, 70.00, 'color'),
  buildService('top-highlights', 'Top Highlights', 30, 165.00, 35.00, 'color'),
  buildService('top-highlights-mini-single-hairline', 'Top Highlights & Mini single Hairline Touch-up', 60, 255.00, 50.00, 'color'),

  // Haircuts
  buildService('men-hair-cut', 'Men Hair Cut', 60, 185.00, 35.00, 'haircuts'),
  buildService('bang-trim', 'Bang Trim', 15, 25.00, 0.00, 'haircuts'),
  buildService('dry-cut-full-highlights', 'Dry Cut & Full Highlights', 90, 515.00, 100.00, 'haircuts'),
  buildService('dry-cut-mini-single-process-hairline-touchup', 'Dry Cut & Mini Single Process Hairline Touchup', 60, 340.00, 70.00, 'haircuts'),
  buildService('dry-cut-partial-highlights', 'Dry Cut and Partial Highlights', 90, 475.00, 95.00, 'haircuts'),
  buildService('dry-cut-single-process', 'Dry Cut and Single Process', 60, 385.00, 75.00, 'haircuts'),
  buildService('dry-cut-top-highlights', 'Dry Cut and Top Highlights', 60, 415.00, 80.00, 'haircuts'),
  buildService('womad-drycut-mini-hairline-touchup-variant-a', 'Womad DryCut, Mini Hair Line Touch-up and ...', 90, 610.00, 120.00, 'haircuts'),
  buildService('womad-drycut-mini-hairline-touchup-variant-b', 'Womad DryCut, Mini Hair Line Touch-up and ...', 90, 560.00, 110.00, 'haircuts'),
  buildService('woman-dry-cut', 'Woman Dry Cut', 60, 250.00, 50.00, 'haircuts'),

  // Salón
  buildService('airbrush-makeup', 'Airbrush Makeup', 60, 150.00, 50.00, 'salon'),
  buildService('makeup-lesson', 'Makeup Lesson', 60, 200.00, 50.00, 'salon'),
  buildService('tip', 'Tip', 5, 0.00, 0.00, 'salon'),
  buildService('wedding-deposit', 'Wedding Deposit', 60, 300.00, 300.00, 'salon'),
  buildService('wedding-hair-trial', 'Wedding Hair Trial', 60, 300.00, 100.00, 'salon'),
];

// ---------------------------------------------------------------------------
// Boston catalog (exclusive Boston services and prices)
// ---------------------------------------------------------------------------
export const bostonServices: ServiceData[] = [
  // Eventos
  buildService('special-guest-loraine-book-sign', 'Special Guest (Loraine Book Sign)', 5, 25.00, 0.00, 'events'),

  // Cuidado del Cabello
  buildService('dry-cut-mini-single-hailine-touch-up', 'Dry cut $ Mini Single Hailine Touc-up', 60, 285.00, 50.00, 'care'),

  // Hair Color
  buildService('double-process-color', 'Double Process Color', 90, 350.00, 70.00, 'color'),
  buildService('full-highlights', 'Full Highlights', 90, 275.00, 50.00, 'color'),
  buildService('gloss-glaze-short-hair', 'Gloss/ Glaze fpr short hair', 30, 70.00, 20.00, 'color'),
  buildService('gloss-glaze-long-hair', 'Gloss/Glaze for long hair', 30, 95.00, 25.00, 'color'),
  buildService('mini-single-process-hairline-touch-up', 'Mini Single Process Hairline Touch-Up', 30, 90.00, 25.00, 'color'),
  buildService('partial-highlights', 'Partial Highlights', 60, 200.00, 40.00, 'color'),
  buildService('partial-highlights-mini-single-hairline', 'Partial Highlights & Mini single Hairline Touch-up', 60, 290.00, 50.00, 'color'),
  buildService('single-process-color', 'Single Process Color', 30, 135.00, 35.00, 'color'),
  buildService('single-process-with-full-highlights', 'Single Process with Full Highlights', 90, 410.00, 80.00, 'color'),
  buildService('single-process-with-partial-highlights', 'Single Process with Partial Highlights', 90, 335.00, 70.00, 'color'),
  buildService('single-process-with-top-highlights', 'Single Process with Top Highlights', 60, 300.00, 60.00, 'color'),
  buildService('top-highlights', 'Top Highlights', 30, 165.00, 35.00, 'color'),
  buildService('top-highlights-mini-single-hairline', 'Top highlights & Mini Single Hairline Touch- up', 60, 255.00, 50.00, 'color'),
  buildService('top-highlights-single-process-woman-dry-cut', 'Top Highlights & Single Process &Woman Dry Cut', 90, 450.00, 90.00, 'color'),

  // Hair Styling
  buildService('conditioning-treatment-long-hair', 'Conditioning Treatment for long hair', 30, 75.00, 20.00, 'styling'),
  buildService('conditioning-treatment-short-hair', 'Conditioning Treatment for short hair', 30, 45.00, 15.00, 'styling'),
  buildService('curly-set', 'Curly Set', 30, 120.00, 30.00, 'styling'),
  buildService('detangling', 'Detangling', 60, 120.00, 30.00, 'styling'),

  // Haircuts
  buildService('bang-trim', 'Bang Trim', 15, 25.00, 0.00, 'haircuts'),
  buildService('childrens-cut', 'Childrens Cut', 60, 120.00, 25.00, 'haircuts'),
  buildService('curly-men-dry-cut', 'Curly Men Dry Cut', 60, 185.00, 35.00, 'haircuts'),
  buildService('dry-cut-double-process', 'Dry Cut & Double Process', 120, 545.00, 110.00, 'haircuts'),
  buildService('dry-cut-full-highlights', 'Dry Cut & Full Highlights', 60, 470.00, 95.00, 'haircuts'),
  buildService('dry-cut-partial-highlights', 'Dry Cut and Partial Highlights', 60, 395.00, 80.00, 'haircuts'),
  buildService('dry-cut-single-process', 'Dry Cut and Single Process', 60, 330.00, 65.00, 'haircuts'),
  buildService('dry-cut-top-highlights', 'Dry Cut and Top Highlights', 60, 360.00, 70.00, 'haircuts'),
  buildService('dry-cut-mini-single-hairline-full-high', 'Dry Cut with Mini single hairline and Full High', 60, 560.00, 110.00, 'haircuts'),
  buildService('dry-cut-mini-single-hairline-partial-high', 'Dry Cut with Mini single hairline and Partial High', 60, 485.00, 95.00, 'haircuts'),
  buildService('hair-cut-consultation', 'Hair Cut Consultation', 15, 65.00, 0.00, 'haircuts'),
  buildService('haircut-adjustment', 'Haircut Adjustment', 60, 0.00, 0.00, 'haircuts'),
  buildService('women-dry-cut', 'Women Dry Cut', 60, 195.00, 40.00, 'haircuts'),

  // Salón
  buildService('airbrush-makeup', 'Airbrush Makeup', 60, 150.00, 50.00, 'salon'),
  buildService('makeup-lesson', 'Makeup Lesson', 60, 200.00, 50.00, 'salon'),
  buildService('wedding-deposit', 'Wedding Deposit', 15, 300.00, 300.00, 'salon'),
  buildService('wedding-trial', 'Wedding Trial', 120, 300.00, 100.00, 'salon'),
];

// ---------------------------------------------------------------------------
// Los Angeles catalog (exclusive LA services and prices)
// ---------------------------------------------------------------------------
export const losAngelesServices: ServiceData[] = [
  // Cuidado del Cabello
  buildService('dry-cut-mini-single-hailine-touch-up', 'Dry cut $ Mini Single Hailine Touc-up', 90, 340.00, 70.00, 'care'),

  // Hair Color
  buildService('color-service-adjustment', 'Color Service Adjustment', 60, 0.00, 0.00, 'color'),
  buildService('double-process-color', 'Double Process Color', 90, 325.00, 65.00, 'color'),
  buildService('full-highlights', 'Full Highlights', 90, 275.00, 50.00, 'color'),
  buildService('full-highlights-mini-single-hairline', 'Full Highlights & Mini Single Hairline Touch-up', 90, 365.00, 70.00, 'color'),
  buildService('gloss-glaze-short-hair', 'Gloss/ Glaze fpr short hair', 60, 90.00, 25.00, 'color'),
  buildService('gloss-glaze-long-hair', 'Gloss/Glaze for long hair', 60, 110.00, 25.00, 'color'),
  buildService('mini-single-process-hairline-touch-up', 'Mini Single Process Hairline Touch-Up', 30, 90.00, 25.00, 'color'),
  buildService('partial-highlights', 'Partial Highlights', 90, 225.00, 50.00, 'color'),
  buildService('partial-highlights-mini-single-hairline', 'Partial Highlights & Mini single Hairline Touch-up', 90, 315.00, 50.00, 'color'),
  buildService('single-process-color', 'Single Process Color', 60, 135.00, 35.00, 'color'),
  buildService('single-process-with-full-highlights', 'Single Process with Full Highlights', 90, 410.00, 80.00, 'color'),
  buildService('single-process-with-partial-highlights', 'Single Process with Partial Highlights', 90, 360.00, 70.00, 'color'),
  buildService('single-process-with-top-highlights', 'Single Process with Top Highlights', 90, 300.00, 60.00, 'color'),
  buildService('top-highlights', 'Top Highlights', 60, 165.00, 35.00, 'color'),
  buildService('top-highlights-mini-single-hairline', 'Top highlights & Mini Single Hairline Touch- up', 90, 255.00, 50.00, 'color'),
  buildService('top-highlights-mini-single-hairline-woman-dry', 'Top Highlights &Mini Single hairline Touch-up &Woman Dry...', 120, 480.00, 95.00, 'color'),

  // Hair Styling
  buildService('conditioning-treatment-long-hair', 'Conditioning Treatment for long hair with sunflower seeds...', 30, 110.00, 25.00, 'styling'),
  buildService('conditioning-treatment-short-hair', 'Conditioning Treatment for short hair with sunflower seed...', 30, 85.00, 25.00, 'styling'),
  buildService('curly-set', 'Curly Set', 60, 125.00, 30.00, 'styling'),
  buildService('detangling', 'Detangling', 60, 80.00, 25.00, 'styling'),

  // Haircuts
  buildService('bang-trim', 'Bang Trim', 15, 25.00, 0.00, 'haircuts'),
  buildService('childrens-cut', 'Childrens Cut', 60, 120.00, 25.00, 'haircuts'),
  buildService('curly-men-dry-cut', 'Curly Men Dry Cut', 60, 185.00, 35.00, 'haircuts'),
  buildService('dry-cut-double-process', 'Dry Cut & Double Process', 120, 575.00, 115.00, 'haircuts'),
  buildService('dry-cut-full-highlights', 'Dry Cut & Full Highlights', 90, 525.00, 105.00, 'haircuts'),
  buildService('dry-cut-mini-single-hairline-touch-up', 'Dry cut & Mini Single Hairline Touch-up', 90, 340.00, 70.00, 'haircuts'),
  buildService('dry-cut-partial-highlights', 'Dry Cut and Partial Highlights', 90, 475.00, 95.00, 'haircuts'),
  buildService('dry-cut-single-process', 'Dry Cut and Single Process', 90, 385.00, 75.00, 'haircuts'),
  buildService('dry-cut-top-highlights', 'Dry Cut and Top Highlights', 90, 415.00, 80.00, 'haircuts'),
  buildService('dry-cut-mini-single-hairline-full-high', 'Dry Cut with Mini single hairline and Full High', 120, 610.00, 120.00, 'haircuts'),
  buildService('dry-cut-mini-single-hairline-partial-high', 'Dry Cut with Mini single hairline and Partial High', 120, 560.00, 110.00, 'haircuts'),
  buildService('hair-cut-consultation', 'Hair Cut Consultation', 15, 65.00, 0.00, 'haircuts'),
  buildService('haircut-adjustment', 'Haircut Adjustment', 60, 0.00, 0.00, 'haircuts'),
  buildService('women-dry-cut', 'Women Dry Cut', 60, 250.00, 50.00, 'haircuts'),

  // Salón
  buildService('airbrush-makeup', 'Airbrush Makeup', 30, 130.00, 40.00, 'salon'),
  buildService('makeup-lesson', 'Makeup Lesson', 60, 150.00, 40.00, 'salon'),
  buildService('wedding-deposit', 'Wedding Deposit', 15, 300.00, 300.00, 'salon'),
  buildService('wedding-hair-makeup-trial', 'Wedding Hair and Makeup Trial', 120, 300.00, 100.00, 'salon'),
  buildService('wedding-hair-trial', 'Wedding Hair Trial', 60, 300.00, 100.00, 'salon'),
];

export function getServicesForLocation(locationId: string): ServiceData[] {
  switch (locationId) {
    case 'new-york':
      return newYorkServices;
    case 'boston':
      return bostonServices;
    case 'los-angeles':
      return losAngelesServices;
    default:
      return [];
  }
}

function getExecutionOrder(service: ServiceData): number {
  const nameLower = service.name.toLowerCase();

  if (nameLower.includes('consultation') || nameLower.includes('detangling')) return 10;
  if (nameLower.includes('conditioning') || nameLower.includes('gloss')) return 40;
  if (service.category === 'haircuts' || nameLower.includes('cut')) return 20;
  if (service.category === 'color' || nameLower.includes('highlight') || nameLower.includes('color') || nameLower.includes('tint')) return 30;
  if (service.category === 'styling' || nameLower.includes('style') || nameLower.includes('set')) return 50;
  if (service.category === 'salon' || nameLower.includes('makeup') || nameLower.includes('wedding')) return 60;
  return 99;
}

export function getServiceCatalogByLocation(locationId: string) {
  return getServicesForLocation(locationId).map((service) => ({
    id: `${locationId}-${service.slug}`,
    locationId,
    name: service.name,
    description: service.name,
    duration: service.durationMinutes,
    price: service.price,
    depositAmount: service.depositAmount,
    category: service.category,
    executionOrder: getExecutionOrder(service),
  }));
}
