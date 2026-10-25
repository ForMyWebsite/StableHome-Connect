export type Role = 'tenant' | 'landlord' | 'provider' | 'admin';
export type Category =
  | 'Rental assistance'
  | 'Legal aid'
  | 'Housing counseling'
  | 'Mediation'
  | 'Emergency housing'
  | 'Utility assistance'
  | 'Benefits counseling';
export type Profile = {
  id: string;
  display_name: string;
  role: Role;
  state: string;
  county: string;
  zip: string;
  language: string;
  notification_preferences: boolean;
};
export type Assessment = {
  renting?: boolean;
  behind_rent?: boolean;
  future_income_change?: string;
  state: string;
  county: string;
  zip: string;
  county_confirmed: boolean;
  stage: string;
  needs: Category[];
  rent_cents: number;
  arrears_cents: number;
  income_cents: number;
  expenses_cents: number;
  household_size: number;
  language: string;
  court_case: boolean;
  hearing: boolean;
  safety: boolean;
  notice: boolean;
  utilities: boolean;
  communication: string;
  accessibility: string;
};
export type Resource = {
  id: string;
  organization: string;
  description: string;
  category: Category;
  scope: 'national' | 'state' | 'county';
  state: string | null;
  counties: string[];
  website: string;
  phone: string | null;
  address: string | null;
  application_method: string;
  eligibility_notes: string;
  max_income_cents: number | null;
  languages: string[];
  urgent: boolean;
  appointment_required: boolean | null;
  intake_status: string;
  last_verified_at: string | null;
  source_url: string;
  review_status: string;
  active: boolean;
};
export type Match = { resource: Resource; score: number; reasons: string[]; completeness: number };
export type Task = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  due_date: string | null;
  date_source: string;
  status: 'todo' | 'done';
};
export type HousingCase = {
  id: string;
  creator_id: string;
  title: string;
  issue_type: string;
  state: string;
  county: string;
  description: string;
  status: string;
  created_at: string;
};
export type Participant = {
  case_id: string;
  user_id: string;
  display_name: string;
  participant_role: Role;
  consent_mediator: boolean;
  accepted_at: string | null;
  blocked: boolean;
};
export type Message = {
  id: string;
  case_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};
export type Interval = 'monthly' | 'biweekly' | 'weekly';
export type PlanInput = {
  total_cents: number;
  initial_cents: number;
  count: number;
  interval: Interval;
  start_date: string;
};
export type Installment = {
  date: string;
  amount_cents: number;
  balance_cents: number;
  label: string;
};
export type Proposal = {
  id: string;
  case_id: string;
  created_by: string;
  version: number;
  terms: PlanInput;
  status: 'proposed' | 'discussion' | 'rejected' | 'changes_requested';
  created_at: string;
  responses: Record<string, string>;
};
export type Invitation = {
  id: string;
  case_id: string;
  invitee_email: string;
  expires_at: string;
  accepted_at: string | null;
  demo_token?: string;
};
export type DocumentRecord = {
  id: string;
  owner_id: string;
  filename: string;
  category: string;
  storage_path: string;
  size_bytes: number;
  mime_type: string;
  shared_with: string[];
  uploaded_at: string;
  demo?: boolean;
};
export type ImportantDate = {
  id: string;
  user_id: string;
  case_id: string | null;
  title: string;
  scheduled_at: string;
  timezone: string;
  confirmation_status: string;
};
export type SupportLog = {
  id: string;
  user_id: string;
  support_type: string;
  description: string;
  value_cents: number | null;
  recorded_date: string;
  notes: string;
};
export type Notification = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  destination: string;
  created_at: string;
  read_at: string | null;
};
export type Activity = { id: string; user_id: string; description: string; created_at: string };
export type Report = {
  id: string;
  case_id: string;
  reporter_id: string;
  reason: string;
  created_at: string;
  status: string;
};
export type Jurisdiction = {
  id: string;
  state: string;
  county: string;
  notes: string;
  source_url: string;
  verified_at: string | null;
};
export type Workspace = {
  profile: Profile;
  assessment: Assessment | null;
  tasks: Task[];
  resources: Resource[];
  saved_resources: string[];
  cases: HousingCase[];
  participants: Participant[];
  messages: Message[];
  proposals: Proposal[];
  invitations: Invitation[];
  documents: DocumentRecord[];
  dates: ImportantDate[];
  support_logs: SupportLog[];
  notifications: Notification[];
  activity: Activity[];
  reports: Report[];
  providers: Profile[];
  jurisdictions: Jurisdiction[];
  case_events?: {
    id: string;
    case_id: string;
    actor_id: string | null;
    event_type: string;
    created_at: string;
  }[];
  provider_requests?: {
    user_id: string;
    organization: string;
    credential_reference: string;
    status: string;
  }[];
  message_reads?: { message_id: string; user_id: string; read_at: string }[];
  metrics?: Record<string, number | null>;
  setup_error?: string;
};
export type Command = { action: string; data: Record<string, unknown> };
