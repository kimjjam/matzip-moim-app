import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type { Group, GroupMember, Place, PlaceRating, Rating } from "../types";

const nowIso = () => new Date().toISOString();
const clampRating = (n: number) => Math.min(5, Math.max(0, n));

type AddPlaceInput = {
  name: string;
  tags: string[];
  memo?: string;
  createdBy: string;
  rating?: Rating;
};

type GroupsState = {
  groups: Group[];
  loading: boolean;

  loadGroups: () => Promise<void>;
  createGroup: (name: string) => Promise<string>;
  updateGroupName: (groupId: string, name: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  deletePlace: (placeId: string, groupId: string) => Promise<void>;
  joinByInviteCode: (code: string) => Promise<void>;
  createInviteCode: (groupId: string) => Promise<string>;
  removeMember: (groupId: string, userId: string) => Promise<void>;
  addPlace: (groupId: string, place: AddPlaceInput) => Promise<string>;
  ratePlace: (placeId: string, userId: string, value: Rating) => Promise<void>;
};

async function getMyUid() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

function normalizeMyRole(role: string | null | undefined): "admin" | "member" {
  if (role === "owner" || role === "admin") return "admin";
  return "member";
}

async function fetchMyRole(groupId: string, uid: string) {
  const { data, error } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", uid)
    .single();

  if (error) return "member" as const;
  return normalizeMyRole((data as any)?.role);
}

async function fetchMembers(groupId: string): Promise<GroupMember[]> {
  const { data, error } = await supabase
    .from("group_members")
    .select("user_id, role, profiles(nickname)")
    .eq("group_id", groupId);

  if (error) throw error;

  return (data ?? []).map((m: any) => ({
    userId: m.user_id,
    nickname: m?.profiles?.nickname ?? null,
    role: normalizeMyRole(m.role),
  }));
}

async function fetchPlacesSummary(groupId: string): Promise<Place[]> {
  const { data, error } = await supabase
    .from("places")
    .select(`
      id,
      name,
      tags,
      memo,
      created_by,
      visited_at,
      place_ratings (
        user_id,
        value,
        rated_at
      )
    `)
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name ?? "",
    tags: p.tags ?? [],
    memo: p.memo ?? "",
    visitedAt: p.visited_at ?? nowIso(),
    createdBy: p.created_by ?? "",
    ratings: (p.place_ratings ?? []).map((r: any) => ({
      userId: r.user_id,
      value: Number(r.value),
      ratedAt: r.rated_at,
    })) as PlaceRating[],
  }));
}

export const useGroupsStore = create<GroupsState>((set, get) => ({
  groups: [],
  loading: false,

  loadGroups: async () => {
    set({ loading: true });
    try {
      const uid = await getMyUid();
      if (!uid) {
        set({ groups: [] });
        return;
      }

      const { data: memberships, error: mErr } = await supabase
        .from("group_members")
        .select("group_id, role, groups:groups(id, name)")
        .eq("user_id", uid);

      if (mErr) throw mErr;

      const rows = (memberships ?? [])
        .map((m: any) => ({
          id: m?.groups?.id ?? m.group_id,
          name: m?.groups?.name ?? "모임",
          myRole: normalizeMyRole(m.role),
        }))
        .filter((g) => !!g.id);

      const result: Group[] = [];
      for (const g of rows) {
        const [members, places] = await Promise.all([
          fetchMembers(g.id),
          fetchPlacesSummary(g.id),
        ]);

        result.push({
          id: g.id,
          name: g.name,
          myRole: g.myRole,
          members,
          places,
        });
      }

      set({ groups: result });
    } catch (e) {
      console.log("[useGroupsStore.loadGroups] error:", e);
      set({ groups: [] });
    } finally {
      set({ loading: false });
    }
  },

  createGroup: async (name: string) => {
    const uid = await getMyUid();
    if (!uid) throw new Error("로그인이 필요합니다.");

    const trimmed = name.trim();
    if (!trimmed) throw new Error("모임 이름을 입력해주세요.");

    const { data: g, error: gErr } = await supabase
      .from("groups")
      .insert({ name: trimmed, created_by: uid })
      .select("id, name")
      .single();

    if (gErr) throw gErr;

    const { error: memErr } = await supabase.from("group_members").insert({
      group_id: g.id,
      user_id: uid,
      role: "owner",
    });

    if (memErr) throw memErr;

    await get().loadGroups();
    return g.id as string;
  },

  updateGroupName: async (groupId: string, name: string) => {
    const uid = await getMyUid();
    if (!uid) throw new Error("로그인이 필요합니다.");

    const myRole = await fetchMyRole(groupId, uid);
    if (myRole !== "admin") throw new Error("모임 이름 수정은 관리자만 가능합니다.");

    const trimmed = name.trim();
    if (!trimmed) throw new Error("모임 이름을 입력해주세요.");

    const { error } = await supabase
      .from("groups")
      .update({ name: trimmed })
      .eq("id", groupId);

    if (error) throw error;

    await get().loadGroups();
  },

  deleteGroup: async (groupId: string) => {
    const uid = await getMyUid();
    if (!uid) throw new Error("로그인이 필요합니다.");

    const myRole = await fetchMyRole(groupId, uid);
    if (myRole !== "admin") throw new Error("모임 삭제는 관리자만 가능합니다.");

    const { error: rErr } = await supabase
      .from("place_ratings")
      .delete()
      .in(
        "place_id",
        (await supabase.from("places").select("id").eq("group_id", groupId))
          .data?.map((p: any) => p.id) ?? []
      );
    if (rErr) throw rErr;

    const { error: pErr } = await supabase
      .from("places")
      .delete()
      .eq("group_id", groupId);
    if (pErr) throw pErr;

    const { error: memErr } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId);
    if (memErr) throw memErr;

    const { error } = await supabase
      .from("groups")
      .delete()
      .eq("id", groupId);
    if (error) throw error;

    await get().loadGroups();
  },

  deletePlace: async (placeId: string, groupId: string) => {
    const uid = await getMyUid();
    if (!uid) throw new Error("로그인이 필요합니다.");

    const myRole = await fetchMyRole(groupId, uid);
    if (myRole !== "admin") throw new Error("맛집 삭제는 관리자만 가능합니다.");

    const { error: rErr } = await supabase
      .from("place_ratings")
      .delete()
      .eq("place_id", placeId);
    if (rErr) throw rErr;

    const { error } = await supabase
      .from("places")
      .delete()
      .eq("id", placeId);
    if (error) throw error;

    await get().loadGroups();
  },

  joinByInviteCode: async (code: string) => {
    const uid = await getMyUid();
    if (!uid) throw new Error("로그인이 필요합니다.");

    const trimmed = code.trim();
    if (!trimmed) throw new Error("초대코드를 입력해주세요.");

    const { data: groupExists, error: gErr } = await supabase
      .from("groups")
      .select("id")
      .eq("id", trimmed)
      .single();

    if (gErr || !groupExists) throw new Error("유효하지 않은 초대코드입니다.");

    const { error } = await supabase
      .from("group_members")
      .upsert(
        { group_id: trimmed, user_id: uid, role: "member" },
        { onConflict: "group_id,user_id" }
      );

    if (error) throw error;

    await get().loadGroups();
  },

  createInviteCode: async (groupId: string) => {
    const uid = await getMyUid();
    if (!uid) throw new Error("로그인이 필요합니다.");

    const myRole = await fetchMyRole(groupId, uid);
    if (myRole !== "admin") throw new Error("초대코드 생성은 관리자만 가능합니다.");

    return groupId;
  },

  removeMember: async (groupId: string, userId: string) => {
    const uid = await getMyUid();
    if (!uid) throw new Error("로그인이 필요합니다.");

    const myRole = await fetchMyRole(groupId, uid);
    if (myRole !== "admin") throw new Error("멤버 제거는 관리자만 가능합니다.");

    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);

    if (error) throw error;

    await get().loadGroups();
  },

  addPlace: async (groupId: string, place: AddPlaceInput) => {
    const trimmedName = place.name.trim();
    if (!trimmedName) throw new Error("맛집 이름을 입력해주세요.");

    const { data: created, error: pErr } = await supabase
      .from("places")
      .insert({
        group_id: groupId,
        name: trimmedName,
        tags: place.tags ?? [],
        memo: (place.memo ?? "").trim() || null,
        created_by: place.createdBy,
        visited_at: nowIso(),
      })
      .select("id")
      .single();

    if (pErr) throw pErr;

    const r = typeof place.rating === "number" ? clampRating(place.rating) : 0;
    if (r > 0) {
      const { error: rErr } = await supabase.from("place_ratings").upsert(
        { place_id: created.id, user_id: place.createdBy, value: r },
        { onConflict: "place_id,user_id" }
      );
      if (rErr) throw rErr;
    }

    await get().loadGroups();
    return created.id as string;
  },

  ratePlace: async (placeId: string, userId: string, value: Rating) => {
    const r = clampRating(value);

    const { error } = await supabase.from("place_ratings").upsert(
      { place_id: placeId, user_id: userId, value: r },
      { onConflict: "place_id,user_id" }
    );

    if (error) throw error;

    await get().loadGroups();
  },
}));