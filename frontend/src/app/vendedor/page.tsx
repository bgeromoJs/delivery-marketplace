'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api';
import { Dish, Order, TenantTheme } from '@/types';
import {
  Store,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Bell,
  UtensilsCrossed,
  Layers,
  ChevronRight,
  Power,
  RotateCcw,
} from 'lucide-react';
import { MOCK_TENANTS } from '@/lib/mockData';

export default function SellerDashboardPage() {
  const [selectedTenant, setSelectedTenant] = useState<TenantTheme>(MOCK_TENANTS[0]);
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [hasNewAlert, setHasNewAlert] = useState(true);

  useEffect(() => {
    async function load() {
      const ords = await api.getOrdersByTenant(selectedTenant.tenantId);
      setOrders(ords);
      const d = await api.getDishes(selectedTenant.tenantId);
      setDishes(d);
    }
    load();
  }, [selectedTenant]);

  const updateStatus = async (orderId: string, nextStatus: string) => {
    await api.updateOrderStatus(orderId, nextStatus);
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus as any } : o))
    );
  };

  const toggleDishAvailability = async (dishId: string) => {
    setDishes((prev) =>
      prev.map((d) => (d.id === dishId ? { ...d, available: !d.available } : d))
    );
  };

  // Kanban Columns
  const pendingOrders = orders.filter((o) => o.status === 'PAID');
  const preparingOrders = orders.filter((o) => o.status === 'ACCEPTED' || o.status === 'PREPARING');
  const readyOrders = orders.filter((o) => o.status === 'READY' || o.status === 'PICKED_UP');
  const completedOrders = orders.filter((o) => o.status === 'DELIVERED');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-gray-100">
              <Image
                src={selectedTenant.logoUrl}
                alt={selectedTenant.name}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-extrabold text-gray-950">{selectedTenant.name}</h1>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
                    isOpen
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  {isOpen ? 'Loja Aberta para Pedidos' : 'Loja Fechada'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Painel de Operações da Cozinha em Tempo Real</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Seletor de Loja para teste */}
            <select
              value={selectedTenant.slug}
              onChange={(e) => {
                const found = MOCK_TENANTS.find((t) => t.slug === e.target.value);
                if (found) setSelectedTenant(found);
              }}
              className="text-xs font-semibold border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none"
            >
              {MOCK_TENANTS.map((t) => (
                <option key={t.slug} value={t.slug}>
                  Loja: {t.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                isOpen
                  ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                  : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{isOpen ? 'Fechar Loja' : 'Abrir Loja'}</span>
            </button>
          </div>
        </div>

        {/* Tabs de navegação do Vendedor */}
        <div className="flex items-center gap-4 mt-8 border-t border-gray-100 pt-6">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 pb-2 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'orders'
                ? 'border-gray-900 text-gray-950'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Pedidos em Tempo Real</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-rose-100 text-rose-700">
              {pendingOrders.length + preparingOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('menu')}
            className={`flex items-center gap-2 pb-2 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'menu'
                ? 'border-gray-900 text-gray-950'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Gestão do Cardápio & Estoque</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
              {dishes.length}
            </span>
          </button>
        </div>
      </div>

      {/* Alerta de novo pedido */}
      {hasNewAlert && pendingOrders.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8 flex items-center justify-between text-amber-900">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center animate-bounce">
              <Bell className="w-5 h-5" />
            </span>
            <div>
              <p className="font-bold text-sm">
                Atenção: Você tem {pendingOrders.length} novo(s) pedido(s) aguardando confirmação!
              </p>
              <p className="text-xs text-amber-700">
                Aceite rapidamente para iniciar o preparo e evitar cancelamento por timeout.
              </p>
            </div>
          </div>
          <button
            onClick={() => setHasNewAlert(false)}
            className="text-xs font-bold text-amber-800 hover:underline px-3 py-1"
          >
            Dispensar Alerta
          </button>
        </div>
      )}

      {/* Conteúdo Aba: Pedidos (Kanban) */}
      {activeTab === 'orders' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Coluna 1: Novos Pedidos */}
          <div className="bg-rose-50/50 rounded-3xl p-5 border border-rose-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                Novos Pedidos
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-200 text-rose-800">
                {pendingOrders.length}
              </span>
            </div>

            <div className="space-y-4">
              {pendingOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-2xl p-5 border border-rose-200 shadow-xs space-y-4 animate-in fade-in"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono font-bold text-gray-400">
                        #{ord.id.slice(-6)}
                      </span>
                      <h4 className="font-extrabold text-gray-950 text-base">{ord.customerName}</h4>
                      <p className="text-xs text-gray-500">{ord.deliveryAddress}</p>
                    </div>
                    <span className="text-xs font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
                      R$ {ord.totalAmount.toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  {/* Itens */}
                  <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-xs text-gray-700">
                    {ord.items.map((it) => (
                      <div key={it.id} className="flex justify-between">
                        <span>
                          <strong className="text-gray-900">{it.quantity}x</strong> {it.dishName}
                        </span>
                        <span className="font-mono text-gray-500">
                          R$ {it.totalPrice.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    ))}
                    {ord.notes && (
                      <p className="text-[11px] text-amber-700 italic pt-1 border-t border-gray-200">
                        Obs: {ord.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatus(ord.id, 'ACCEPTED')}
                      className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Aceitar Pedido</span>
                    </button>
                    <button
                      onClick={() => updateStatus(ord.id, 'CANCELLED')}
                      className="px-3 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 font-bold text-xs transition-colors"
                    >
                      Recusar
                    </button>
                  </div>
                </div>
              ))}

              {pendingOrders.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-xs">
                  Nenhum pedido novo no momento.
                </div>
              )}
            </div>
          </div>

          {/* Coluna 2: Em Preparo na Cozinha */}
          <div className="bg-amber-50/50 rounded-3xl p-5 border border-amber-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                Na Cozinha (Em Preparo)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-200 text-amber-800">
                {preparingOrders.length}
              </span>
            </div>

            <div className="space-y-4">
              {preparingOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-2xl p-5 border border-amber-200 shadow-xs space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono font-bold text-gray-400">
                        #{ord.id.slice(-6)}
                      </span>
                      <h4 className="font-extrabold text-gray-950 text-base">{ord.customerName}</h4>
                      <p className="text-xs text-gray-500">{ord.deliveryAddress}</p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 rounded-md bg-amber-100 text-amber-800">
                      Cozinhando
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-xs text-gray-700">
                    {ord.items.map((it) => (
                      <div key={it.id} className="flex justify-between">
                        <span>
                          <strong className="text-gray-900">{it.quantity}x</strong> {it.dishName}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => updateStatus(ord.id, 'READY')}
                    className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Marcar como Pronto (Chamar Entregador)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {preparingOrders.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-xs">
                  Cozinha liberada no momento.
                </div>
              )}
            </div>
          </div>

          {/* Coluna 3: Prontos / A Caminho */}
          <div className="bg-emerald-50/50 rounded-3xl p-5 border border-emerald-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                Prontos / Despachados
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-200 text-emerald-800">
                {readyOrders.length}
              </span>
            </div>

            <div className="space-y-4">
              {readyOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-xs space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono font-bold text-gray-400">
                        #{ord.id.slice(-6)}
                      </span>
                      <h4 className="font-extrabold text-gray-950 text-base">{ord.customerName}</h4>
                      <p className="text-xs text-gray-500">{ord.deliveryAddress}</p>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800">
                      {ord.status === 'READY' ? 'Aguardando Retirada' : 'A Caminho'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/50 text-xs text-emerald-900">
                    {ord.status === 'READY' ? (
                      <p className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-emerald-600" />
                        Disponibilizado no app dos entregadores
                      </p>
                    ) : (
                      <p className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Entregador retirou o pacote da loja
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {readyOrders.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-xs">
                  Nenhum pedido aguardando retirada.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Aba: Cardápio */}
      {activeTab === 'menu' && (
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-950">Cardápio da Loja</h3>
              <p className="text-xs text-gray-500">
                Pause itens temporariamente quando faltar insumo no estoque.
              </p>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {dishes.map((dish) => (
              <div key={dish.id} className="py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                    <Image
                      src={dish.imageUrl}
                      alt={dish.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">{dish.name}</h4>
                    <span className="text-xs text-gray-500">{dish.category} • R$ {dish.price.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      dish.available
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {dish.available ? 'Disponível' : 'Pausado'}
                  </span>

                  <button
                    onClick={() => toggleDishAvailability(dish.id)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {dish.available ? 'Pausar Item' : 'Ativar Item'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
