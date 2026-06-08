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
