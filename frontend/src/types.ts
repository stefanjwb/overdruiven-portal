export interface User {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'organizer' | 'admin';
  first_name?: string | null;
  last_name?: string | null;
  avatar?: string | null;
}

export interface InviteCode {
  id: number;
  code: string;
  role: string;
  created_at: string;
}
