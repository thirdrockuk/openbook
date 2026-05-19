export interface PriceBandTemplateEntry {
  label: string;
  age_min: number;
  age_max: number;
  qualifier: string | null;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  starts_at: string;
  ends_at: string;
  status: 'draft' | 'published' | 'cancelled';
  sales_start_at: string | null;
  sales_end_at: string | null;
  banner_image_url: string | null;
  order_number_prefix: string | null;
  price_band_template: PriceBandTemplateEntry[];
  created_at: string;
  updated_at: string;
  ticket_types: TicketType[];
  order_count: number;
}

export interface TicketType {
  id: string;
  event_id: string;
  name: string;
  description: string;
  inventory_total: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  price_bands: PriceBand[];
  available?: number | null;
}

export interface PriceBand {
  id: string;
  ticket_type_id: string;
  label: string;
  age_min: number;
  age_max: number;
  price_pence: number;
  venue_fee_pence: number;
  qualifier: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  amount_pence: number;
  currency: string;
  provider: string;
  provider_txn_id: string | null;
  note: string | null;
  received_at: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  event_id: string;
  order_number: string;
  booker_name: string;
  booker_email: string;
  booker_phone: string | null;
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded' | 'expired';
  total_pence: number;
  currency: string;
  created_at: string;
  confirmed_at: string | null;
  expires_at: string;
  view_token: string;
  order_items: OrderItem[];
  payments: Payment[];
  amount_paid_pence: number;
  balance_pence: number;
}

export interface PaginatedOrders {
  items: Order[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface EventAttendeeReportAttendee {
  order_id: string;
  order_number: string;
  order_status: 'pending' | 'confirmed' | 'cancelled' | 'refunded' | 'expired';
  booker_name: string;
  booker_email: string;
  attendee_name: string;
  attendee_dob: string;
  attendee_age: number;
  ticket_type_id: string;
  ticket_type_name: string | null;
  price_band_label: string | null;
  price_band_qualifier: string | null;
  price_pence: number;
  venue_fee_pence: number;
}

export interface EventAttendeeReportAgeTab {
  label: string;
  min_age: number;
  max_age: number;
}

export interface EventAttendeeReportSettings {
  event_id: string;
  age_tabs: EventAttendeeReportAgeTab[];
}

export interface EventAttendeeReport {
  event_id: string;
  event_title: string;
  event_starts_at: string;
  age_tabs: EventAttendeeReportAgeTab[];
  attendees: EventAttendeeReportAttendee[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  ticket_type_id: string;
  ticket_type_name: string | null;
  price_band_id: string;
  price_band_label: string | null;
  price_band_qualifier: string | null;
  attendee_name: string;
  attendee_dob: string;
  dietary_requirements: string | null;
  access_requirements: string | null;
  price_pence: number;
  standard_price_pence: number | null;
  venue_fee_pence: number;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface BookingViewEvent {
  title: string;
  location: string;
  starts_at: string;
}

export interface BookingView {
  order_number: string;
  booker_name: string;
  status: string;
  total_pence: number;
  currency: string;
  confirmed_at: string | null;
  event: BookingViewEvent;
  order_items: OrderItem[];
  payments: Payment[];
  amount_paid_pence: number;
  balance_pence: number;
}

export interface DashboardStats {
  total_events: number;
  total_orders: number;
  confirmed_orders: number;
  total_revenue_pence: number;
}
