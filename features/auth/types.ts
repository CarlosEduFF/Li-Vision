export interface LoginResponse {
  ok: boolean;
  token: string;
  refresh_token: string;
  user_id: number;
  role: string;
  full_name: string;
  avatar_url?: string;
}

export interface RegisterResponse {
  ok: boolean;
  token: string;
  refresh_token: string;
  user_id: number;
  user?: string | number;
  role: string;
  full_name: string;
  detail?: string;
}

export interface RefreshResponse {
  ok: boolean;
  token: string;
  refresh_token?: string;
}
