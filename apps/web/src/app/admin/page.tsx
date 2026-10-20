'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MOCK_TENANTS, MOCK_ORDERS } from '@/lib/mockData';
import {
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Store,
  ShoppingBag,
  Bike,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Sliders,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [tenants, setTenants] = useState(MOCK_TENANTS);

  const toggleTenantStatus = (slug: string) => {
    setTenants((prev) =>
      prev.map((t) =>
        t.slug === slug
          ? { ...t, status: t.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' }
          : t
      )
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Master Admin Platform</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-950">Painel Administrativo Geral</h1>
          <p className="text-xs text-gray-500 mt-1">
            Visão consolidada de todas as lojas, entregadores, taxas e pedidos da rede.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold">
            Comissão Global Padrão: 12%
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Volume Transacionado (GMV)
            </span>
            <TrendingUp className="w-5 h-5 text-indigo-600" />
          </div>
          <p className="text-3xl font-black text-gray-950">R$ 14.850,00</p>
          <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">
            ↑ +18.4% esta semana
          </span>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Receita da Plataforma (Take Rate)
            </span>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-emerald-950">R$ 1.782,00</p>
          <span className="text-xs text-gray-400 font-medium mt-1 inline-block">
            Média de 12% sobre pedidos
          </span>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Pedidos Hoje
            </span>
            <ShoppingBag className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-3xl font-black text-gray-950">142</p>
          <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">
            98.5% concluídos com sucesso
          </span>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Lojas / Entregadores
            </span>
            <Store className="w-5 h-5 text-rose-600" />
          </div>
          <p className="text-3xl font-black text-gray-950">{tenants.length} / 18</p>
          <span className="text-xs text-gray-400 font-medium mt-1 inline-block">
            100% dos parceiros ativos
          </span>
        </div>
      </div>

      {/* Tabela de Lojas Cadastradas */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-950">Lojas Cadastradas na Plataforma</h2>
            <p className="text-xs text-gray-500">
              Gerencie a liberação, suspensão e comissões dos vendedores parceiros.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/80 text-xs uppercase tracking-wider text-gray-400 font-bold border-b border-gray-100">
              <tr>
                <th className="py-4 px-6">Loja</th>
                <th className="py-4 px-6">Slug Único</th>
                <th className="py-4 px-6">Taxa de Entrega</th>
                <th className="py-4 px-6">Comissão</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tenants.map((t) => (
                <tr key={t.slug} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                        <Image src={t.logoUrl} alt={t.name} fill className="object-cover" />
                      </div>
                      <div>
                        <span className="font-bold text-gray-950 block">{t.name}</span>
                        <span className="text-xs text-gray-400">{t.address}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 font-mono text-xs text-gray-600">/l/{t.slug}</td>
                  <td className="py-4 px-6 font-medium text-gray-900">
                    R$ {t.deliveryFee.toFixed(2).replace('.', ',')}
                  </td>
                  <td className="py-4 px-6 font-medium text-indigo-700">12%</td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        t.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {t.status === 'ACTIVE' ? 'Ativa' : 'Suspensa'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => toggleTenantStatus(t.slug)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                        t.status === 'ACTIVE'
                          ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                          : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      {t.status === 'ACTIVE' ? 'Suspender Loja' : 'Reativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monitoramento de Pedidos Globais Recentes */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-950">Auditoria Global de Pedidos</h2>
            <p className="text-xs text-gray-500">
              Fluxo em tempo real de transações passando pelo Order Service.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/80 text-xs uppercase tracking-wider text-gray-400 font-bold border-b border-gray-100">
              <tr>
                <th className="py-4 px-6">ID Pedido</th>
                <th className="py-4 px-6">Cliente</th>
                <th className="py-4 px-6">Forma Pagto</th>
                <th className="py-4 px-6">Valor Total</th>
                <th className="py-4 px-6">Comissão (12%)</th>
                <th className="py-4 px-6">Status Atual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {MOCK_ORDERS.map((ord) => (
                <tr key={ord.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-6 font-mono text-xs font-bold text-gray-500">
                    #{ord.id.slice(-6)}
                  </td>
                  <td className="py-4 px-6 font-semibold text-gray-900">{ord.customerName}</td>
                  <td className="py-4 px-6">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                      {ord.paymentMethod}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-bold text-gray-950">
                    R$ {ord.totalAmount.toFixed(2).replace('.', ',')}
                  </td>
                  <td className="py-4 px-6 font-bold text-emerald-700">
                    R$ {(ord.totalAmount * 0.12).toFixed(2).replace('.', ',')}
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-sky-100 text-sky-800">
                      {ord.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
