export const API_BASE = ''; 

export interface CityStation {
  id: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
}

export const STATIC_CITIES: CityStation[] = [
  { id: '1', name: 'New York City', state: 'NY', lat: 40.71, lon: -74.01 },
  { id: '2', name: 'London', state: 'ENG', lat: 51.51, lon: -0.13 },
  { id: '3', name: 'Tokyo', state: 'TYO', lat: 35.68, lon: 139.69 },
  { id: '4', name: 'Singapore', state: 'SG', lat: 1.35, lon: 103.82 },
  { id: '5', name: 'Paris', state: 'IDF', lat: 48.86, lon: 2.35 },
  { id: '6', name: 'Sydney', state: 'NSW', lat: -33.87, lon: 151.21 },
  { id: '7', name: 'Mumbai', state: 'MH', lat: 19.07, lon: 72.88 },
  { id: '8', name: 'Cairo', state: 'CRA', lat: 30.04, lon: 31.24 },
  { id: '9', name: 'São Paulo', state: 'SP', lat: -23.55, lon: -46.63 },
  { id: '10', name: 'Cape Town', state: 'WC', lat: -33.93, lon: 18.42 }
];