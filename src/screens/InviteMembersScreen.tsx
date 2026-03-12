import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, Pressable, Alert, Share, ScrollView,
  Modal, ActivityIndicator,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useGroupsStore } from "../store/useGroupsStore";
import { supabase } from "../lib/supabase";
import { colors, radius, spacing, typography } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "InviteMembers">;

type RatingHistory = {
  placeName: string;
  value: number;
  comment: string | null;
  ratedAt: string;
};

export default function InviteMembersScreen({ route }: Props) {
  const { groupId, groupName } = route.params;

  const groups = useGroupsStore((s) => s.groups);
  const createInviteCode = useGroupsStore((s) => s.createInviteCode);
  const removeMember = useGroupsStore((s) => s.removeMember);
  const loadGroups = useGroupsStore((s) => s.loadGroups);

  const group = useMemo(() => groups.find((g) => g.id === groupId), [groups, groupId]);
  const [code, setCode] = useState<string>("");
  const [making, setMaking] = useState(false);

  const [historyModal, setHistoryModal] = useState(false);
  const [historyNickname, setHistoryNickname] = useState("");
  const [historyList, setHistoryList] = useState<RatingHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const isAdmin = group?.myRole === "admin";

  useEffect(() => {
    setCode("");
    loadGroups();
  }, [groupId]);

  const onMakeCode = async () => {
    try {
      setMaking(true);
      const c = await createInviteCode(groupId);
      setCode(c);
    } catch (e: any) {
      Alert.alert("실패", e?.message ?? "초대코드 생성 실패");
    } finally {
      setMaking(false);
    }
  };

  const onShare = async () => {
    if (!code) {
      Alert.alert("안내", "먼저 초대코드를 생성해주세요.");
      return;
    }
    await Share.share({
      message: `[${groupName}] 초대코드: ${code}\n앱에서 '초대코드로 참가'에 입력하면 됩니다.`,
    });
  };

  const onCopy = async () => {
    if (!code) {
      Alert.alert("안내", "먼저 초대코드를 생성해주세요.");
      return;
    }
    await Clipboard.setStringAsync(code);
    Alert.alert("복사 완료", "초대코드가 클립보드에 복사됐어요! 📋");
  };

  const onKick = async (userId: string) => {
    if (!isAdmin) return;
    Alert.alert("멤버 제거", "이 멤버를 모임에서 제거할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "제거", style: "destructive",
        onPress: async () => {
          try {
            await removeMember(groupId, userId);
          } catch (e: any) {
            Alert.alert("실패", e?.message ?? "제거 실패");
          }
        },
      },
    ]);
  };

  const onOpenHistory = async (userId: string, nickname: string) => {
    setHistoryNickname(nickname);
    setHistoryList([]);
    setHistoryModal(true);
    setHistoryLoading(true);
    try {
      const placeIds = (group?.places ?? []).map((p) => p.id);
      if (placeIds.length === 0) {
        setHistoryList([]);
        return;
      }

      const { data, error } = await supabase
        .from("place_ratings")
        .select("place_id, value, comment, rated_at")
        .eq("user_id", userId)
        .in("place_id", placeIds)
        .order("rated_at", { ascending: false });

      if (error) throw error;

      const result: RatingHistory[] = (data ?? []).map((r: any) => {
        const place = group?.places.find((p) => p.id === r.place_id);
        return {
          placeName: place?.name ?? "알 수 없음",
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

  return (
    <>
      {/* 히스토리 모달 */}
      <Modal
        visible={historyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setHistoryModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: colors.white,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: spacing.xl, maxHeight: "80%",
          }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>
                  {historyNickname}의 평점 히스토리
                </Text>
                <Text style={{ ...typography.caption, marginTop: 2 }}>
                  {historyList.length}개 평가
                </Text>
              </View>
              <Pressable
                onPress={() => setHistoryModal(false)}
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
                    <View key={i} style={{
                      backgroundColor: colors.background,
                      borderRadius: radius.lg,
                      padding: spacing.lg,
                      gap: spacing.sm,
                    }}>
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
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.md, paddingBottom: 40 }}
      >
        {/* 헤더 */}
        <View style={{ marginBottom: spacing.sm }}>
          <Text style={{ fontSize: 22, fontWeight: "900", color: colors.text }}>{groupName}</Text>
          <Text style={{ ...typography.caption, marginTop: 4 }}>
            초대코드를 공유하면 누구든 참가할 수 있어요
          </Text>
        </View>

        {/* 초대코드 카드 */}
        <View style={{
          backgroundColor: colors.card, borderRadius: radius.lg,
          padding: spacing.lg, gap: spacing.md,
          shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
        }}>
          <Text style={{ ...typography.label }}>초대코드</Text>

          <View style={{
            backgroundColor: code ? colors.primaryLight : colors.background,
            borderRadius: radius.md, padding: spacing.lg, alignItems: "center",
          }}>
            <Text style={{
              fontSize: 28, fontWeight: "900",
              color: code ? colors.primaryDark : colors.textTertiary,
              letterSpacing: 4,
            }}>
              {code || "— — — — — —"}
            </Text>
          </View>

          {/* 관리자/멤버 모두 초대코드 생성 가능 */}
          <Pressable
            onPress={onMakeCode}
            disabled={making}
            style={{
              backgroundColor: colors.primary, padding: spacing.md,
              borderRadius: radius.lg, alignItems: "center",
              opacity: making ? 0.6 : 1,
            }}
          >
            <Text style={{ color: colors.white, fontWeight: "800" }}>
              {making ? "생성 중..." : "초대코드 생성"}
            </Text>
          </Pressable>

          {/* 공유하기 + 복사하기 */}
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Pressable
              onPress={onShare}
              style={{
                flex: 1, padding: spacing.md, borderRadius: radius.lg,
                alignItems: "center", borderWidth: 1, borderColor: colors.border,
              }}
            >
              <Text style={{ fontWeight: "700", color: colors.textSecondary }}>공유하기</Text>
            </Pressable>
            <Pressable
              onPress={onCopy}
              style={{
                flex: 1, padding: spacing.md, borderRadius: radius.lg,
                alignItems: "center", borderWidth: 1, borderColor: colors.border,
              }}
            >
              <Text style={{ fontWeight: "700", color: colors.textSecondary }}>복사하기 📋</Text>
            </Pressable>
          </View>
        </View>

        {/* 멤버 목록 */}
        <Text style={{ ...typography.label, marginTop: spacing.sm }}>
          멤버 · {(group?.members ?? []).length}명
        </Text>
        <Text style={{ ...typography.caption, marginTop: -spacing.sm }}>
          닉네임을 누르면 평점 히스토리를 볼 수 있어요
        </Text>

        {(group?.members ?? []).map((m) => {
          const label = m.nickname ?? m.userId.slice(0, 8);
          return (
            <Pressable
              key={m.userId}
              onPress={() => onOpenHistory(m.userId, label)}
              onLongPress={() => onKick(m.userId)}
              style={{
                backgroundColor: colors.card, borderRadius: radius.lg,
                padding: spacing.lg,
                flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                <View style={{
                  width: 36, height: 36, borderRadius: radius.full,
                  backgroundColor: m.role === "admin" ? colors.primaryLight : colors.background,
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Text style={{ fontSize: 16 }}>👤</Text>
                </View>
                <View>
                  <Text style={{ fontWeight: "700", color: colors.text }}>{label}</Text>
                  <Text style={{ ...typography.caption }}>
                    {isAdmin ? "누르면 히스토리 · 길게 눌러 제거" : "누르면 히스토리"}
                  </Text>
                </View>
              </View>

              <View style={{
                backgroundColor: m.role === "admin" ? colors.primaryLight : colors.background,
                paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.full,
              }}>
                <Text style={{
                  fontSize: 11, fontWeight: "700",
                  color: m.role === "admin" ? colors.primaryDark : colors.textTertiary,
                }}>
                  {m.role === "admin" ? "관리자" : "멤버"}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );
}