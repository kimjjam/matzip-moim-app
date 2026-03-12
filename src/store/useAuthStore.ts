import { create } from "zustand";
import { supabase } from "../lib/supabase";
import * as Linking from "expo-linking";

export type AuthUser = {
  id: string;
  email: string | null;
  nickname: string | null;
};

type AuthState = {
  hydrated: boolean;
  user: AuthUser | null;

  hydrate: () => Promise<void>;
  signup: (email: string, password: string, nickname: string) => Promise<{ needsEmailConfirm: boolean }>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

let subscribed = false;

async function ensureProfile(userId: string, nickname: string) {
  const { error } = await supabase.from("profiles").upsert(
    { id: userId, nickname, updated_at: new Date().toISOString() },
    { onConflict: "id" }
  );
  if (error) throw error;
}

async function fetchNickname(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles").select("nickname").eq("id", userId).single();
  if (error) return null;
  return (data as any)?.nickname ?? null;
}

async function resolveUser(user: any) {
  let nickname = await fetchNickname(user.id);

  if (!nickname) {
    // 구글 로그인이면 name으로 닉네임 설정
    const metaNick =
      (user.user_metadata as any)?.nickname ||
      (user.user_metadata as any)?.full_name ||
      (user.user_metadata as any)?.name ||
      null;
    if (metaNick) {
      await ensureProfile(user.id, metaNick);
      nickname = metaNick;
    }
  }

  return {
    id: user.id,
    email: user.email ?? null,
    nickname: nickname ?? null,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  hydrated: false,
  user: null,

  hydrate: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (session?.user) {
        const resolved = await resolveUser(session.user);
        set({ user: resolved });
      } else {
        set({ user: null });
      }

      if (!subscribed) {
        subscribed = true;
        supabase.auth.onAuthStateChange(async (_event, session2) => {
          if (session2?.user) {
            const resolved = await resolveUser(session2.user);
            set({ user: resolved });
          } else {
            set({ user: null });
          }
        });
      }
    } finally {
      set({ hydrated: true });
    }
  },

  signup: async (email, password, nickname) => {
    const trimmedNick = nickname.trim();
    if (!trimmedNick) throw new Error("닉네임을 입력해주세요.");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nickname: trimmedNick },
        emailRedirectTo: "matzipmoimapp://auth/callback",
      },
    });
    if (error) throw error;

    const session = data.session;
    if (session?.user) {
      await ensureProfile(session.user.id, trimmedNick);
      set({
        user: {
          id: session.user.id,
          email: session.user.email ?? null,
          nickname: trimmedNick,
        },
      });
      return { needsEmailConfirm: false };
    }

    return { needsEmailConfirm: true };
  },

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const session = data.session;
    if (!session?.user) throw new Error("로그인 세션을 가져오지 못했습니다.");

    const resolved = await resolveUser(session.user);
    set({ user: resolved });
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({ user: null });
  },
}));