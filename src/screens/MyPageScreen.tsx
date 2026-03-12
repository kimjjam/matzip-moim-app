import React, { useState, useEffect } from "react";
import {
  View, Text, Pressable, Alert, ScrollView,
  TextInput, Modal, ActivityIndicator,
} from "react-native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TabParamList, RootStackParamList } from "../navigation/RootNavigator";
import { useAuthStore } from "../store/useAuthStore";
import { useGroupsStore } from "../store/useGroupsStore";
import { supabase } from "../lib/supabase";
import { colors, radius, spacing, typography } from "../theme";

type Props = BottomTabScreenProps<TabParamList, "MyPage">;

type MyRatingHistory = {
  placeName: string;
  groupName: string;
  value: number;
  comment: string | null;
  ratedAt: string;
  placeId: string;
  groupId: string;
};

export default function MyPageScreen({ navigation }: Props) {
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const hydrate = useAuthStore((s) => s.hydrate);
  const groups = useGroupsStore((s) => s.groups);

  const [editingNickname, setEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState("");
  const [saving, setSaving] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState<MyRatingHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  if (!user) return null;

  const displayName = (user as any).nickname?.trim() || (user as any).email || "사용자";
  const currentNickname = (user as any).nickname ?? "";
  const email = (user as any).email ?? "";
  const uid = (user as any).id ?? "";

  const onSaveNickname = async () => {
    const trimmed = newNickname.trim();
    if (!trimmed) { Alert.alert("확인", "닉네임을 입력해주세요."); return; }
    try {
      setSaving(true);
      const { error } = await supabase.from("profiles").update({ nickname: trimmed }).eq("id", uid);
      if (error) throw error;
      await hydrate();
      setEditingNickname(false);
      Alert.alert("완료", "닉네임이 변경됐어요!");
    } catch (e: any) {
      Alert.alert("실패", e?.message ?? "닉네임 변경에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const onLogout = () => {
    Alert.alert("로그아웃", "정말 로그아웃 하시겠어요?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃", style: "destructive",
        onPress: async () => {
          try { await logout(); }
          finally { rootNavigation.reset({ index: 0, routes: [{ name: "Login" }] }); }
        },
      },
    ]);
  };

  const onOpenHistory = async () => {
    setHistoryList([]);
    setShowHistory(true);
    setHistoryLoading(true);
    try {
      // 내가 속한 모든 모임의 place_id 수집
      const allPlaces = groups.flatMap((g) =>
        g.places.map((p) => ({ placeId: p.id, placeName: p.name, groupId: g.id, groupName: g.name }))
      );
      const placeIds = allPlaces.map((p) => p.placeId);

      if (placeIds.length === 0) {
        setHistoryList([]);
        return;
      }

      const { data, error } = await supabase
        .from("place_ratings")
        .select("place_id, value, comment, rated_at")
        .eq("user_id", uid)
        .in("place_id", placeIds)
        .order("rated_at", { ascending: false });

      if (error) throw error;

      const result: MyRatingHistory[] = (data ?? []).map((r: any) => {
        const place = allPlaces.find((p) => p.placeId === r.place_id);
        return {
          placeName: place?.placeName ?? "알 수 없음",
          groupName: place?.groupName ?? "알 수 없음",
          groupId: place?.groupId ?? "",
          placeId: r.place_id,
          value: Number(r.value),
          comment: r.comment ?? null,
          ratedAt: r.rated_at,
        };
      });

      setHistoryList(result);
    } catch (e: any) {
      Alert.alert("실패", e?.message ?? "히스토리 불러오기 실패");
    } finally {
      setHistoryLoading(false);
    }
  };

  const renderStars = (value: number) => {
    const full = Math.round(value);
    return "★".repeat(full) + "☆".repeat(5 - full);
  };

  const formatDate = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  // 통계 계산
  const myStats = (() => {
    const allRatings = groups.flatMap((g) =>
      g.places.flatMap((p) =>
        p.ratings.filter((r) => r.userId === uid).map((r) => r.value)
      )
    );
    if (allRatings.length === 0) return null;
    const avg = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;
    const max = Math.max(...allRatings);
    const min = Math.min(...allRatings);
    return {
      count: allRatings.length,
      avg: Math.round(avg * 10) / 10,
      max,
      min,
    };
  })();

  return (
    <>
      {/* 닉네임 수정 모달 */}
      <Modal visible={editingNickname} transparent animationType="fade" onRequestClose={() => setEditingNickname(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", padding: 30 }}>
          <View style={{ backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md }}>
            <Text style={typography.heading2}>닉네임 수정</Text>
            <TextInput
              value={newNickname}
              onChangeText={setNewNickname}
              placeholder="새 닉네임"
              placeholderTextColor={colors.textTertiary}
              style={{
                backgroundColor: colors.background,
                borderRadius: radius.md,
                padding: spacing.md,
                fontSize: 15, color: colors.text,
              }}
            />
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Pressable
                onPress={() => setEditingNickname(false)}
                style={{ flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.background }}
              >
                <Text style={{ textAlign: "center", fontWeight: "700", color: colors.textSecondary }}>취소</Text>
              </Pressable>
              <Pressable
                onPress={onSaveNickname}
                disabled={saving}
                style={{
                  flex: 1, padding: spacing.md, borderRadius: radius.md,
                  backgroundColor: colors.primary, opacity: saving ? 0.7 : 1,
                  flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8,
                }}
              >
                {saving && <ActivityIndicator color={colors.white} />}
                <Text style={{ textAlign: "center", fontWeight: "700", color: colors.white }}>저장</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* 평점 히스토리 모달 */}
      <Modal visible={showHistory} transparent animationType="slide" onRequestClose={() => setShowHistory(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: colors.white,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: spacing.xl, maxHeight: "85%",
          }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>내 평점 히스토리</Text>
                <Text style={{ ...typography.caption, marginTop: 2 }}>{historyList.length}개 평가</Text>
              </View>
              <Pressable
                onPress={() => setShowHistory(false)}
                style={{
                  width: 32, height: 32, borderRadius: radius.full,
                  backgroundColor: colors.background,
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 16, color: colors.textSecondary }}>✕</Text>
              </Pressable>
            </View>

            {historyLoading ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : historyList.length === 0 ? (
              <View style={{ padding: 40, alignItems: "center", gap: spacing.sm }}>
                <Text style={{ fontSize: 32 }}>🍽️</Text>
                <Text style={{ fontWeight: "700", color: colors.text }}>아직 평가한 맛집이 없어요</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ gap: spacing.md }}>
                  {historyList.map((h, i) => (
                    <Pressable
                      key={i}
                      onPress={() => {
                        setShowHistory(false);
                        rootNavigation.navigate("PlaceDetail", { groupId: h.groupId, placeId: h.placeId });
                      }}
                      style={{
                        backgroundColor: colors.background,
                        borderRadius: radius.lg,
                        padding: spacing.lg,
                        gap: spacing.sm,
                      }}
                    >
                      {/* 모임명 */}
                      <View style={{
                        alignSelf: "flex-start",
                        backgroundColor: colors.primaryLight,
                        paddingVertical: 2, paddingHorizontal: 8,
                        borderRadius: radius.full,
                      }}>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: colors.primaryDark }}>
                          {h.groupName}
                        </Text>
                      </View>

                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ fontSize: 15, fontWeight: "800", color: colors.text, flex: 1 }}>
                          {h.placeName}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.textTertiary }}>
                          {formatDate(h.ratedAt)}
                        </Text>
                      </View>

                      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                        <Text style={{ fontSize: 14, color: "#FFB800" }}>
                          {renderStars(h.value)}
                        </Text>
                        <Text style={{ fontSize: 15, fontWeight: "900", color: colors.text }}>
                          {h.value.toFixed(1)}
                        </Text>
                      </View>

                      {!!h.comment && (
                        <Text style={{ ...typography.body, color: colors.textSecondary }}>
                          "{h.comment}"
                        </Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          padding: spacing.xl,
          paddingTop: insets.top + 12,
          gap: spacing.md,
        }}
      >
        <Text style={{ fontSize: 26, fontWeight: "900", color: colors.text, marginBottom: spacing.sm }}>마이페이지</Text>

        {/* 프로필 카드 */}
        <View style={{
          backgroundColor: colors.primaryLight,
          borderRadius: radius.lg,
          padding: spacing.xl,
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <View style={{
              width: 52, height: 52, borderRadius: radius.full,
              backgroundColor: colors.primary,
              alignItems: "center", justifyContent: "center",
            }}>
              <Text style={{ fontSize: 22 }}>👤</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>{displayName}</Text>
              <Text style={{ ...typography.caption, marginTop: 2 }}>{email}</Text>
            </View>
            <Pressable
              onPress={() => { setNewNickname(currentNickname); setEditingNickname(true); }}
              style={{
                paddingVertical: 6, paddingHorizontal: 12,
                borderRadius: radius.full,
                backgroundColor: colors.white,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primaryDark }}>수정</Text>
            </Pressable>
          </View>
        </View>

        {/* 내 통계 카드 */}
        {myStats && (
          <View style={{
            backgroundColor: colors.white, borderRadius: radius.lg,
            padding: spacing.lg, gap: spacing.md,
            shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
          }}>
            <Text style={{ ...typography.label }}>📊 내 평가 통계</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
              <View style={{ alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 22, fontWeight: "900", color: colors.primary }}>{myStats.count}</Text>
                <Text style={{ ...typography.caption }}>총 평가</Text>
              </View>
              <View style={{ width: 1, backgroundColor: colors.divider }} />
              <View style={{ alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 22, fontWeight: "900", color: "#FFB800" }}>{myStats.avg}</Text>
                <Text style={{ ...typography.caption }}>평균 점수</Text>
              </View>
              <View style={{ width: 1, backgroundColor: colors.divider }} />
              <View style={{ alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 22, fontWeight: "900", color: "#7BBFAA" }}>{myStats.max}</Text>
                <Text style={{ ...typography.caption }}>최고 점수</Text>
              </View>
              <View style={{ width: 1, backgroundColor: colors.divider }} />
              <View style={{ alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 22, fontWeight: "900", color: colors.danger }}>{myStats.min}</Text>
                <Text style={{ ...typography.caption }}>최저 점수</Text>
              </View>
            </View>
          </View>
        )}

        {/* 메뉴 */}
        <View style={{
          backgroundColor: colors.white, borderRadius: radius.lg,
          overflow: "hidden",
          shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
        }}>
          {/* 평점 히스토리 */}
          <Pressable
            onPress={onOpenHistory}
            style={{
              padding: spacing.lg, flexDirection: "row",
              justifyContent: "space-between", alignItems: "center",
              borderBottomWidth: 1, borderColor: colors.divider,
            }}
          >
            <Text style={{ fontWeight: "600", color: colors.text }}>⭐ 내 평점 히스토리</Text>
            <Text style={{ color: colors.textTertiary }}>›</Text>
          </Pressable>

          {/* 비밀번호 변경 */}
          <Pressable
            onPress={() => rootNavigation.navigate("ResetPassword")}
            style={{
              padding: spacing.lg, flexDirection: "row",
              justifyContent: "space-between", alignItems: "center",
            }}
          >
            <Text style={{ fontWeight: "600", color: colors.text }}>비밀번호 변경</Text>
            <Text style={{ color: colors.textTertiary }}>›</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={onLogout}
          style={{
            padding: spacing.lg, borderRadius: radius.lg,
            backgroundColor: colors.dangerLight,
            alignItems: "center",
          }}
        >
          <Text style={{ fontWeight: "700", color: colors.danger }}>로그아웃</Text>
        </Pressable>

        <Text style={{ ...typography.caption, textAlign: "center", marginTop: spacing.sm }}>
          uid: {uid}
        </Text>
      </ScrollView>
    </>
  );
}