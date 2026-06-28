import type { UserRole } from '../enums';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Employee {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  designation: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Combined view used in most API responses */
export interface EmployeeWithUser extends Employee {
  email: string;
  role: UserRole;
  is_active: boolean;
  assigned_students_count: number;
}
