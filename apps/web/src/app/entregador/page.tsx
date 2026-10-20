'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Order } from '@/types';
import {
  Bike,
  Navigation,
  CheckCircle2,
  MapPin,
  Clock,
  DollarSign,
  Phone,
  Power,
  Store,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export default function CourierAppPage() {
  const [isOnline, setIsOnline] = useState(true);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [currentDelivery, setCurrentDelivery] = useState<Order | null>(null);
  const [deliveryStep, setDeliveryStep] = useState<'PICKUP' | 'DROP'>('PICKUP');

  // Métricas do Entregador
  const [dailyEarnings, setDailyEarnings] = useState(84.5);
  const [completedRides, setCompletedRides] = useState(6);

  useEffect(() => {
    async function fetchOffers() {
      const orders = await api.getAvailableDeliveries();
      setAvailableOrders(orders);
    }
    fetchOffers();
    const interval = setInterval(fetchOffers, 8000);
    return () => clearInterval(interval);
  }, []);

  const acceptDelivery = async (order: Order) => {
    await api.updateOrderStatus(order.id, 'READY', 'courier-carlos-1');
    setCurrentDelivery(order);
    setDeliveryStep('PICKUP');
    setAvailableOrders((prev) => prev.filter((o) => o.id !== order.id));
  };

  const confirmPickup = async () => {
    if (!currentDelivery) return;
    await api.updateOrderStatus(currentDelivery.id, 'PICKED_UP');
    setCurrentDelivery({ ...currentDelivery, status: 'PICKED_UP' });
    setDeliveryStep('DROP');
  };

  const finishDelivery = async () => {
    if (!currentDelivery) return;
    await api.updateOrderStatus(currentDelivery.id, 'DELIVERED');
    setDailyEarnings((prev) => prev + currentDelivery.deliveryFee + 4.5);
    setCompletedRides((prev) => prev + 1);
    setCurrentDelivery(null);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 min-h-screen pb-20">
      {/* Header Entregador */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center font-bold text-lg">
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-gray-950 text-base">Carlos Alberto</h1>
              <span className="text-xs text-gray-500 font-medium">Moto Honda CG 160</span>
            </div>
          </div>

          {/* Toggle Online */}
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${
              isOnline
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-gray-100 border-gray-300 text-gray-600'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
              }`}
            />
            {isOnline ? 'Online' : 'Offline'}
          </button>
        </div>

        {/* Resumo de Ganhos Hoje */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
          <div className="bg-sky-50/60 rounded-2xl p-3 border border-sky-100">
            <span className="text-[11px] font-bold text-sky-700 uppercase">Ganhos Hoje</span>
            <p className="text-xl font-black text-sky-950 mt-0.5">
              R$ {dailyEarnings.toFixed(2).replace('.', ',')}
            </p>
          </div>
          <div className="bg-emerald-50/60 rounded-2xl p-3 border border-emerald-100">
            <span className="text-[11px] font-bold text-emerald-700 uppercase">Corridas</span>
            <p className="text-xl font-black text-emerald-950 mt-0.5">{completedRides} concluídas</p>
          </div>
        </div>
      </div>

      {/* Se estiver Offline */}
      {!isOnline && (
        <div className="bg-white rounded-3xl p-8 border border-gray-200/80 shadow-xs text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
            <Power className="w-8 h-8" />
          </div>
          <h3 className="font-extrabold text-xl text-gray-950">Você está desconectado</h3>
          <p className="text-xs text-gray-500 max-w-xs mx-auto">
            Fique online para receber ofertas de entregas por proximidade das lojas parceiras.
          </p>
          <button
            onClick={() => setIsOnline(true)}
            className="w-full py-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-xs transition-colors"
          >
            Ficar Online Agora
          </button>
        </div>
      )}

      {/* Se estiver Online e COM CORRIDA EM ANDAMENTO */}
      {isOnline && currentDelivery && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-sky-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-200">
                Corrida em Andamento (#{currentDelivery.id.slice(-6)})
              </span>
              <span className="text-xs font-black bg-white/20 px-2.5 py-1 rounded-full">
                Ganho: R$ {(currentDelivery.deliveryFee + 4.5).toFixed(2).replace('.', ',')}
              </span>
            </div>

            <h3 className="text-2xl font-extrabold mb-1">
              {deliveryStep === 'PICKUP' ? '1. Coletar Pacote na Loja' : '2. Entregar ao Cliente'}
            </h3>
            <p className="text-xs text-sky-100 mb-6">
              {deliveryStep === 'PICKUP'
                ? 'Dirija-se ao restaurante para retirar o pedido.'
                : 'Siga a rota para o endereço de entrega do cliente.'}
            </p>

            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-4 space-y-3 text-xs mb-6 border border-white/10">
              <div className="flex items-start gap-2.5">
                <Store className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-sky-200 block">Pizzaria do João</span>
                  <span className="text-white/80">Rua das Flores, 120 - Centro</span>
                </div>
              </div>

              <div className="border-t border-white/10 pt-2 flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-emerald-200 block">
                    Cliente: {currentDelivery.customerName}
                  </span>
                  <span className="text-white/80">{currentDelivery.deliveryAddress}</span>
                </div>
              </div>
            </div>

            {deliveryStep === 'PICKUP' ? (
              <button
                onClick={confirmPickup}
                className="w-full py-4 rounded-xl bg-white text-sky-900 font-extrabold text-sm shadow-md hover:bg-sky-50 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5 text-sky-600" />
                <span>Confirmar Coleta na Loja</span>
              </button>
            ) : (
              <button
                onClick={finishDelivery}
                className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Confirmar Entrega ao Cliente</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Se estiver Online e SEM CORRIDA (Lista de Ofertas Disponíveis) */}
      {isOnline && !currentDelivery && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping" />
              Ofertas de Entrega Disponíveis
            </h3>
            <span className="text-xs font-bold text-gray-500">
              {availableOrders.length} disponível(is)
            </span>
          </div>

          <div className="space-y-3">
            {availableOrders.map((offer) => (
              <div
                key={offer.id}
                className="bg-white rounded-3xl p-5 border border-sky-200/80 shadow-xs space-y-4 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider block">
                      Restaurante Pronto
                    </span>
                    <h4 className="font-extrabold text-gray-950 text-base">Pizzaria do João</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-gray-400 block">Ganho estimado</span>
                    <span className="text-lg font-black text-emerald-600">
                      R$ {(offer.deliveryFee + 4.5).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-3 space-y-2 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="truncate">Entrega: {offer.deliveryAddress}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Navigation className="w-4 h-4 text-sky-500" />
                    <span>Distância estimada: ~ 2.4 km (12 min)</span>
                  </div>
                </div>

                <button
                  onClick={() => acceptDelivery(offer)}
                  className="w-full py-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <span>Aceitar esta Corrida</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}

            {availableOrders.length === 0 && (
              <div className="bg-white rounded-3xl p-10 border border-gray-200/80 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center mx-auto animate-pulse">
                  <Clock className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-gray-900 text-sm">Aguardando novos pedidos prontos</h4>
                <p className="text-xs text-gray-500">
                  Assim que um restaurante marcar um pedido como &quot;Pronto&quot;, a oferta aparecerá aqui instantaneamente.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
