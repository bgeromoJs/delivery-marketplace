import Link from 'next/link';
import { Store, ShoppingBag, Bike, ShieldCheck, ArrowRight, Layers, Sparkles, CheckCircle2 } from 'lucide-react';
import { MOCK_TENANTS } from '@/lib/mockData';

export default function HomePage() {
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-semibold mb-6">
          <Sparkles className="w-4 h-4 text-rose-500" />
          <span>Java 21 · Spring Boot 3 · Microsserviços · Frontend Unificado</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-950 tracking-tight leading-tight">
          Marketplace de Delivery <br />
          <span className="bg-gradient-to-r from-rose-600 via-amber-600 to-rose-700 bg-clip-text text-transparent">
            Multi-tenant em Microsserviços
          </span>
        </h1>
        <p className="mt-4 text-lg text-gray-600 leading-relaxed">
          Plataforma completa de delivery com separação de domínios em microsserviços Spring Boot 
          e uma aplicação web única conectando todos os atores do ecossistema.
        </p>
      </div>

      {/* Grid de Experiências */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {/* Card 1: App Cliente */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">App do Cliente</h2>
            <p className="text-sm text-gray-600 mb-4">
              White-label dinâmico por slug, cardápio, carrinho retrátil, checkout Pix/Cartão e tracking em tempo real.
            </p>
            <div className="space-y-2 mb-6">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                Lojas de Teste:
              </span>
              {MOCK_TENANTS.map((tenant) => (
                <Link
                  key={tenant.slug}
                  href={`/loja/${tenant.slug}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 border border-gray-100 text-xs font-medium text-gray-800 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: tenant.primaryColor }}
                    />
                    {tenant.name}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                </Link>
              ))}
            </div>
          </div>
          <Link
            href="/loja/pizzaria-do-joao"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm transition-colors shadow-xs"
          >
            Abrir App do Cliente <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Card 2: Painel Vendedor */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
              <Store className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Painel Vendedor</h2>
            <p className="text-sm text-gray-600 mb-4">
              Gestão de pedidos em tempo real estilo Kanban (Recebidos, Preparo, Prontos), controle do cardápio e abertura de loja.
            </p>
            <ul className="text-xs text-gray-600 space-y-2 mb-6">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Aceitar e marcar pedidos prontos
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Pausar pratos em falta no estoque
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Notificações de novos pedidos
              </li>
            </ul>
          </div>
          <Link
            href="/vendedor"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm transition-colors shadow-xs"
          >
            Abrir Painel Vendedor <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Card 3: App Entregador */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center mb-4">
              <Bike className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">App Entregador</h2>
            <p className="text-sm text-gray-600 mb-4">
              Modo Online/Offline, recebimento de ofertas de entregas disponíveis, rotas de coleta e confirmação de entrega.
            </p>
            <ul className="text-xs text-gray-600 space-y-2 mb-6">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Visualizar ofertas de corridas
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Aceitar e confirmar coleta na loja
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Extrato diário de corridas e ganhos
              </li>
            </ul>
          </div>
          <Link
            href="/entregador"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-medium text-sm transition-colors shadow-xs"
          >
            Abrir App Entregador <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Card 4: Painel Admin */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Painel Admin</h2>
            <p className="text-sm text-gray-600 mb-4">
              Métricas financeiras (GMV, receita por taxa), gestão de lojas cadastradas, aprovação/suspensão e taxas de comissão.
            </p>
            <ul className="text-xs text-gray-600 space-y-2 mb-6">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Métricas globais de pedidos e GMV
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Aprovar ou suspender vendedores
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Auditoria de repasses e comissões
              </li>
            </ul>
          </div>
          <Link
            href="/admin"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-xs"
          >
            Abrir Painel Admin <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Arquitetura dos Microsserviços */}
      <div className="bg-gray-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-gray-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-rose-400 text-sm font-semibold mb-1">
              <Layers className="w-4 h-4" />
              <span>Arquitetura de Microsserviços Backend (Java 21 / Spring Boot 3)</span>
            </div>
            <h3 className="text-2xl font-bold">Catálogo de Serviços da Plataforma</h3>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/60">
            ● 5 Microsserviços Prontos e Compilados
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-gray-800/80 rounded-xl p-4 border border-gray-700/60">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Gateway</span>
            <h4 className="font-semibold text-white mt-1">API Gateway</h4>
            <p className="text-xs text-gray-400 mt-1">Porta :8080</p>
            <p className="text-xs text-gray-400 mt-2">Roteamento central, CORS e proxy reverso para todos os serviços.</p>
          </div>

          <div className="bg-gray-800/80 rounded-xl p-4 border border-gray-700/60">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Segurança</span>
            <h4 className="font-semibold text-white mt-1">Identity Service</h4>
            <p className="text-xs text-gray-400 mt-1">Porta :8081</p>
            <p className="text-xs text-gray-400 mt-2">Autenticação, JWT, cadastro e papéis (Admin, Vendedor, Cliente, Entregador).</p>
          </div>

          <div className="bg-gray-800/80 rounded-xl p-4 border border-gray-700/60">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Multi-tenant</span>
            <h4 className="font-semibold text-white mt-1">Tenant Service</h4>
            <p className="text-xs text-gray-400 mt-1">Porta :8082</p>
            <p className="text-xs text-gray-400 mt-2">Lojas, slugs, temas dinâmicos (cores/logos) e configurações.</p>
          </div>

          <div className="bg-gray-800/80 rounded-xl p-4 border border-gray-700/60">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Produtos</span>
            <h4 className="font-semibold text-white mt-1">Catalog Service</h4>
            <p className="text-xs text-gray-400 mt-1">Porta :8083</p>
            <p className="text-xs text-gray-400 mt-2">Cardápios, categorias, pratos, disponibilidade e preços por loja.</p>
          </div>

          <div className="bg-gray-800/80 rounded-xl p-4 border border-gray-700/60">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Negócio / Saga</span>
            <h4 className="font-semibold text-white mt-1">Order Service</h4>
            <p className="text-xs text-gray-400 mt-1">Porta :8084</p>
            <p className="text-xs text-gray-400 mt-2">Máquina de estados, Saga do pedido, despacho e histórico.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
