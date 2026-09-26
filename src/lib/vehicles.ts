export const CAR_MAKES = [
  'ASTON_MARTIN',
  'AUDI',
  'AUSTIN',
  'BAIC',
  'BMW',
  'BYD',
  'CHANGAN_AUTO',
  'CHERY',
  'CHEVROLET',
  'CITROEN',
  'DATSUN',
  'DEEPAL',
  'DONGFENG',
  'FERRARI',
  'FIAT',
  'FODAY',
  'FORD',
  'GAC',
  'GEELY',
  'GWM',
  'HAVAL',
  'HONDA',
  'HYUNDAI',
  'IM_MOTORS',
  'INFINITI',
  'ISUZU',
  'JAECOO',
  'JAGUAR',
  'JEEP',
  'JETOUR',
  'JMC',
  'KIA',
  'LAND_ROVER',
  'LEXUS',
  'LOTOS',
  'MASERATI',
  'MAZDA',
  'MERCEDES_BENZ',
  'MG',
  'MINI',
  'MITSUBISHI_MOTORS',
  'MORRIS',
  'NISSAN',
  'OMODA',
  'OTHER',
  'OPEL',
  'PERODUA',
  'PEUGEOT',
  'PORSCHE',
  'PROTON',
  'RENAULT',
  'RIDDARA',
  'SEAT',
  'SKODA',
  'SKYWORTH',
  'SMART',
  'SUBARU',
  'SUZUKI',
  'TATA',
  'TESLA',
  'TOYOTA',
  'VOLKSWAGEN',
  'VOLVO',
  'WULING',
  'XPENG',
] as const;

export const BODY_TYPES = [
  'SMALL_CAR',
  'MEDIUM_CAR',
  'LARGE_CAR',
  'WAGON',
  'MONOSPACE',
  'CROSSOVER',
  'SUV',
  '4X2',
  '4X4',
  'CABRIOLET',
  'COUPE',
  'VINTAGE',
] as const;

export const TRANSMISSIONS = ['MANUAL', 'AUTOMATIC', 'CVT'] as const;

export const FUEL_TYPES = ['PETROL', 'DIESEL', 'HYBRID_PETROL', 'HYBRID_DIESEL', 'GAS', 'ELECTRIC'] as const;

export const LOCATIONS = ['NORTH', 'SOUTH', 'EAST', 'WEST', 'CENTER'] as const;

/** Format cents into a display price in Mauritian Rupees, e.g. 30000 -> "Rs 300". */
export function formatPrice(cents: number): string {
	const rupees = Math.round(cents / 100).toLocaleString();
	return `Rs ${rupees}`;
}

/** Human label for a snake_case enum, e.g. SMALL_CAR -> "Small car". */
export function humanize(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
