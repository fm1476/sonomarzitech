export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export interface RuntimeConfig { mode: 'local' | 'aws'; apiBase: string; clientId: string; cognitoDomain: string; redirectUri: string; }
export interface Identity { id: string; email: string; display_name: string; platform_admin: boolean; }
export interface Membership { tenant_id: string; agency_id: string; person_id: string; role_ids: string[]; status: string; tenant_name?: string; agency_name?: string; }
export interface MeResponse { success: boolean; user: Identity; memberships: Membership[]; }
export interface WorkspaceRecord { key: string; value: JsonValue; version: number; deleted: boolean; updated_at: string; updated_by: string | null; }
export interface RecordChange { key: string; value: JsonValue; expected_version: number; deleted: boolean; }
export interface WorkspaceResponse { success: boolean; tenant_id: string; agency_id: string; person_id: string; role_ids: string[]; records: WorkspaceRecord[]; template: Record<string, JsonValue>; tenant: Record<string, JsonValue>; agency: Record<string, JsonValue>; }
export interface LegacyBridge { signIn(): Promise<void>; signOut(): Promise<void>; state(): Record<string, JsonValue>; seed(): Promise<Record<string, JsonValue>>; flush(): Promise<boolean>; persist(): void; flatKeys(): string[]; navigate(route: string): void; context(): {tenantId: string; agencyId: string}; changeContext(tenant: string, agency: string): Promise<void>; }
declare global { interface Window { SonoMarziConfig: RuntimeConfig; SonoMarziLegacy: LegacyBridge; SonoMarziReady: Promise<void>; SonoMarziClient: ReturnType<typeof import('./client').createCompatibilityClient>; } }
