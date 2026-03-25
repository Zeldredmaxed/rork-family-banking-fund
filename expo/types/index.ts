export interface MemberProfile {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  is_board_member: boolean;
  is_admin: boolean;
  status: 'active' | 'soft_ban' | 'full_ban' | 'indefinite_ban' | 'locked';
  credit_score: number | null;
  credit_report_date: string | null;
  monthly_contribution: number;
  total_contributed: number;
  loan_access_unlocked: boolean;
  contribution_changes_count: number;
  strike_count: number;
  emergency_fund_uses: number;
  join_date: string | null;
  profile_image_url: string | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  member_id: number;
  name: string;
  is_board_member: boolean;
  is_admin: boolean;
}

export interface LoanApplication {
  id: number;
  type: 'standard' | 'emergency';
  amount: number;
  status: 'pending' | 'approved' | 'active' | 'paid_off' | 'defaulted' | 'denied';
  interest_tier: number;
  monthly_payment: number;
  submitted: string;
  purpose?: string;
  remaining_balance?: number;
  next_payment_date?: string;
  repayment_progress?: number;
}

export interface MeetingRequest {
  id: number;
  subject: string;
  agenda: string;
  preferred_date: string | null;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  submitted: string;
}

export interface PaymentHistoryItem {
  id: number;
  type: 'contribution' | 'loan_payment';
  amount: number;
  date: string;
  status: string;
  running_total?: number;
  notes?: string;
  loan_id?: number;
  payment_number?: number;
}

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

export interface ChatRoom {
  id: number;
  name: string;
  type: 'general' | 'board_only';
  description: string;
  last_message: {
    content: string;
    sender_id: number;
    created_at: string;
  } | null;
}

export interface ChatMessage {
  id: number;
  sender_id: number;
  sender_name: string;
  content: string;
  is_edited: boolean;
  created_at: string;
}

export interface UpcomingPayment {
  type: 'contribution' | 'loan_payment';
  amount: number;
  frequency?: string;
  auto_pay?: boolean;
  loan_id?: number;
  due_date?: string;
  payment_number?: number;
  remaining_payments?: number;
}

export interface Announcement {
  id: number;
  title: string;
  message: string;
  content?: string;
  created_at: string;
  is_pinned?: boolean;
  type?: string;
}

export interface BoardProposal {
  loan_id: number;
  applicant_name: string;
  applicant_id: number;
  amount: number;
  interest_rate: number;
  interest_tier: number;
  term_months: number;
  monthly_payment: number;
  loan_type: 'standard' | 'emergency';
  collateral: string;
  unanimous_required: boolean;
  submitted_at: string;
  votes: {
    total_cast: number;
    total_required: number;
    approvals: number;
    denials: number;
    abstentions: number;
    remaining: number;
  };
  my_vote: {
    has_voted: boolean;
    decision: 'approve' | 'deny' | 'abstain' | null;
  };
}

export interface BoardMember {
  id: number;
  name: string;
  status: string;
  is_board_member: boolean;
  is_admin?: boolean;
  email?: string;
  phone?: string | null;
  monthly_contribution: number;
  total_contributed: number;
  loan_access_unlocked: boolean;
  credit_score: number | null;
  strike_count: number;
  active_loans: number;
}

export interface BoardMeeting {
  id: number;
  subject: string;
  agenda: string;
  requested_by: string;
  preferred_date: string | null;
  scheduled_date: string | null;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  submitted: string;
}

export interface AdminLoan {
  id: number;
  member_id: number;
  member_name: string;
  amount: number;
  status: string;
  interest_rate: number;
  interest_tier: number;
  term_months: number;
  monthly_payment: number;
  remaining_balance: number;
  loan_type: string;
  submitted: string;
}
