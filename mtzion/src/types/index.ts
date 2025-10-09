export interface User {
  id: string;
  email: string;
  role: 'admin' | 'member' | 'super_admin';
  full_name: string;
}

export interface Member {
  id: string;
  user_id?: string;
  member_number: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female';
  phone?: string;
  email?: string;
  address?: string;
  residence?: string;
  place_of_birth?: string;
  family_id?: string;
  baptism_date?: string;
  membership_date: string;
  status: 'active' | 'inactive' | 'transferred' | 'deceased';
  occupation?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
  family?: Family;
  ministries?: Ministry[];
}

export interface Family {
  id: string;
  family_name: string;
  head_of_family?: string;
  address?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  members?: Member[];
}

export interface Ministry {
  id: string;
  name: string;
  description?: string;
  leader_id?: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

export interface Visitor {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  address?: string;
  visit_date: string;
  invited_by?: string;
  follow_up_notes?: string;
  converted_to_member: boolean;
  member_id?: string;
  created_at: string;
  updated_at: string;
  inviter?: Member;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  end_date?: string;
  location?: string;
  event_type: string;
  created_by?: string;
  max_attendees?: number;
  registration_required: boolean;
  qr_code?: string;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  member_id: string;
  event_id?: string;
  attendance_date: string;
  attendance_type: 'service' | 'sabbath_school' | 'prayer_meeting' | 'event';
  check_in_time: string;
  qr_scanned: boolean;
  created_at: string;
  member?: Member;
  event?: Event;
}

export interface Tithe {
  id: string;
  member_id: string;
  amount: number;
  tithe_date: string;
  payment_method: string;
  payment_reference?: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'cancelled';
  notes?: string;
  recorded_by?: string;
  created_at: string;
  updated_at: string;
  member?: Member;
}

export interface Offering {
  id: string;
  member_id: string;
  amount: number;
  offering_type: string;
  offering_date: string;
  payment_method: string;
  payment_reference?: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'cancelled';
  notes?: string;
  recorded_by?: string;
  created_at: string;
  updated_at: string;
  member?: Member;
}

export interface SabbathSchool {
  id: string;
  class_name: string;
  teacher_id?: string;
  age_range?: string;
  description?: string;
  meeting_time?: string;
  classroom?: string;
  max_students?: number;
  created_at: string;
  updated_at: string;
  teacher?: Member;
  student_count?: number;
}

export interface Teen {
  id: string;
  member_id: string;
  sabbath_school_id?: string;
  parent_member_id?: string;
  school_name?: string;
  grade_level?: string;
  interests?: string[];
  medical_conditions?: string;
  created_at: string;
  updated_at: string;
  member?: Member;
  sabbath_school?: SabbathSchool;
  parent?: Member;
}

export interface SystemUser {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  email: string;
  role: 'admin' | 'member' | 'super_admin';
  permissions?: string[];
  is_active: boolean;
  last_login?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SystemLog {
  id: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_data?: any;
  new_data?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user?: SystemUser;
}

export interface UserPrivilege {
  id: string;
  user_id: string;
  user_type: 'admin' | 'member';
  tab_name: string;
  is_allowed: boolean;
  created_at: string;
  updated_at: string;
  user?: SystemUser | Member;
}

export interface PrivilegeTab {
  name: string;
  label: string;
  userType: 'admin' | 'member';
}