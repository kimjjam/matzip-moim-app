import React, { useEffect, useMemo } from "react";
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
const FAVORITE_BG = "#FFFBEA";
const FAVORITE_BORDER = "#FFE082";

function average(ratings: { value: number }[]) {
  if (!ratings || ratings.length === 0) return null;
  const sum = ratings.reduce((a, b) => a + b.value, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

function calcGroupStats(places: { ratings: { value: number }[]; isVisited: boolean }[]) {
  const visitedPlaces = places.filter((p) => p.isVisited && p.ratings.length > 0);
  if (visitedPlaces.length === 0) return null;
  const allRatings = visitedPlaces.map((p) => average(p.ratings) ?? 0);
  const avg = Math.round((allRatings.reduce((a, b) => a + b, 0) / allRatings.length) * 10) / 10;
  const dist = [1, 2, 3, 4, 5].map((star) => ({
    star,
    count: visitedPlaces.filter((p) => Math.round(average(p.ratings) ?? 0) === star).length,
  }));
  return { avg, dist, total: visitedPlaces.length };
}

function MiniBarChart({ dist }: { dist: { star: number; count: number }[] }) {
  const maxCount = Math.max(...dist.map((d) => d.count), 1);
  return (
    <View style={{ gap: 3 }}>
      {[...dist].reverse().map((d) => (
        <View key={d.star} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontSize: 9, color: colors.textTertiary, width: 14, textAlign: "right" }}>
            {d.star}★
          </Text>
          <View style={{ flex: 1, height: 6, backgroundColor: colors.background, borderRadius: 3, overflow: "hidden" }}>
            <View style={{
              width: `${(d.count / maxCount) * 100}%`,
              height: "100%",
              backgroundColor: d.star >= 4 ? MINT : d.star === 3 ? "#FFD580" : "#F4A8C0",
              borderRadius: 3,
            }} />
          </View>
          <Text style={{ fontSize: 9, color: colors.textTertiary, width: 12 }}>
            {d.count > 0 ? d.count : ""}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function GroupScreen({ navigation }: Props) {
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { groups, loadGroups, loading, deleteGroup, updateGroupName, toggleFavorite, reorderGroups } = useGroupsStore();

  const [editingGroupId, setEditingGroupId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState("");
  const [fabOpen, setFabOpen] = React.useState(false);
  const [expandedStats, setExpandedStats] = React.useState<string | null>(null);

  // 즐겨찾기 상단 고정, 그 다음 sort_order 순
  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });
  }, [groups]);

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

  const onToggleFavorite = async (groupId: string) => {
    try { await toggleFavorite(groupId); }
    catch (e: any) { Alert.alert("실패", e?.message ?? "즐겨찾기 변경에 실패했습니다."); }
  };

  const onMoveUp = async (index: number) => {
    if (index === 0) return;
    const newOrder = [...sortedGroups];
    const temp = newOrder[index - 1];
    newOrder[index - 1] = newOrder[index];
    newOrder[index] = temp;
    await reorderGroups(newOrder.map((g) => g.id));
  };

  const onMoveDown = async (index: number) => {
    if (index === sortedGroups.length - 1) return;
    const newOrder = [...sortedGroups];
    const temp = newOrder[index + 1];
    newOrder[index + 1] = newOrder[index];
    newOrder[index] = temp;
    await reorderGroups(newOrder.map((g) => g.id));
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
          내 모임 {loading ? "· 불러오는 중..." : `· ${sortedGroups.length}개`}
        </Text>

        {loading && (
          <View style={{ padding: 30, alignItems: "center" }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        {sortedGroups.map((g, index) => {
          const stats = calcGroupStats(g.places);
          const isExpanded = expandedStats === g.id;
          const isFavoriteFirst = g.isFavorite;
          const prevIsFavorite = index > 0 ? sortedGroups[index - 1].isFavorite : true;
          const nextIsFavorite = index < sortedGroups.length - 1 ? sortedGroups[index + 1].isFavorite : false;

          // 즐겨찾기 그룹 내에서의 첫번째/마지막 여부
          const isFirstInGroup = isFavoriteFirst
            ? index === 0
            : !prevIsFavorite;
          const isLastInGroup = isFavoriteFirst
            ? !nextIsFavorite
            : index === sortedGroups.length - 1;

          return (
            <View key={g.id} style={{
              backgroundColor: g.isFavorite ? FAVORITE_BG : colors.card,
              borderRadius: radius.lg,
              overflow: "hidden",
              shadowColor: "#000",
              shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
              borderWidth: g.isFavorite ? 1.5 : 0,
              borderColor: g.isFavorite ? FAVORITE_BORDER : "transparent",
            }}>
              <Pressable
                onPress={() => rootNavigation.navigate("Places", { groupId: g.id })}
                style={{ padding: spacing.lg }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>

                  {/* 순서 변경 버튼 */}
                  {/* 순서 변경 버튼 - 즐겨찾기 모임은 숨김 */}
{!g.isFavorite && (
  <View style={{ gap: 2, marginRight: spacing.sm }}>
    <Pressable
      onPress={() => onMoveUp(index)}
      disabled={isFirstInGroup}
      style={{
        width: 18, height: 18, borderRadius: 4,
        backgroundColor: isFirstInGroup ? colors.background : colors.primaryLight,
        alignItems: "center", justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 8, color: isFirstInGroup ? colors.textTertiary : colors.primaryDark, fontWeight: "800" }}>▲</Text>
    </Pressable>
    <Pressable
      onPress={() => onMoveDown(index)}
      disabled={isLastInGroup}
      style={{
        width: 18, height: 18, borderRadius: 4,
        backgroundColor: isLastInGroup ? colors.background : colors.primaryLight,
        alignItems: "center", justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 8, color: isLastInGroup ? colors.textTertiary : colors.primaryDark, fontWeight: "800" }}>▼</Text>
    </Pressable>
  </View>
)}

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: "800", color: colors.text }}>{g.name}</Text>
                    <Text style={{ ...typography.caption, marginTop: 4 }}>
                      멤버 {g.members.length}명 · 맛집 {g.places.length}개
                      {stats ? ` · 평균 ⭐ ${stats.avg}` : ""}
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                    <Pressable
                      onPress={() => onToggleFavorite(g.id)}
                      style={{
                        width: 30, height: 30, borderRadius: radius.full,
                        backgroundColor: g.isFavorite ? FAVORITE_BORDER : colors.background,
                        alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 15 }}>{g.isFavorite ? "⭐" : "☆"}</Text>
                    </Pressable>

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
                </View>

                {stats && (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      setExpandedStats(isExpanded ? null : g.id);
                    }}
                    style={{
                      marginTop: spacing.sm,
                      flexDirection: "row", alignItems: "center", gap: 4,
                      alignSelf: "flex-start",
                      paddingVertical: 3, paddingHorizontal: 8,
                      borderRadius: radius.full,
                      backgroundColor: isExpanded ? colors.primaryLight : colors.background,
                      borderWidth: 1,
                      borderColor: isExpanded ? colors.primary : colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: "700", color: isExpanded ? colors.primaryDark : colors.textTertiary }}>
                      📊 {isExpanded ? "차트 닫기" : "평점 차트"}
                    </Text>
                  </Pressable>
                )}

                {stats && isExpanded && (
                  <View style={{
                    marginTop: spacing.md,
                    backgroundColor: colors.background,
                    borderRadius: radius.md,
                    padding: spacing.md,
                    gap: spacing.sm,
                  }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textSecondary }}>
                        평가된 맛집 {stats.total}개
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Text style={{ fontSize: 11, color: "#FFB800" }}>★</Text>
                        <Text style={{ fontSize: 14, fontWeight: "900", color: colors.text }}>{stats.avg}</Text>
                        <Text style={{ fontSize: 11, color: colors.textTertiary }}>/ 5.0</Text>
                      </View>
                    </View>
                    <MiniBarChart dist={stats.dist} />
                    <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: 2 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: MINT }} />
                        <Text style={{ fontSize: 9, color: colors.textTertiary }}>4~5점</Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: "#FFD580" }} />
                        <Text style={{ fontSize: 9, color: colors.textTertiary }}>3점</Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: "#F4A8C0" }} />
                        <Text style={{ fontSize: 9, color: colors.textTertiary }}>1~2점</Text>
                      </View>
                    </View>
                  </View>
                )}
              </Pressable>

              <View style={{
                flexDirection: "row",
                borderTopWidth: 1,
                borderColor: g.isFavorite ? FAVORITE_BORDER : colors.divider,
              }}>
                <Pressable
                  onPress={() => rootNavigation.navigate("InviteMembers", { groupId: g.id, groupName: g.name })}
                  style={{
                    flex: 1, padding: spacing.md, alignItems: "center",
                    borderRightWidth: g.myRole === "admin" ? 1 : 0,
                    borderColor: g.isFavorite ? FAVORITE_BORDER : colors.divider,
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
                        alignItems: "center", borderRightWidth: 1,
                        borderColor: g.isFavorite ? FAVORITE_BORDER : colors.divider,
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
          );
        })}

        {sortedGroups.length === 0 && !loading && (
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

      {fabOpen && (
        <Pressable
          onPress={closeFab}
          style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.15)", zIndex: 50,
          }}
        />
      )}

      <View
        pointerEvents="box-none"
        style={{
          position: "absolute", right: 20, bottom: insets.bottom + 8,
          alignItems: "flex-end", zIndex: 999,
        }}
      >
        {fabOpen && (
          <View style={{ marginBottom: spacing.sm }}>
            <Pressable
              onPress={() => { closeFab(); rootNavigation.navigate("CreateGroup"); }}
              style={{
                backgroundColor: MINT, paddingVertical: 11, paddingHorizontal: 18,
                borderRadius: radius.full, shadowColor: "#000", shadowOpacity: 0.12,
                shadowRadius: 6, elevation: 8, minWidth: 130, alignItems: "center",
              }}
            >
              <Text style={{ color: colors.white, fontWeight: "800", fontSize: 13 }}>+ 모임 만들기</Text>
            </Pressable>
          </View>
        )}

        {fabOpen && (
          <View style={{ marginBottom: spacing.sm }}>
            <Pressable
              onPress={() => { closeFab(); rootNavigation.navigate("JoinGroup"); }}
              style={{
                backgroundColor: colors.white, paddingVertical: 11, paddingHorizontal: 18,
                borderRadius: radius.full, borderWidth: 1.5, borderColor: MINT,
                shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, elevation: 8,
                minWidth: 130, alignItems: "center",
              }}
            >
              <Text style={{ color: MINT_DARK, fontWeight: "700", fontSize: 13 }}>초대코드 참가</Text>
            </Pressable>
          </View>
        )}

        <Pressable
          onPress={toggleFab}
          style={{
            width: 52, height: 52, borderRadius: radius.full, backgroundColor: MINT,
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