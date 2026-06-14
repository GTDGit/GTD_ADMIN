import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

// ---------------------------------------------------------------------------
// Payment methods (canonical method + Method_Provider_Mapping)
//
// The admin API now returns one canonical method per (type, code), each with
// an ordered `providers` array of bindings. These helpers wrap the new admin
// endpoints:
//   GET  /v1/admin/payment-methods                       -> methods[]
//   PUT  /v1/admin/payment-methods/{id}                  -> canonical fields
//   GET  /v1/admin/payment-methods/{type}/{code}/providers
//   PUT  /v1/admin/payment-methods/{type}/{code}/providers
// ---------------------------------------------------------------------------

// ProviderBinding mirrors the API's MethodProviderBinding (a row of the
// payment_method_providers / Method_Provider_Mapping table).
export interface ProviderBinding {
  id: number;
  paymentMethodId: number;
  provider: string;
  priority: number;
  isActive: boolean;
  isMaintenance: boolean;
  maintenanceMessage?: string;
  providerBankCode?: string;
  providerChannel?: string;
  createdAt?: string;
  updatedAt?: string;
}

// AdminPaymentMethod is a canonical method (one per type+code) plus its ordered
// provider bindings.
export interface AdminPaymentMethod {
  id: number;
  type: string;
  code: string;
  name: string;
  provider: string;
  providerDisplayName?: string;
  feeType: 'flat' | 'percent';
  feeFlat: number;
  feePercent: number;
  feeMin: number;
  feeMax: number;
  minAmount: number;
  maxAmount: number;
  expiredDuration: number;
  displayOrder: number;
  isActive: boolean;
  isMaintenance: boolean;
  maintenanceMessage?: string;
  logoUrl?: string;
  paymentInstruction?: any;
  providers: ProviderBinding[];
}

// AdminUpdateMethodBody carries the editable canonical method fields. All
// fields are optional; only provided fields are applied by the API.
export interface AdminUpdateMethodBody {
  provider?: string;
  feeType?: 'flat' | 'percent';
  feeFlat?: number;
  feePercent?: number;
  feeMin?: number;
  feeMax?: number;
  minAmount?: number;
  maxAmount?: number;
  expiredDuration?: number;
  displayOrder?: number;
  isActive?: boolean;
  isMaintenance?: boolean;
  maintenanceMessage?: string;
  paymentInstruction?: any;
}

// BindingUpdate is one ordered binding in the providers PUT body.
export interface BindingUpdate {
  provider: string;
  priority: number;
  isActive: boolean;
  isMaintenance: boolean;
  maintenanceMessage?: string;
}

// GET /v1/admin/payment-methods — canonical methods (de-duplicated by
// type+code) each with its ordered provider bindings.
export async function fetchPaymentMethods(): Promise<AdminPaymentMethod[]> {
  const { data } = await api.get('/v1/admin/payment-methods');
  const methods = data?.data?.methods ?? data?.data ?? [];
  return (methods as AdminPaymentMethod[]).map((m) => ({
    ...m,
    providers: m.providers ?? [],
  }));
}

// PUT /v1/admin/payment-methods/{id} — edit a canonical method's fields.
export async function updatePaymentMethod(id: number, body: AdminUpdateMethodBody): Promise<AdminPaymentMethod> {
  const { data } = await api.put(`/v1/admin/payment-methods/${id}`, body);
  return data?.data;
}

// GET /v1/admin/payment-methods/{type}/{code}/providers — bindings ordered by
// priority ASC.
export async function fetchMethodProviders(type: string, code: string): Promise<ProviderBinding[]> {
  const { data } = await api.get(
    `/v1/admin/payment-methods/${encodeURIComponent(type)}/${encodeURIComponent(code)}/providers`
  );
  return data?.data ?? [];
}

// PUT /v1/admin/payment-methods/{type}/{code}/providers — update the ordered
// bindings (priority + active/maintenance) for a method.
export async function updateMethodProviders(
  type: string,
  code: string,
  providers: BindingUpdate[]
): Promise<ProviderBinding[]> {
  const { data } = await api.put(
    `/v1/admin/payment-methods/${encodeURIComponent(type)}/${encodeURIComponent(code)}/providers`,
    { providers }
  );
  return data?.data ?? [];
}

// ---------------------------------------------------------------------------
// Reconciliation (verify-by-inquiry mismatches)
//
// A reconciliation row is created when an inbound provider webhook disagreed
// with the authoritative provider inquiry (status and/or amount). Open rows
// are frozen — the payment is not transitioned and no client callback is sent
// until the row is resolved (automatically by the worker/next webhook, or
// manually by an admin here).
//   GET  /v1/admin/reconciliations           -> { reconciliations, pagination }
//   GET  /v1/admin/reconciliations/{id}       -> reconciliation
//   POST /v1/admin/reconciliations/{id}/resolve { status, note }
// ---------------------------------------------------------------------------

export interface Reconciliation {
  id: number;
  paymentId: string;
  provider: string;
  reason: string;
  webhookStatus?: string;
  inquiryStatus?: string;
  webhookAmount?: number;
  inquiryAmount?: number;
  expectedAmount?: number;
  webhookPayload?: any;
  inquiryPayload?: any;
  status: string;
  resolvedStatus?: string;
  resolvedBy?: string;
  resolutionNote?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface ReconciliationListParams {
  status?: string;
  provider?: string;
  reason?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ReconciliationListResult {
  reconciliations: Reconciliation[];
  totalItems: number;
}

// GET /v1/admin/reconciliations — filtered list ordered by created_at DESC.
export async function fetchReconciliations(
  params: ReconciliationListParams
): Promise<ReconciliationListResult> {
  const { data } = await api.get('/v1/admin/reconciliations', { params });
  return {
    reconciliations: data?.data?.reconciliations ?? [],
    totalItems: data?.data?.pagination?.totalItems ?? 0,
  };
}

// GET /v1/admin/reconciliations/{id} — single reconciliation.
export async function getReconciliation(id: number): Promise<Reconciliation> {
  const { data } = await api.get(`/v1/admin/reconciliations/${id}`);
  return data?.data;
}

// POST /v1/admin/reconciliations/{id}/resolve — apply a final status to the
// payment, forward to the client, and close the row.
export async function resolveReconciliation(
  id: number,
  body: { status: string; note?: string }
): Promise<void> {
  await api.post(`/v1/admin/reconciliations/${id}/resolve`, body);
}

// ---------------------------------------------------------------------------
// Static QRIS merchants + payments
//
// The gateway owns merchant CRUD and read-only payment listing. storeId is
// always entered manually (it identifies the merchant on inbound webhooks);
// NMID, terminalId, name, and city are parsed automatically from qrisString.
// Pakailink merchants can request the QR string via the api proxy:
//   GET  /v1/admin/qris/merchants                       -> { items, pagination }
//   POST /v1/admin/qris/merchants                       -> merchant
//   GET  /v1/admin/qris/merchants/{id}                  -> merchant
//   PUT  /v1/admin/qris/merchants/{id}                  -> merchant
//   POST /v1/admin/qris/merchants/{id}/pakailink-generate -> merchant
//   GET  /v1/admin/qris/payments                        -> { items, pagination }
// ---------------------------------------------------------------------------

export type QRISProvider = 'pakailink' | 'nobu';

export interface QRISMerchant {
  id: number;
  clientId?: number;
  provider: QRISProvider;
  merchantName?: string;
  merchantCity?: string;
  merchantCategoryCode?: string;
  nmid?: string;
  storeId: string;
  terminalId?: string;
  qrisString?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface QRISPayment {
  id: number;
  qrisMerchantId?: number;
  provider: QRISProvider;
  referenceNo: string;
  partnerReferenceNo?: string;
  rrn?: string;
  paymentReferenceNo?: string;
  issuerId?: string;
  storeId: string;
  terminalId?: string;
  amount: number;
  feeAmount?: number;
  nettAmount?: number;
  payerName?: string;
  payerPhone?: string;
  status: string;
  paidAt?: string;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface QRISMerchantListParams {
  provider?: string;
  clientId?: number;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface QRISMerchantUpsertBody {
  clientId?: number | null;
  provider: string;
  storeId: string;
  terminalId?: string;
  qrisString?: string;
  status?: string;
  merchantName?: string;
  merchantCity?: string;
}

export interface QRISPaymentListParams {
  provider?: string;
  qrisMerchantId?: number;
  storeId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function fetchQRISMerchants(
  params: QRISMerchantListParams
): Promise<{ items: QRISMerchant[]; pagination: Pagination }> {
  const { data } = await api.get('/v1/admin/qris/merchants', { params });
  return {
    items: data?.data?.items ?? [],
    pagination: data?.data?.pagination ?? { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
  };
}

export async function getQRISMerchant(id: number): Promise<QRISMerchant> {
  const { data } = await api.get(`/v1/admin/qris/merchants/${id}`);
  return data?.data;
}

export async function createQRISMerchant(body: QRISMerchantUpsertBody): Promise<QRISMerchant> {
  const { data } = await api.post('/v1/admin/qris/merchants', body);
  return data?.data;
}

export async function updateQRISMerchant(
  id: number,
  body: QRISMerchantUpsertBody
): Promise<QRISMerchant> {
  const { data } = await api.put(`/v1/admin/qris/merchants/${id}`, body);
  return data?.data;
}

// POST .../pakailink-generate — drives the api proxy to register+generate the
// static QR, persists it, and returns the updated merchant with parsed fields.
export async function requestPakailinkQR(id: number): Promise<QRISMerchant> {
  const { data } = await api.post(`/v1/admin/qris/merchants/${id}/pakailink-generate`);
  return data?.data;
}

export async function fetchQRISPayments(
  params: QRISPaymentListParams
): Promise<{ items: QRISPayment[]; pagination: Pagination }> {
  const { data } = await api.get('/v1/admin/qris/payments', { params });
  return {
    items: data?.data?.items ?? [],
    pagination: data?.data?.pagination ?? { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
  };
}
