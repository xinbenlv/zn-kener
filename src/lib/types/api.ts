// Types for request/response payloads.
// Keep these decoupled from DB models (DTOs) so you can evolve DB without breaking the API.

import type { MonitorRecordTyped } from "$lib/server/types/db";
import type { MonitorPublicView } from "$lib/types/monitor";

export type ApiError = {
  code: string;
  message: string;
};

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export type GetMonitorsResponse = ApiResponse<{ monitors: MonitorPublicView[] }>;

// Status API types
export interface StatusResponse {
  status: "OK";
}

// Unauthorized response
export interface UnauthorizedResponse {
  error: {
    code: string;
    message: string;
  };
}

// Site Data API types
export interface SiteDataItem {
  key: string;
  value: unknown;
  data_type: string;
}

export interface GetSiteDataResponse {
  site_data: SiteDataItem[];
}

export interface GetSiteDataKeyResponse {
  key: string;
  value: unknown;
  data_type: string;
}

export interface UpdateSiteDataKeyRequest {
  value: unknown;
}

export interface UpdateSiteDataKeyResponse {
  key: string;
  value: unknown;
  data_type: string;
}

export interface NotFoundResponse {
  error: {
    code: string;
    message: string;
  };
}

export interface BadRequestResponse {
  error: {
    code: string;
    message: string;
  };
}

// Monitor API types
export interface MonitorSettings {
  uptime_formula_numerator?: string;
  uptime_formula_denominator?: string;
}

export interface MonitorTypeData {
  [key: string]: unknown;
}

export interface MonitorResponse {
  id: number;
  tag: string;
  name: string;
  description: string | null;
  image: string | null;
  cron: string | null;
  default_status: string | null;
  status: string | null;
  category_name: string | null;
  monitor_type: string;
  type_data: MonitorTypeData | null;
  include_degraded_in_downtime: string;
  is_hidden: string;
  monitor_settings_json: MonitorSettings | null;
  created_at: string;
  updated_at: string;
}

export interface GetMonitorsListResponse {
  monitors: MonitorRecordTyped[];
}

export interface GetMonitorResponse {
  monitor: MonitorRecordTyped;
}

export interface CreateMonitorRequest {
  tag: string;
  name: string;
  description?: string | null;
  image?: string | null;
  cron?: string | null;
  default_status?: string | null;
  status?: string | null;
  category_name?: string | null;
  monitor_type?: string | null;
  type_data?: MonitorTypeData | null;
  include_degraded_in_downtime?: string;
  is_hidden?: string;
  monitor_settings_json?: MonitorSettings | null;
}

export interface CreateMonitorResponse {
  monitor: MonitorRecordTyped;
}

export interface UpdateMonitorRequest {
  name?: string;
  description?: string | null;
  image?: string | null;
  cron?: string | null;
  default_status?: string | null;
  status?: string | null;
  category_name?: string | null;
  monitor_type?: string | null;
  type_data?: MonitorTypeData | null;
  include_degraded_in_downtime?: string;
  is_hidden?: string;
  monitor_settings_json?: MonitorSettings | null;
}

export interface UpdateMonitorResponse {
  monitor: MonitorRecordTyped;
}

// Monitoring Data API types
export interface MonitoringDataPoint {
  monitor_tag: string;
  timestamp: number;
  status: string | null;
  latency: number | null;
  type: string | null;
}

export interface GetMonitoringDataResponse {
  data: MonitoringDataPoint[];
}

export interface GetMonitoringDataPointResponse {
  data: MonitoringDataPoint;
}

export interface UpdateMonitoringDataRangeRequest {
  start_ts: number;
  end_ts: number;
  status: "UP" | "DOWN" | "DEGRADED";
  latency: number;
  deviation?: number;
}

export interface UpdateMonitoringDataRangeResponse {
  message: string;
  updated_count: number;
}

export interface UpdateMonitoringDataPointRequest {
  status?: "UP" | "DOWN" | "DEGRADED";
  latency?: number;
}

export interface UpdateMonitoringDataPointResponse {
  data: MonitoringDataPoint;
}

// Incident API types
export interface IncidentMonitor {
  monitor_tag: string;
  impact: string;
}

export interface IncidentResponse {
  id: number;
  title: string;
  start_date_time: number;
  end_date_time: number | null;
  state: string;
  incident_source: string;
  monitors: IncidentMonitor[];
  created_at: string;
  updated_at: string;
}

export interface IncidentDetailResponse extends IncidentResponse {
  incident_type: string;
}

export interface GetIncidentsListResponse {
  incidents: IncidentResponse[];
}

export interface GetIncidentResponse {
  incident: IncidentDetailResponse;
}

export interface CreateIncidentRequest {
  title: string;
  start_date_time: number;
  end_date_time?: number | null;
  monitors?: IncidentMonitor[];
}

export interface CreateIncidentResponse {
  incident: IncidentDetailResponse;
}

export interface UpdateIncidentRequest {
  title?: string;
  start_date_time?: number;
  end_date_time?: number | null;
  monitors?: IncidentMonitor[];
}

export interface UpdateIncidentResponse {
  incident: IncidentDetailResponse;
}

export interface DeleteIncidentResponse {
  message: string;
}

// Incident Comment API types
export interface CommentResponse {
  id: number;
  incident_id: number;
  comment: string;
  timestamp: number;
  state: string;
  created_at: string;
  updated_at: string;
}

export interface GetCommentsListResponse {
  comments: CommentResponse[];
}

export interface GetCommentResponse {
  comment: CommentResponse;
}

export interface CreateCommentRequest {
  comment: string;
  timestamp?: number;
  state: string;
}

export interface CreateCommentResponse {
  comment: CommentResponse;
}

export interface UpdateCommentRequest {
  comment?: string;
  timestamp?: number;
  state?: string;
}

export interface UpdateCommentResponse {
  comment: CommentResponse;
}

export interface DeleteCommentResponse {
  message: string;
}

// Maintenance API types
export interface MaintenanceMonitor {
  monitor_tag: string;
  impact: "UP" | "DOWN" | "DEGRADED" | "MAINTENANCE";
}

export interface MaintenanceResponse {
  id: number;
  title: string;
  description: string | null;
  start_date_time: number;
  rrule: string;
  duration_seconds: number;
  status: "ACTIVE" | "INACTIVE";
  monitors: MaintenanceMonitor[];
  created_at: string;
  updated_at: string;
}

export interface GetMaintenancesListResponse {
  maintenances: MaintenanceResponse[];
}

export interface GetMaintenanceResponse {
  maintenance: MaintenanceResponse;
}

export interface CreateMaintenanceRequest {
  title: string;
  description?: string | null;
  start_date_time: number;
  rrule: string;
  duration_seconds: number;
  monitors?: MaintenanceMonitor[];
}

export interface CreateMaintenanceResponse {
  maintenance: MaintenanceResponse;
}

export interface UpdateMaintenanceRequest {
  title?: string;
  description?: string | null;
  start_date_time?: number;
  rrule?: string;
  duration_seconds?: number;
  status?: "ACTIVE" | "INACTIVE";
  monitors?: MaintenanceMonitor[];
}

export interface UpdateMaintenanceResponse {
  maintenance: MaintenanceResponse;
}

// Maintenance Event API types
export interface MaintenanceEventResponse {
  id: number;
  maintenance_id: number;
  start_date_time: number;
  end_date_time: number;
  status: "SCHEDULED" | "READY" | "ONGOING" | "COMPLETED" | "CANCELLED";
  created_at: string;
  updated_at: string;
}

export interface GetMaintenanceEventsListResponse {
  events: MaintenanceEventResponse[];
  page: number;
  limit: number;
}

export interface GetMaintenanceEventResponse {
  event: MaintenanceEventResponse;
}

export interface UpdateMaintenanceEventRequest {
  start_date_time: number;
  end_date_time: number;
}

export interface UpdateMaintenanceEventResponse {
  event: MaintenanceEventResponse;
}

export interface DeleteMaintenanceEventResponse {
  message: string;
}

export interface DeleteMaintenanceResponse {
  message: string;
}

// Combined Maintenance Event with Maintenance details
export interface MaintenanceEventDetailResponse {
  maintenance_id: number;
  event_id: number;
  event_start_date_time: number;
  event_end_date_time: number;
  event_status: "SCHEDULED" | "READY" | "ONGOING" | "COMPLETED" | "CANCELLED";
  maintenance_title: string;
  maintenance_description: string | null;
  maintenance_status: "ACTIVE" | "INACTIVE";
  maintenance_rrule: string;
  maintenance_duration_seconds: number;
  monitors: MaintenanceMonitor[];
}

export interface GetMaintenanceEventsDetailListResponse {
  events: MaintenanceEventDetailResponse[];
  page: number;
  limit: number;
  total: number;
}

// ============ Pages API Types ============

export interface PageSettingsIncidentsOngoing {
  show: boolean;
}

export interface PageSettingsIncidentsResolved {
  show: boolean;
  max_count: number;
  days_in_past: number;
}

export interface PageSettingsIncidents {
  enabled: boolean;
  ongoing: PageSettingsIncidentsOngoing;
  resolved: PageSettingsIncidentsResolved;
}

export interface PageSettingsMaintenancesPast {
  show: boolean;
  max_count: number;
  days_in_past: number;
}

export interface PageSettingsMaintenancesUpcoming {
  show: boolean;
  max_count: number;
  days_in_future: number;
}

export interface PageSettingsMaintenancesOngoing {
  show: boolean;
  past: PageSettingsMaintenancesPast;
  upcoming: PageSettingsMaintenancesUpcoming;
}

export interface PageSettingsMaintenances {
  enabled: boolean;
  ongoing: PageSettingsMaintenancesOngoing;
}

export interface PageSettings {
  incidents: PageSettingsIncidents;
  include_maintenances: PageSettingsMaintenances;
}

export interface PageMonitorResponse {
  monitor_tag: string;
}

export interface PageResponse {
  id: number;
  page_path: string;
  page_title: string;
  page_header: string;
  page_subheader: string | null;
  page_logo: string | null;
  page_settings: PageSettings;
  monitors: PageMonitorResponse[];
  created_at: string;
  updated_at: string;
}

export interface GetPagesListResponse {
  pages: PageResponse[];
}

export interface GetPageResponse {
  page: PageResponse;
}

export interface CreatePageRequest {
  page_path: string;
  page_title: string;
  page_header: string;
  page_subheader?: string | null;
  page_logo?: string | null;
  page_settings?: Partial<PageSettings>;
  monitors?: string[];
}

export interface CreatePageResponse {
  page: PageResponse;
}

export interface UpdatePageRequest {
  page_path?: string;
  page_title?: string;
  page_header?: string;
  page_subheader?: string | null;
  page_logo?: string | null;
  page_settings?: Partial<PageSettings>;
  monitors?: string[];
}

export interface UpdatePageResponse {
  page: PageResponse;
}

export interface DeletePageResponse {
  message: string;
}

export interface DeleteMonitorResponse {
  message: string;
}

// ============ API Key management (zn-kener fork) ============
// Per-key RBAC: `permissions` is the list of permission ids the key is scoped
// to, or null for a legacy / full-access key.
export interface ApiKeyListItem {
  id: number;
  name: string;
  masked_key: string;
  status: string;
  permissions: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface GetApiKeysResponse {
  api_keys: ApiKeyListItem[];
}

export interface CreateApiKeyRequest {
  name: string;
  // Optional subset of permission ids. Omitted/null/empty => full-access key.
  permissions?: string[] | null;
}

export interface CreateApiKeyResponse {
  // The plaintext key is returned ONCE, at creation time, and never again.
  api_key: {
    name: string;
    key: string;
    permissions: string[] | null;
  };
}

export interface UpdateApiKeyRequest {
  status: "ACTIVE" | "INACTIVE";
}

export interface UpdateApiKeyResponse {
  message: string;
}

export interface DeleteApiKeyResponse {
  message: string;
}

export interface PermissionCatalogItem {
  id: string;
  permission_name: string;
}

export interface GetPermissionsResponse {
  permissions: PermissionCatalogItem[];
}

// ============ Trigger management (zn-kener fork) ============
export interface TriggerResponse {
  id: number;
  name: string;
  trigger_type: string | null;
  trigger_desc: string | null;
  trigger_status: string | null;
  trigger_meta: unknown;
  created_at: string;
  updated_at: string;
}

export interface GetTriggersResponse {
  triggers: TriggerResponse[];
}

export interface CreateTriggerRequest {
  name: string;
  trigger_type: string;
  trigger_desc?: string | null;
  trigger_status?: string | null;
  // Provider-specific config (email/webhook/slack/discord). Stored as JSON.
  trigger_meta?: unknown;
}

export interface UpdateTriggerRequest {
  name?: string;
  trigger_type?: string | null;
  trigger_desc?: string | null;
  trigger_status?: string | null;
  trigger_meta?: unknown;
}

// ============ Alert config / alert history management (zn-kener fork) ============
// Mirrors MonitorAlertConfigCreateInput/UpdateInput in src/lib/server/types/db.ts.
export interface CreateAlertConfigRequest {
  monitor_tags: string[];
  alert_for: "STATUS" | "LATENCY" | "UPTIME";
  alert_value: string;
  failure_threshold?: number;
  success_threshold?: number;
  alert_description?: string | null;
  create_incident?: "YES" | "NO";
  is_active?: "YES" | "NO";
  severity?: "CRITICAL" | "WARNING";
  trigger_ids?: number[];
}

export interface UpdateAlertConfigRequest {
  monitor_tags?: string[];
  alert_for?: "STATUS" | "LATENCY" | "UPTIME";
  alert_value?: string;
  failure_threshold?: number;
  success_threshold?: number;
  alert_description?: string | null;
  create_incident?: "YES" | "NO";
  is_active?: "YES" | "NO";
  severity?: "CRITICAL" | "WARNING";
  trigger_ids?: number[];
}

export interface UpdateAlertRequest {
  alert_status: "TRIGGERED" | "RESOLVED";
}

// ============ User / role management (zn-kener fork) ============
export interface CreateUserInviteRequest {
  email: string;
  name: string;
  role_ids: string[];
}

export interface UpdateUserRequest {
  role_ids?: string[];
  // 1 = active, 0 = inactive (matches ManualUpdateUserData is_active contract).
  is_active?: number;
}

export interface CreateRoleRequest {
  id: string;
  role_name: string;
  permission_ids?: string[];
}

export interface UpdateRoleRequest {
  role_name?: string;
  status?: string;
  permission_ids?: string[];
}

export interface RoleUserRequest {
  user_id: number;
}

// ============ Subscriber / email-template management (zn-kener fork) ============
export interface CreateSubscriberRequest {
  email: string;
  incidents?: boolean;
  maintenances?: boolean;
}

export interface UpdateSubscriptionRequest {
  event_type: "incidents" | "maintenances";
  enabled: boolean;
}

export interface UpdateEmailTemplateRequest {
  template_subject?: string | null;
  template_html_body?: string | null;
  template_text_body?: string | null;
}

// ============ Monitor extras / page reorder / maintenance event (zn-kener fork) ============
export interface DeleteMonitorDataResponse {
  message: string;
  deleted_count: number;
}

export interface CloneMonitorRequest {
  new_tag: string;
  new_name: string;
}

export interface ReorderPageMonitorsRequest {
  monitor_tags: string[];
}

export interface CreateMaintenanceEventRequest {
  start_date_time: number;
  end_date_time: number;
}
