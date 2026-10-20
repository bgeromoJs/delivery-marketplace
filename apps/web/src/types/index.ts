export type Role = 'ADMIN' | 'SELLER' | 'COURIER' | 'CUSTOMER';

export type OrderStatus =
  | 'CREATED'
  | 'PAID'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'PICKED_UP'
  | 'DELIVERED'
  | 'CANCELLED';

export interface TenantTheme {
  tenantId: string;
  name: string;
  slug: string;
  logoUrl: string;
  bannerUrl: string;
  primaryColor: string;
  secondaryColor: string;
  deliveryFee: number;
  deliveryTimeMin: number;
  address: string;
  phone: string;
  rating: number;
  description?: string;
  status?: string;
}

export interface Dish {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  available: boolean;
  preparationTimeMin: number;
}

export interface CartItem {
  dish: Dish;
  quantity: number;
  notes?: string;
}

export interface OrderItem {
  id: string;
  dishId: string;
  dishName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  optionsJson?: string;
}

export interface Order {
  id: string;
  tenantId: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  courierId?: string;
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  deliveryAddress: string;
  paymentMethod: 'PIX' | 'CREDIT_CARD';
  notes?: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}
