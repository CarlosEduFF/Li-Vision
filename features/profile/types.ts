export interface UserProfile {
  full_name: string;
  email?: string;
  avatar_url?: string | null;
  role?: string;
}

export interface ProfileResponse {
  ok: boolean;
  profile: UserProfile;
}

export interface AvatarUploadResponse {
  ok: boolean;
  avatar_url?: string;
  detail?: string;
  error?: string;
}
