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
  signup: (
    email: string,
    password: string,
    nickname: string
  ) => Promise<{ needsEmailConfirm: boolean }>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

let subscribed = false;

function getEmailRedirectTo() {
  // ✅ Expo Go/개발/배포 모두 대응
  return Linking.createURL("auth/callback");
}

async function ensureProfile(userId: string, nickname: string) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      nickname,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (error) throw error;
}

async function fetchNickname(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", userId)
    .single();

  if (error) return null;
  return (data as any)?.nickname ?? null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  hydrated: false,
  user: null,

  hydrate: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (session?.user) {
        let nickname = await fetchNickname(session.user.id);

        // ✅ 프로필이 없으면 user_metadata.nickname으로 생성
        if (!nickname) {
          const metaNick = (session.user.user_metadata as any)?.nickname as string | undefined;
          if (metaNick) {
            await ensureProfile(session.user.id, metaNick);
            nickname = metaNick;
          }
        }

        set({
          user: {
            id: session.user.id,
            email: session.user.email ?? null,
            nickname,
          },
        });
      } else {
        set({ user: null });
      }

      if (!subscribed) {
        subscribed = true;
        supabase.auth.onAuthStateChange(async (_event, session2) => {
          if (session2?.user) {
            let nickname2 = await fetchNickname(session2.user.id);

            if (!nickname2) {
              const metaNick = (session2.user.user_metadata as any)?.nickname as string | undefined;
              if (metaNick) {
                await ensureProfile(session2.user.id, metaNick);
                nickname2 = metaNick;
              }
            }

            set({
              user: {
                id: session2.user.id,
                email: session2.user.email ?? null,
                nickname: nickname2 ?? null,
              },
            });
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

    const emailRedirectTo = getEmailRedirectTo();

    const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { nickname: trimmedNick },
    emailRedirectTo: "matzip://auth/callback",
  },
});
if (error) throw error;


    // 이메일 인증 ON이면 session이 null일 수 있음
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

    let nickname = await fetchNickname(session.user.id);

    // ✅ 프로필이 없으면 metadata로 생성
    if (!nickname) {
      const metaNick = (session.user.user_metadata as any)?.nickname as string | undefined;
      if (metaNick) {
        await ensureProfile(session.user.id, metaNick);
        nickname = metaNick;
      }
    }

    set({
      user: {
        id: session.user.id,
        email: session.user.email ?? null,
        nickname: nickname ?? null,
      },
    });
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({ user: null });
  },
}));
