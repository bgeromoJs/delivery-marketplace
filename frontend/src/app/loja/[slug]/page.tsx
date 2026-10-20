'use client';

import { use, useEffect, useState } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api';
import { Dish, CartItem, Order, TenantTheme } from '@/types';
import {
  Star,
  Clock,
  Bike,
  Plus,
  Minus,
  ShoppingBag,
  X,
  CheckCircle2,
  QrCode,
  CreditCard,
  ArrowRight,
  ChevronRight,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

export default function TenantStorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const [tenant, setTenant] = useState<TenantTheme | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [itemNotes, setItemNotes] = useState('');
  const [itemQty, setItemQty] = useState(1);

  // Checkout State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState('Maria Silva');
  const [customerPhone, setCustomerPhone] = useState('(11) 98765-4321');
  const [deliveryAddress, setDeliveryAddress] = useState('Rua das Acácias, 230 - Apto 41');
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD'>('PIX');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const t = await api.getTenantBySlug(slug);
        setTenant(t);
        const d = await api.getDishes(t.tenantId);
        setDishes(d);
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
  }, [slug]);

  if (!tenant) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  const categories = ['Todas', ...Array.from(new Set(dishes.map((d) => d.category)))];

  const filteredDishes =
    selectedCategory === 'Todas'
      ? dishes
      : dishes.filter((d) => d.category === selectedCategory);

  const subtotal = cart.reduce((acc, item) => acc + item.dish.price * item.quantity, 0);
  const total = subtotal > 0 ? subtotal + tenant.deliveryFee : 0;
  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const addToCart = (dish: Dish, quantity = 1, notes?: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.dish.id === dish.id);
      if (existing) {
        return prev.map((item) =>
          item.dish.id === dish.id
            ? { ...item, quantity: item.quantity + quantity, notes: notes || item.notes }
            : item
        );
      }
      return [...prev, { dish, quantity, notes }];
    });
    setSelectedDish(null);
    setItemNotes('');
    setItemQty(1);
  };

  const updateQuantity = (dishId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.dish.id === dishId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setIsSubmitting(true);
    try {
      const order = await api.createOrder({
        tenantId: tenant.tenantId,
        customerName,
        customerPhone,
        deliveryAddress,
        paymentMethod,
        deliveryFee: tenant.deliveryFee,
        items: cart.map((item) => ({
          dishId: item.dish.id,
          dishName: item.dish.name,
          quantity: item.quantity,
          unitPrice: item.dish.price,
          optionsJson: item.notes,
        })),
      });
      setActiveOrder(order);
      setCart([]);
      setIsCheckoutOpen(false);
      setIsCartOpen(false);
    } catch (err) {
      alert('Erro ao processar pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Banner da Loja */}
      <div className="relative h-48 sm:h-64 w-full bg-gray-900 overflow-hidden">
        <Image
          src={tenant.bannerUrl}
          alt={tenant.name}
          fill
          className="object-cover opacity-60"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />
      </div>

      {/* Header Info da Loja com Tema Dinâmico */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 sm:-mt-20 relative z-10 mb-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-gray-100 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shadow-md shrink-0 border-4 border-white">
            <Image
              src={tenant.logoUrl}
              alt={tenant.name}
              fill
              className="object-cover"
            />
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
                {tenant.name}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                {tenant.rating.toFixed(1)}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                ● Aberto Agora
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-4 max-w-2xl">{tenant.description}</p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs font-medium text-gray-500">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-gray-400" />
                {tenant.deliveryTimeMin - 5} - {tenant.deliveryTimeMin + 10} min
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Bike className="w-4 h-4 text-gray-400" />
                Entrega: R$ {tenant.deliveryFee.toFixed(2).replace('.', ',')}
              </span>
              <span>•</span>
              <span>{tenant.address}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rastreio Ativo (se houver pedido feito nesta sessão) */}
      {activeOrder && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                  Pedido em Andamento (#{activeOrder.id.slice(-6)})
                </span>
                <h3 className="text-2xl font-extrabold mt-1">
                  {activeOrder.status === 'PAID' && '🎉 Pagamento Aprovado! Aguardando aceite da loja.'}
                  {activeOrder.status === 'ACCEPTED' && '👨‍🍳 Pedido aceito pela loja!'}
                  {activeOrder.status === 'PREPARING' && '🔥 Seu pedido está sendo preparado no forno.'}
                  {activeOrder.status === 'READY' && '📦 Pedido pronto! Aguardando entregador.'}
                  {activeOrder.status === 'PICKED_UP' && '🛵 O entregador retirou seu pedido e está a caminho!'}
                  {activeOrder.status === 'DELIVERED' && '✅ Pedido entregue! Bom apetite!'}
                </h3>
                <p className="text-sm text-emerald-100 mt-1">
                  Entrega em: {activeOrder.deliveryAddress}
                </p>
              </div>

              {/* Botão de simular avanço de estado para teste rápido */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const nextMap: Record<string, any> = {
                      PAID: 'ACCEPTED',
                      ACCEPTED: 'PREPARING',
                      PREPARING: 'READY',
                      READY: 'PICKED_UP',
                      PICKED_UP: 'DELIVERED',
                    };
                    const next = nextMap[activeOrder.status] || 'DELIVERED';
                    api.updateOrderStatus(activeOrder.id, next);
                    setActiveOrder({ ...activeOrder, status: next });
                  }}
                  className="px-4 py-2 rounded-xl bg-white text-emerald-900 font-bold text-xs shadow-xs hover:bg-emerald-50 transition-colors"
                >
                  ⚡ Simular Próxima Etapa
                </button>
              </div>
            </div>

            {/* Stepper Visual */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-emerald-500/50">
              {[
                { status: 'PAID', label: '1. Pago' },
                { status: 'ACCEPTED', label: '2. Aceito' },
                { status: 'PREPARING', label: '3. Na Cozinha' },
                { status: 'READY', label: '4. Pronto' },
                { status: 'DELIVERED', label: '5. Entregue' },
              ].map((step, idx) => {
                const statuses = ['PAID', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERED'];
                const currentIdx = statuses.indexOf(
                  activeOrder.status === 'PICKED_UP' ? 'READY' : activeOrder.status
                );
                const isPassed = currentIdx >= idx;

                return (
                  <div
                    key={step.status}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      isPassed
                        ? 'bg-emerald-500/40 border-emerald-300 font-bold text-white'
                        : 'bg-emerald-800/30 border-emerald-700/50 text-emerald-300/70'
                    }`}
                  >
                    <span className="text-xs block">{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Principal do Cardápio */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Categorias Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
              style={{
                backgroundColor: selectedCategory === cat ? tenant.primaryColor : undefined,
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid de Itens do Cardápio */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredDishes.map((dish) => (
            <div
              key={dish.id}
              onClick={() => {
                setSelectedDish(dish);
                setItemQty(1);
                setItemNotes('');
              }}
              className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/80 shadow-2xs hover:shadow-md transition-all cursor-pointer flex gap-4 group"
            >
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 group-hover:text-rose-600 transition-colors">
                    {dish.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2">
                    {dish.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="font-extrabold text-base sm:text-lg text-gray-950">
                    R$ {dish.price.toFixed(2).replace('.', ',')}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(dish, 1);
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-xs transition-transform active:scale-95"
                    style={{ backgroundColor: tenant.primaryColor }}
                    aria-label="Adicionar ao carrinho"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden shrink-0">
                <Image
                  src={dish.imageUrl}
                  alt={dish.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Detalhes do Prato */}
      {selectedDish && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="relative h-48 w-full bg-gray-100">
              <Image
                src={selectedDish.imageUrl}
                alt={selectedDish.name}
                fill
                className="object-cover"
              />
              <button
                onClick={() => setSelectedDish(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-gray-700 hover:bg-white shadow-xs"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <h3 className="text-2xl font-bold text-gray-950 mb-2">{selectedDish.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{selectedDish.description}</p>
              <span className="text-2xl font-extrabold text-gray-950 block mb-6">
                R$ {selectedDish.price.toFixed(2).replace('.', ',')}
              </span>

              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Observações para a cozinha:
                </label>
                <textarea
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  placeholder="Ex: sem cebola, ponto da carne, caprichar no molho..."
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center border border-gray-200 rounded-xl px-3 py-1.5 gap-3">
                  <button
                    onClick={() => setItemQty((q) => Math.max(1, q - 1))}
                    className="text-gray-500 hover:text-gray-900 p-1"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-gray-900 w-6 text-center">{itemQty}</span>
                  <button
                    onClick={() => setItemQty((q) => q + 1)}
                    className="text-gray-500 hover:text-gray-900 p-1"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => addToCart(selectedDish, itemQty, itemNotes)}
                  className="flex-1 py-3 px-6 rounded-xl font-bold text-white shadow-sm flex items-center justify-between"
                  style={{ backgroundColor: tenant.primaryColor }}
                >
                  <span>Adicionar ao Pedido</span>
                  <span>
                    R$ {(selectedDish.price * itemQty).toFixed(2).replace('.', ',')}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botão Flutuante do Carrinho (se houver itens) */}
      {totalItemsCount > 0 && !isCartOpen && (
        <div className="fixed bottom-6 left-0 right-0 z-40 px-4 max-w-lg mx-auto">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full py-4 px-6 rounded-2xl text-white font-bold shadow-xl flex items-center justify-between hover:opacity-95 transition-all transform active:scale-98"
            style={{ backgroundColor: tenant.primaryColor }}
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-white/25 flex items-center justify-center text-xs font-black">
                {totalItemsCount}
              </span>
              <span>Ver Carrinho</span>
            </div>
            <span>R$ {total.toFixed(2).replace('.', ',')}</span>
          </button>
        </div>
      )}

      {/* Drawer Lateral do Carrinho */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-250">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-gray-800" />
                <h3 className="text-xl font-bold text-gray-900">Seu Pedido</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista de Itens */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.map((item) => (
                <div
                  key={item.dish.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50"
                >
                  <div className="flex-1 pr-3">
                    <h4 className="font-semibold text-gray-900 text-sm">{item.dish.name}</h4>
                    {item.notes && (
                      <p className="text-xs text-amber-700 italic mt-0.5">Obs: {item.notes}</p>
                    )}
                    <span className="text-xs font-bold text-gray-500 mt-1 block">
                      R$ {(item.dish.price * item.quantity).toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  <div className="flex items-center border border-gray-200 bg-white rounded-lg px-2 py-1 gap-2">
                    <button
                      onClick={() => updateQuantity(item.dish.id, -1)}
                      className="text-gray-400 hover:text-gray-800"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-bold text-xs text-gray-900 w-4 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.dish.id, 1)}
                      className="text-gray-400 hover:text-gray-800"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumo de Valores */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Taxa de Entrega</span>
                <span>R$ {tenant.deliveryFee.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-gray-950 pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>R$ {total.toFixed(2).replace('.', ',')}</span>
              </div>

              <button
                onClick={() => {
                  setIsCheckoutOpen(true);
                  setIsCartOpen(false);
                }}
                className="w-full mt-4 py-3.5 rounded-xl font-bold text-white shadow-sm flex items-center justify-center gap-2"
                style={{ backgroundColor: tenant.primaryColor }}
              >
                <span>Avançar para Pagamento</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Checkout */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-extrabold text-gray-950">Finalizar Pedido</h3>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCheckout} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Seu Nome:
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Telefone / WhatsApp:
                </label>
                <input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Endereço de Entrega:
                </label>
                <input
                  type="text"
                  required
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Método de Pagamento */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Forma de Pagamento:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('PIX')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs sm:text-sm transition-all ${
                      paymentMethod === 'PIX'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span>Pix Instantâneo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CREDIT_CARD')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs sm:text-sm transition-all ${
                      paymentMethod === 'CREDIT_CARD'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    <span>Cartão de Crédito</span>
                  </button>
                </div>
              </div>

              {/* Informação do Pix */}
              {paymentMethod === 'PIX' && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Chave Pix Copia e Cola gerada:</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-emerald-200">
                    <code className="text-[11px] truncate flex-1 text-gray-600">
                      00020126580014br.gov.bcb.pix0136{tenant.tenantId}520400005303986540{total.toFixed(2)}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        setCopiedPix(true);
                        setTimeout(() => setCopiedPix(false), 2000);
                      }}
                      className="p-1 text-emerald-700 hover:text-emerald-900"
                    >
                      {copiedPix ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Total Final */}
              <div className="p-4 bg-gray-50 rounded-xl flex items-center justify-between font-extrabold text-base">
                <span>Total a Pagar</span>
                <span className="text-xl">R$ {total.toFixed(2).replace('.', ',')}</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-xl font-bold text-white shadow-md transition-all flex items-center justify-center gap-2"
                style={{ backgroundColor: tenant.primaryColor }}
              >
                {isSubmitting ? (
                  <span>Processando Pedido...</span>
                ) : (
                  <>
                    <span>Confirmar e Pagar</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
