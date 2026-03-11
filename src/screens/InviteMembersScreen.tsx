import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, Alert, Share, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useGroupsStore } from "../store/useGroupsStore";
import { colors, radius, spacing, typography } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "InviteMembers">;

export default function InviteMembersScreen({ route }: Props) {
  const { groupId, groupName } = route.params;

  const groups = useGroupsStore((s) => s.groups);
  const createInviteCode = useGroupsStore((s) => s.createInviteCode);
  const removeMember = useGroupsStore((s) => s.removeMember);

  const group = useMemo(() => groups.find((g) => g.id === groupId), [groups, groupId]);
  const [code, setCode] = useState<string>("");
  const [making, setMaking] = useState(false);

  const isAdmin = group?.myRole === "admin";

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

  useEffect(() => {
    setCode("");
  }, [groupId]);

  return (
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

        {/* 코드 표시 */}
        <View style={{
          backgroundColor: code ? colors.primaryLight : colors.background,
          borderRadius: radius.md, padding: spacing.lg,
          alignItems: "center",
        }}>
          <Text style={{
            fontSize: 28, fontWeight: "900",
            color: code ? colors.primaryDark : colors.textTertiary,
            letterSpacing: 4,
          }}>
            {code || "— — — — — —"}
          </Text>
        </View>

        {/* 코드 생성 버튼 */}
        {isAdmin && (
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
        )}

        {/* 공유 버튼 */}
        <Pressable
          onPress={onShare}
          style={{
            padding: spacing.md, borderRadius: radius.lg,
            alignItems: "center", borderWidth: 1, borderColor: colors.border,
          }}
        >
          <Text style={{ fontWeight: "700", color: colors.textSecondary }}>공유하기</Text>
        </Pressable>

        {!isAdmin && (
          <Text style={{ ...typography.caption, textAlign: "center" }}>
            ※ 초대코드 생성은 관리자만 가능해요
          </Text>
        )}
      </View>

      {/* 멤버 목록 */}
      <Text style={{ ...typography.label, marginTop: spacing.sm }}>
        멤버 · {(group?.members ?? []).length}명
      </Text>

      {(group?.members ?? []).map((m) => {
        const label = m.nickname ?? m.userId.slice(0, 8);
        return (
          <Pressable
            key={m.userId}
            onLongPress={() => onKick(m.userId)}
            disabled={!isAdmin}
            style={{
              backgroundColor: colors.card, borderRadius: radius.lg,
              padding: spacing.lg, gap: 4,
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
                {isAdmin && (
                  <Text style={{ ...typography.caption }}>길게 눌러 제거</Text>
                )}
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
  );
}