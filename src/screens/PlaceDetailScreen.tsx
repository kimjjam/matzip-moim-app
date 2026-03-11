import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, Pressable, ActivityIndicator,
  Alert, ScrollView, TextInput, Linking,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useAuthStore } from "../store/useAuthStore";
import { useGroupsStore } from "../store/useGroupsStore";
import { supabase } from "../lib/supabase";
import { colors, radius, spacing, typography } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "PlaceDetail">;

type PlaceRow = {
  id: string;
  group_id: string;
  name: string;
  tags: string[];
  memo: string | null;
  created_by: string;
  created_at: string;
};

type RatingRow = {
  place_id: string;
  user_id: string;
  value: number | string;
  rated_at: string;
  comment: string | null;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function parseDecimal(text: string) {
  const normalized = text.replace(",", ".").trim();
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function StarBar({ value, max = 5 }: { value: number; max?: number }) {
  const filled = Math.round(value);
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {Array.from({ length: max }).map((_, i) => (
        <Text key={i} style={{ fontSize: 16, color: i < filled ? "#FFB800" : colors.border }}>
          ★
        </Text>
      ))}
    </View>
  );
}

export default function PlaceDetailScreen({ route, navigation }: Props) {
  const { groupId, placeId } = route.params;

  const user = useAuthStore((s: any) => s.user);
  const userId: string | null = useMemo(() => {
    if (!user) return null;
    if (typeof user === "string") return null;
    return user.id ?? null;
  }, [user]);

  const { groups, deletePlace } = useGroupsStore();

  const myRole = useMemo(() => {
    const group = groups.find((g) => g.id === groupId);
    return group?.myRole ?? "member";
  }, [groups, groupId]);

  const [loading, setLoading] = useState(true);
  const [place, setPlace] = useState<PlaceRow | null>(null);
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [nickMap, setNickMap] = useState<Record<string, string>>({});
  const [myRating, setMyRating] = useState<number>(0);
  const [myRatingText, setMyRatingText] = useState<string>("0");
  const [myComment, setMyComment] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const avg = useMemo(() => {
    if (!ratings.length) return 0;
    const sum = ratings.reduce((acc, r) => acc + Number(r.value), 0);
    return sum / ratings.length;
  }, [ratings]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      if (!userId) throw new Error("로그인이 필요합니다.");

      const { data: p, error: pErr } = await supabase
        .from("places").select("*").eq("id", placeId).single();
      if (pErr) throw pErr;
      setPlace(p as PlaceRow);

      const { data: rs, error: rErr } = await supabase
        .from("place_ratings").select("*").eq("place_id", placeId)
        .order("rated_at", { ascending: false });
      if (rErr) throw rErr;

      const rows = ((rs ?? []) as any[]) as RatingRow[];
      setRatings(rows);

      const mine = rows.find((r) => r.user_id === userId);
      const mineVal = mine ? round1(Number(mine.value)) : 0;
      setMyRating(mineVal);
      setMyRatingText(String(mineVal));
      setMyComment(mine?.comment ?? "");

      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
      if (userIds.length) {
        const { data: ps, error: p2Err } = await supabase
          .from("profiles").select("id,nickname").in("id", userIds);
        if (p2Err) throw p2Err;
        const map: Record<string, string> = {};
        (ps ?? []).forEach((x: any) => { map[x.id] = x.nickname; });
        setNickMap(map);
      } else {
        setNickMap({});
      }
    } catch (e: any) {
      Alert.alert("오류", e?.message ?? "불러오기에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [placeId, userId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => { load(); });
    return unsubscribe;
  }, [navigation, load]);

  const inc = (delta: number) => {
    const next = round1(clamp(myRating + delta, 0, 5));
    setMyRating(next);
    setMyRatingText(String(next));
  };

  const saveMyRating = async () => {
    if (!userId) {
      Alert.alert("로그인 필요", "이 기능은 계정 로그인 모드에서 사용됩니다.");
      return;
    }
    try {
      setSaving(true);
      const { error } = await supabase.from("place_ratings").upsert(
        { place_id: placeId, user_id: userId, value: myRating, comment: myComment.trim() || null },
        { onConflict: "place_id,user_id" }
      );
      if (error) throw error;
      await load();
      Alert.alert("완료", "평점이 저장됐어요!");
    } catch (e: any) {
      Alert.alert("오류", e?.message ?? "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const onDeletePlace = () => {
    Alert.alert(
      "맛집 삭제",
      `"${place?.name}" 맛집을 삭제할까요?\n평점 기록도 모두 삭제됩니다.`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제", style: "destructive",
          onPress: async () => {
            try {
              await deletePlace(placeId, groupId);
              navigation.goBack();
            } catch (e: any) {
              Alert.alert("실패", e?.message ?? "삭제에 실패했습니다.");
            }
          },
        },
      ]
    );
  };

  const openNaverMap = () => {
    if (!place) return;
    const query = encodeURIComponent(place.name);
    Linking.openURL(`naver map://search?query=${query}`).catch(() =>
      Linking.openURL(`https://map.naver.com/v5/search/${query}`)
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!place) {
    return (
      <View style={{ flex: 1, padding: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <Text style={{ color: colors.textSecondary, marginBottom: spacing.md }}>맛집을 찾을 수 없어요.</Text>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.lg }}
        >
          <Text style={{ color: colors.white, fontWeight: "700" }}>뒤로</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.xl, gap: spacing.md, paddingBottom: 40 }}
    >
      {/* 헤더 카드 */}
      <View style={{
        backgroundColor: colors.card, borderRadius: radius.lg,
        padding: spacing.lg, gap: spacing.sm,
        shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
      }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Text style={{ fontSize: 22, fontWeight: "900", color: colors.text, flex: 1 }}>
            {place.name}
          </Text>
          {myRole === "admin" && (
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Pressable
                onPress={() => navigation.navigate("EditPlace", { groupId, placeId })}
                style={{
                  paddingVertical: 6, paddingHorizontal: 12,
                  borderRadius: radius.full, backgroundColor: colors.background,
                  borderWidth: 1, borderColor: colors.border,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textSecondary }}>수정</Text>
              </Pressable>
              <Pressable
                onPress={onDeletePlace}
                style={{
                  paddingVertical: 6, paddingHorizontal: 12,
                  borderRadius: radius.full, backgroundColor: colors.dangerLight,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: colors.danger }}>삭제</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* 평균 평점 */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <StarBar value={avg} />
          <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }}>
            {ratings.length ? avg.toFixed(1) : "0.0"}
          </Text>
          <Text style={{ ...typography.caption }}>· {ratings.length}명 참여</Text>
        </View>

        {/* 태그 */}
        {!!place.tags?.length && (
          <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
            {place.tags.map((tag, i) => (
              <View key={i} style={{
                backgroundColor: colors.primaryLight,
                paddingVertical: 3, paddingHorizontal: 8,
                borderRadius: radius.full,
              }}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: colors.primaryDark }}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 메모 */}
        {!!place.memo && (
          <Text style={{ ...typography.body, color: colors.textSecondary }}>
            {place.memo}
          </Text>
        )}

        {/* 네이버 지도 버튼 */}
        <Pressable
          onPress={openNaverMap}
          style={{
            flexDirection: "row", alignItems: "center", justifyContent: "center",
            gap: spacing.sm, padding: spacing.md,
            backgroundColor: "#03C75A",
            borderRadius: radius.lg, marginTop: spacing.sm,
          }}
        >
          <Text style={{ color: colors.white, fontWeight: "800", fontSize: 14 }}>
            🗺️ 네이버 지도에서 보기
          </Text>
        </Pressable>
      </View>

      {/* 내 평점 카드 */}
      <View style={{
        backgroundColor: colors.card, borderRadius: radius.lg,
        padding: spacing.lg, gap: spacing.md,
        shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
      }}>
        <Text style={{ fontWeight: "800", fontSize: 15, color: colors.text }}>내 평점</Text>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.md }}>
          <Pressable
            onPress={() => inc(-0.1)}
            style={{
              width: 44, height: 44, borderRadius: radius.full,
              backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ fontWeight: "700", fontSize: 16, color: colors.text }}>−</Text>
          </Pressable>

          <Text style={{ fontSize: 32, fontWeight: "900", color: colors.text, minWidth: 80, textAlign: "center" }}>
            {myRatingText}
          </Text>

          <Pressable
            onPress={() => inc(0.1)}
            style={{
              width: 44, height: 44, borderRadius: radius.full,
              backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ fontWeight: "700", fontSize: 16, color: colors.text }}>+</Text>
          </Pressable>
        </View>

        <TextInput
          value={myRatingText}
          onChangeText={(t) => {
            setMyRatingText(t);
            const n = parseDecimal(t);
            if (Number.isFinite(n)) {
              setMyRating(round1(clamp(n, 0, 5)));
            }
          }}
          keyboardType="numeric"
          placeholder="직접 입력 (예: 4.3)"
          placeholderTextColor={colors.textTertiary}
          style={{
            backgroundColor: colors.background, borderRadius: radius.md,
            padding: spacing.md, fontSize: 15, color: colors.text,
            textAlign: "center",
          }}
        />

        {/* 한줄평 */}
        <TextInput
          value={myComment}
          onChangeText={setMyComment}
          placeholder="한줄평을 남겨보세요 (선택)"
          placeholderTextColor={colors.textTertiary}
          maxLength={100}
          style={{
            backgroundColor: colors.background, borderRadius: radius.md,
            padding: spacing.md, fontSize: 14, color: colors.text,
          }}
        />
        <Text style={{ ...typography.caption, textAlign: "right", marginTop: -spacing.sm }}>
          {myComment.length}/100
        </Text>

        <Pressable
          onPress={saveMyRating}
          disabled={saving}
          style={{
            backgroundColor: colors.primary, padding: spacing.md,
            borderRadius: radius.lg, opacity: saving ? 0.6 : 1,
            alignItems: "center",
          }}
        >
          <Text style={{ color: colors.white, fontWeight: "800", fontSize: 15 }}>
            {saving ? "저장 중..." : "평점 저장"}
          </Text>
        </Pressable>
      </View>

      {/* 새로고침 */}
      <Pressable
        onPress={load}
        style={{
          borderWidth: 1, borderColor: colors.border,
          padding: spacing.md, borderRadius: radius.lg,
          alignItems: "center",
        }}
      >
        <Text style={{ fontWeight: "700", color: colors.textSecondary }}>새로고침</Text>
      </Pressable>

      {/* 평점 목록 */}
      <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }}>모두의 평점</Text>

      {ratings.length === 0 ? (
        <View style={{
          backgroundColor: colors.card, borderRadius: radius.lg,
          padding: 30, alignItems: "center", gap: spacing.sm,
        }}>
          <Text style={{ fontSize: 30 }}>⭐</Text>
          <Text style={{ ...typography.caption }}>아직 평점이 없어요</Text>
        </View>
      ) : (
        ratings.map((item) => {
          const nickname = nickMap[item.user_id] ?? item.user_id.slice(0, 8);
          return (
            <View key={`${item.user_id}-${item.place_id}`} style={{
              backgroundColor: colors.card, borderRadius: radius.lg,
              padding: spacing.lg, gap: spacing.sm,
              shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
            }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontWeight: "700", color: colors.text }}>{nickname}</Text>
                <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>
                  {Number(item.value).toFixed(1)}
                </Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <StarBar value={Number(item.value)} />
                <Text style={{ ...typography.caption }}>
                  {new Date(item.rated_at).toLocaleDateString()}
                </Text>
              </View>
              {!!item.comment && (
                <View style={{
                  backgroundColor: colors.background,
                  borderRadius: radius.md,
                  padding: spacing.sm,
                  marginTop: 2,
                }}>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                    💬 {item.comment}
                  </Text>
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}