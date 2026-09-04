export interface Menu {
  id: string;
  restaurantId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MenuCategory {
  id: string;
  menuId: string;
  restaurantId: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  itemCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  menuId: string;
  restaurantId: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  isActive: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  isSpicy: boolean;
  preparationTimeMinutes: number | null;
  displayOrder: number;
  categoryName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  isSpicy: boolean;
  preparationTimeMinutes: number | null;
}

export interface PublicMenuCategory {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
  items: PublicMenuItem[];
}

export interface PublicMenu {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    cuisineType: string;
  };
  categories: PublicMenuCategory[];
}

export interface MenuStats {
  totalCategories: number;
  totalItems: number;
  availableItems: number;
  unavailableItems: number;
  vegetarianItems: number;
}
