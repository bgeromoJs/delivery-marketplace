import { Dish, Order, TenantTheme } from '@/types';
import { MOCK_DISHES, MOCK_ORDERS, MOCK_TENANTS } from './mockData';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const api = {
  // Tenant
  async getTenants(): Promise<TenantTheme[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tenants`, { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return MOCK_TENANTS;
  },

  async getTenantBySlug(slug: string): Promise<TenantTheme> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tenants/${slug}`, { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    const tenant = MOCK_TENANTS.find((t) => t.slug === slug);
    if (!tenant) throw new Error('Loja não encontrada');
    return tenant;
  },

  // Catalog
  async getDishes(tenantId: string): Promise<Dish[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/catalog/tenants/${tenantId}/dishes`, { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return MOCK_DISHES.filter((d) => d.tenantId === tenantId);
  },

  // Orders
  async getOrdersByTenant(tenantId: string): Promise<Order[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/tenant/${tenantId}`, { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return MOCK_ORDERS.filter((o) => o.tenantId === tenantId);
  },

  async getAvailableDeliveries(): Promise<Order[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/available-deliveries`, { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return MOCK_ORDERS.filter((o) => o.status === 'READY');
  },

  async createOrder(data: {
    tenantId: string;
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    paymentMethod: 'PIX' | 'CREDIT_CARD';
    notes?: string;
    deliveryFee: number;
    items: {
      dishId: string;
      dishName: string;
      quantity: number;
      unitPrice: number;
      optionsJson?: string;
    }[];
  }): Promise<Order> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }

    const subtotal = data.items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      tenantId: data.tenantId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      deliveryAddress: data.deliveryAddress,
      paymentMethod: data.paymentMethod,
      notes: data.notes,
      deliveryFee: data.deliveryFee,
      subtotal,
      totalAmount: subtotal + data.deliveryFee,
      status: 'PAID',
      items: data.items.map((item, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        dishId: item.dishId,
        dishName: item.dishName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.unitPrice * item.quantity,
        optionsJson: item.optionsJson,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    MOCK_ORDERS.unshift(newOrder);
    return newOrder;
  },

  async updateOrderStatus(orderId: string, status: string, courierId?: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, courierId }),
      });
    } catch {
      // Fallback
    }

    const order = MOCK_ORDERS.find((o) => o.id === orderId);
    if (order) {
      order.status = status as any;
      if (courierId) order.courierId = courierId;
      order.updatedAt = new Date().toISOString();
    }
  },
};
