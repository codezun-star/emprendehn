import {
  BedDouble,
  Briefcase,
  Car,
  GraduationCap,
  HeartPulse,
  House,
  Laptop,
  PartyPopper,
  PawPrint,
  Sparkles,
  Store,
  Tag,
  Truck,
  Utensils,
  type LucideIcon,
} from "lucide-react";

// Íconos disponibles para categorías (columna categories.icono).
export const ICONOS_CATEGORIA: Record<string, LucideIcon> = {
  utensils: Utensils,
  sparkles: Sparkles,
  house: House,
  store: Store,
  "heart-pulse": HeartPulse,
  car: Car,
  briefcase: Briefcase,
  "paw-print": PawPrint,
  "graduation-cap": GraduationCap,
  "party-popper": PartyPopper,
  laptop: Laptop,
  bed: BedDouble,
  truck: Truck,
  tag: Tag,
};

export function IconoCategoria({ icono, className }: { icono: string | null; className?: string }) {
  const Icono = (icono && ICONOS_CATEGORIA[icono]) || Tag;
  return <Icono className={className} aria-hidden />;
}
