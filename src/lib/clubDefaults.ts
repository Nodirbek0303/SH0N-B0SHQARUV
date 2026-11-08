import type { Computer, ComputerStatus, Product } from '@/types/club';

export const STARTER_PRODUCTS: Product[] = [
  'Fanta 0.5L', 'Fanta 1L', 'Fanta 1.5L', 'Fanta 2L',
  'Coca-Cola 0.5L', 'Coca-Cola 1L', 'Coca-Cola 1.5L', 'Coca-Cola 2L',
  'Pepsi 0.5L', 'Pepsi 1L', 'Pepsi 1.5L', 'Pepsi 2L',
  'Sprite 0.5L', 'Sprite 1L', 'Sprite 1.5L',
  'Flash energetik 0.45L', 'Gorilla energetik 0.45L',
  'Red Bull energetik 0.25L', 'Adrenaline Rush energetik 0.25L',
  'Suv 0.5L', 'Suv 1L', 'Suv 1.5L',
  'Chips', 'Suxari', 'Snickers', 'Mars', 'Twix',
  'Bounty', 'KitKat', 'Shokolad', 'Saqqiz',
].map((name) => ({
  id: `starter-product-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  name,
  price: 0,
  cost_price: 0,
  stock: 0,
}));

export const DEFAULT_COMPUTERS: Computer[] = Array.from({ length: 25 }, (_, index) => ({
  id: `computer-${index + 1}`,
  name: `Kompyuter ${index + 1}`,
  status: 'free' as ComputerStatus,
  total_runtime_seconds: 0,
}));
