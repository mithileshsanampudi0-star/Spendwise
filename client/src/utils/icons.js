import {
  Utensils, Plane, GraduationCap, Clapperboard, ShoppingBag, HeartPulse, Receipt, Wallet,
  Coffee, Car, Home, Gift, Music, Gamepad2, Dumbbell, Book, Smartphone, Shirt, PawPrint,
  Baby, Briefcase, Bus, Fuel, Wifi, Pizza, Landmark,
} from 'lucide-react';

export const ICON_MAP = {
  Utensils, Plane, GraduationCap, Clapperboard, ShoppingBag, HeartPulse, Receipt, Wallet,
  Coffee, Car, Home, Gift, Music, Gamepad2, Dumbbell, Book, Smartphone, Shirt, PawPrint,
  Baby, Briefcase, Bus, Fuel, Wifi, Pizza, Landmark,
};

export const ICON_NAMES = Object.keys(ICON_MAP);

export const COLOR_SWATCHES = [
  '#4CC9F0', '#8B5CF6', '#22C55E', '#F59E0B', '#EF4444', '#EC4899',
  '#14B8A6', '#F97316', '#6366F1', '#84CC16', '#06B6D4', '#94A3B8',
];

export const getIcon = (name) => ICON_MAP[name] || Wallet;
