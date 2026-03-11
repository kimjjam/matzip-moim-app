import React, { useEffect } from "react";
import {
  View, Text, Pressable, Alert, ScrollView,
  TextInput, Modal, ActivityIndicator,
} from "react-native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TabParamList, RootStackParamList } from "../navigation/RootNavigator";
import { useGroupsStore } from "../store/useGroupsStore";
import { useAuthStore } from "../store/useAuthStore";
import { colors, radius, spacing, typography } from "../theme";

type Props = BottomTabScreenProps<TabParamList, "Groups">;

const MINT = "#A8DAC5";
const MINT_DARK = "#7BBFAA";

export default function GroupScreen({ navigation }: Props) {
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { groups, loadGroups, loading, deleteGroup, updateGroupName } = useGroupsStore();

  const [editingGroupId, setEditingGroupId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState("");
  const [fabOpen, setFabOpen] = React.useState(false);

  const toggleFab = () => setFabOpen(!fabOpen);
  const closeFab = () => setFabOpen(false);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const onDeleteGroup = (groupId: string, groupName: string) => {
    Alert.alert(
      "모임 삭제",
      `"${groupName}" 모임을 삭제할까요?\n맛집 목록과 평점이 모두 삭제됩니다.`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제", style: "destructive",
          onPress: async () => {
            try { await deleteGroup(groupId); }
            catch (e: any) { Alert.alert("실패", e?.message ?? "삭제에 실패했습니다."); }
          },
        },
      ]
    );
  };

  const onSaveGroupName = async () => {
    if (!editingGroupId) return;
    try {
      await updateGroupName(editingGroupId, editingName);
      setEditingGroupId(null);
    } catch (e: any) {
      Alert.alert("실패", e?.message ?? "수정에 실패했습니다.");
    }
  };

  if (!user) return null;

  return (
    <>
      <Modal visible={!!editingGroupId} transparent animationType="fade" onRequestClose={() => setEditingGroupId(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", padding: 30 }}>
          <View style={{ backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md }}>
            <Text style={typography.heading2}>모임 이름 수정</Text>
            <TextInput
              value={editingName}
              onChangeText={setEditingName}
              placeholder="새 모임 이름"
              placeholderTextColor={colors.textTertiary}
              style={{
                backgroundColor: colors.background, borderRadius: radius.md,
                padding: spacing.md, fontSize: 15, color: colors.text,
              }}
            />
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Pressable
                onPress={() => setEditingGroupId(null)}
                style={{ flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.background }}
              >
                <Text style={{ textAlign: "center", fontWeight: "700", color: colors.textSecondary }}>취소</Text>
              </Pressable>
              <Pressable
                onPress={onSaveGroupName}
                style={{ flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary }}
              >
                <Text style={{ textAlign: "center", fontWeight: "700", color: colors.white }}>저장</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          padding: spacing.xl,
          paddingTop: insets.top + 12,
          paddingBottom: 100,
          gap: spacing.md,
        }}
      >
        <View style={{ marginBottom: spacing.sm }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
            <Text style={{ fontSize: 26, fontWeight: "900", color: colors.text }}>🍽️ MZ모임</Text>
            <Text style={{ fontSize: 26 * 0.25, fontWeight: "500", color: colors.textTertiary }}>맛집모임</Text>
          </View>
          <Text style={{ ...typography.caption, marginTop: 2 }}>우리들의 맛집 리스트</Text>
        </View>

        <Text style={{ ...typography.label, marginTop: spacing.sm }}>
          내 모임 {loading ? "· 불러오는 중..." : `· ${groups.length}개`}
        </Text>

        {loading && (
          <View style={{ padding: 30, alignItems: "center" }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        {groups.map((g) => (
          <View key={g.id} style={{
            backgroundColor: colors.card, borderRadius: radius.lg,
            overflow: "hidden", shadowColor: "#000",
            shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
          }}>
            <Pressable
              onPress={() => rootNavigation.navigate("Places", { groupId: g.id })}
              style={{ padding: spacing.lg }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: "800", color: colors.text }}>{g.name}</Text>
                  <Text style={{ ...typography.caption, marginTop: 4 }}>
                    멤버 {g.members.length}명 · 맛집 {g.places.length}개
                  </Text>
                </View>
                <View style={{
                  backgroundColor: g.myRole === "admin" ? colors.primaryLight : colors.background,
                  paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.full,
                }}>
                  <Text style={{
                    fontSize: 11, fontWeight: "700",
                    color: g.myRole === "admin" ? colors.primaryDark : colors.textTertiary,
                  }}>
                    {g.myRole === "admin" ? "관리자" : "멤버"}
                  </Text>
                </View>
              </View>
            </Pressable>

            <View style={{ flexDirection: "row", borderTopWidth: 1, borderColor: colors.divider }}>
              <Pressable
                onPress={() => rootNavigation.navigate("InviteMembers", { groupId: g.id, groupName: g.name })}
                style={{
                  flex: 1, padding: spacing.md, alignItems: "center",
                  borderRightWidth: g.myRole === "admin" ? 1 : 0, borderColor: colors.divider,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textSecondary }}>멤버 관리</Text>
              </Pressable>
              {g.myRole === "admin" && (
                <>
                  <Pressable
                    onPress={() => { setEditingGroupId(g.id); setEditingName(g.name); }}
                    style={{
                      padding: spacing.md, paddingHorizontal: spacing.lg,
                      alignItems: "center", borderRightWidth: 1, borderColor: colors.divider,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textSecondary }}>수정</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onDeleteGroup(g.id, g.name)}
                    style={{ padding: spacing.md, paddingHorizontal: spacing.lg, alignItems: "center" }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "700", color: colors.danger }}>삭제</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        ))}

        {groups.length === 0 && !loading && (
          <View style={{
            backgroundColor: colors.card, borderRadius: radius.lg,
            padding: 40, alignItems: "center", gap: spacing.sm,
          }}>
            <Text style={{ fontSize: 40 }}>🍜</Text>
            <Text style={{ fontWeight: "700", color: colors.text }}>아직 모임이 없어요</Text>
            <Text style={{ ...typography.caption, textAlign: "center" }}>
              모임을 만들거나 초대코드로 참가해보세요!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* 딤 처리 */}
      {fabOpen && (
        <Pressable
          onPress={closeFab}
          style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.15)", zIndex: 50,
          }}
        />
      )}

      {/* FAB */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          right: 20,
          bottom: insets.bottom + 8,
          alignItems: "flex-end",
          zIndex: 999,
        }}
      >
        {/* 모임 만들기 */}
        {fabOpen && (
          <View style={{ marginBottom: spacing.sm }}>
            <Pressable
              onPress={() => { closeFab(); rootNavigation.navigate("CreateGroup"); }}
              style={{
                backgroundColor: MINT,
                paddingVertical: 11, paddingHorizontal: 18,
                borderRadius: radius.full,
                shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 6, elevation: 8,
                minWidth: 130, alignItems: "center",
              }}
            >
              <Text style={{ color: colors.white, fontWeight: "800", fontSize: 13 }}>+ 모임 만들기</Text>
            </Pressable>
          </View>
        )}

        {/* 초대코드 참가 */}
        {fabOpen && (
          <View style={{ marginBottom: spacing.sm }}>
            <Pressable
              onPress={() => { closeFab(); rootNavigation.navigate("JoinGroup"); }}
              style={{
                backgroundColor: colors.white,
                paddingVertical: 11, paddingHorizontal: 18,
                borderRadius: radius.full,
                borderWidth: 1.5, borderColor: MINT,
                shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, elevation: 8,
                minWidth: 130, alignItems: "center",
              }}
            >
              <Text style={{ color: MINT_DARK, fontWeight: "700", fontSize: 13 }}>초대코드 참가</Text>
            </Pressable>
          </View>
        )}

        {/* 메인 FAB */}
        <Pressable
          onPress={toggleFab}
          style={{
            width: 52, height: 52, borderRadius: radius.full,
            backgroundColor: MINT,
            alignItems: "center", justifyContent: "center",
            shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, elevation: 10,
          }}
        >
          <Text style={{ fontSize: 26, color: colors.white, lineHeight: 30 }}>
            {fabOpen ? "×" : "+"}
          </Text>
        </Pressable>
      </View>
    </>
  );
}