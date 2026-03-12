import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, TextInput, Modal } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useGroupsStore } from "../store/useGroupsStore";
import { colors, radius, spacing, typography } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Places">;

const MINT = "#A8DAC5";

type SortType = "latest" | "rating" | "name";
type FilterType = "all" | "visited" | "unvisited";

const MEDALS = ["🥇", "🥈", "🥉"];
const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];
const MEDAL_BG = ["#FFFBEA", "#F5F5F5", "#FFF3E8"];

function average(ratings: { value: number }[]) {
  if (!ratings || ratings.length === 0) return null;
  const sum = ratings.reduce((a, b) => a + b.value, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

function StarRating({ avg }: { avg: number | null }) {
  if (avg === null) return (
    <Text style={{ fontSize: 12, color: colors.textTertiary }}>아직 평점 없음</Text>
  );
  const stars = Math.round(avg);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Text style={{ fontSize: 13 }}>
        {"★".repeat(stars)}{"☆".repeat(5 - stars)}
      </Text>
      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>
        {avg.toFixed(1)}
      </Text>
    </View>
  );
}

const sortButtons: { label: string; value: SortType }[] = [
  { label: "최신순", value: "latest" },
  { label: "별점순", value: "rating" },
  { label: "가나다순", value: "name" },
];

const filterButtons: { label: string; value: FilterType }[] = [
  { label: "전체", value: "all" },
  { label: "✅ 방문완료", value: "visited" },
  { label: "📌 방문예정", value: "unvisited" },
];

export default function PlaceListScreen({ navigation, route }: Props) {
  const { groupId } = route.params;
  const { groups, loadGroups, loading, toggleVisited } = useGroupsStore();
  const insets = useSafeAreaInsets();
  const [sortType, setSortType] = useState<SortType>("latest");
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [showTop3, setShowTop3] = useState(false);

  const group = useMemo(() => groups.find((g) => g.id === groupId), [groups, groupId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadGroups();
    });
    return unsubscribe;
  }, [navigation, loadGroups]);

  // TOP3 계산 (방문완료 + 평점 있는 것만)
  const top3 = useMemo(() => {
    if (!group) return [];
    return [...group.places]
      .filter((p) => p.isVisited && p.ratings.length > 0)
      .sort((a, b) => (average(b.ratings) ?? 0) - (average(a.ratings) ?? 0))
      .slice(0, 3);
  }, [group]);

  const sortedPlaces = useMemo(() => {
    if (!group) return [];
    let places = [...group.places];

    if (filter === "visited") {
      places = places.filter((p) => p.isVisited);
    } else if (filter === "unvisited") {
      places = places.filter((p) => !p.isVisited);
    }

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      places = places.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.memo ?? "").toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (sortType === "latest") {
      places.sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime());
    } else if (sortType === "rating") {
      places.sort((a, b) => {
        const avgA = average(a.ratings) ?? -1;
        const avgB = average(b.ratings) ?? -1;
        return avgB - avgA;
      });
    } else if (sortType === "name") {
      places.sort((a, b) => a.name.localeCompare(b.name, "ko"));
    }

    return places;
  }, [group, sortType, searchText, filter]);

  const ListHeader = useCallback(() => (
    <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 22, fontWeight: "900", color: colors.text }}>
          {group?.name}
        </Text>
        {/* TOP3 버튼 */}
        <Pressable
          onPress={() => setShowTop3(true)}
          style={{
            flexDirection: "row", alignItems: "center", gap: 4,
            paddingVertical: 5, paddingHorizontal: 10,
            borderRadius: radius.full,
            backgroundColor: "#FFFBEA",
            borderWidth: 1, borderColor: "#FFD700",
          }}
        >
          <Text style={{ fontSize: 12 }}>🏆</Text>
          <Text style={{ fontSize: 11, fontWeight: "800", color: "#B8860B" }}>TOP 3</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <Text style={{ ...typography.caption }}>전체 {group?.places.length}개</Text>
        <Text style={{ ...typography.caption }}>
          ✅ {group?.places.filter((p) => p.isVisited).length}개
        </Text>
        <Text style={{ ...typography.caption }}>
          📌 {group?.places.filter((p) => !p.isVisited).length}개
        </Text>
      </View>
      {loading && <ActivityIndicator color={colors.primary} />}
    </View>
  ), [group, loading]);

  if (!group) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <Text style={{ color: colors.textSecondary }}>모임을 찾을 수 없어요.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* TOP3 모달 */}
      <Modal
        visible={showTop3}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTop3(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: spacing.xl }}
          onPress={() => setShowTop3(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={{
              backgroundColor: colors.white,
              borderRadius: 24,
              padding: spacing.xl,
              gap: spacing.lg,
            }}>
              {/* 모달 헤더 */}
              <View style={{ alignItems: "center", gap: spacing.xs }}>
                <Text style={{ fontSize: 32 }}>🏆</Text>
                <Text style={{ fontSize: 20, fontWeight: "900", color: colors.text }}>
                  베스트 맛집 TOP 3
                </Text>
                <Text style={{ ...typography.caption }}>
                  {group.name}의 명예의 전당
                </Text>
              </View>

              {top3.length === 0 ? (
                <View style={{ alignItems: "center", padding: spacing.lg, gap: spacing.sm }}>
                  <Text style={{ fontSize: 32 }}>🍽️</Text>
                  <Text style={{ fontWeight: "700", color: colors.text }}>아직 평가된 맛집이 없어요</Text>
                  <Text style={{ ...typography.caption, textAlign: "center" }}>
                    맛집을 방문하고 평점을 남겨보세요!
                  </Text>
                </View>
              ) : (
                <View style={{ gap: spacing.md }}>
                  {top3.map((place, i) => {
                    const avg = average(place.ratings);
                    return (
                      <Pressable
                        key={place.id}
                        onPress={() => {
                          setShowTop3(false);
                          navigation.navigate("PlaceDetail", { groupId, placeId: place.id });
                        }}
                        style={{
                          backgroundColor: MEDAL_BG[i],
                          borderRadius: radius.lg,
                          padding: spacing.lg,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: spacing.md,
                          borderWidth: 1.5,
                          borderColor: MEDAL_COLORS[i],
                        }}
                      >
                        {/* 순위 */}
                        <View style={{ alignItems: "center", width: 44 }}>
                          <Text style={{ fontSize: 28 }}>{MEDALS[i]}</Text>
                          <Text style={{ fontSize: 10, fontWeight: "800", color: MEDAL_COLORS[i] }}>
                            {i + 1}위
                          </Text>
                        </View>

                        {/* 맛집 정보 */}
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={{ fontSize: 15, fontWeight: "800", color: colors.text }}>
                            {place.name}
                          </Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                            <Text style={{ fontSize: 13, color: "#FFB800" }}>
                              {"★".repeat(Math.round(avg ?? 0))}{"☆".repeat(5 - Math.round(avg ?? 0))}
                            </Text>
                            <Text style={{ fontSize: 14, fontWeight: "900", color: colors.text }}>
                              {avg?.toFixed(1)}
                            </Text>
                            <Text style={{ ...typography.caption }}>
                              ({place.ratings.length}명)
                            </Text>
                          </View>
                          {place.tags.length > 0 && (
                            <Text style={{ fontSize: 11, color: colors.textTertiary }}>
                              {place.tags.join(" · ")}
                            </Text>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <Pressable
                onPress={() => setShowTop3(false)}
                style={{
                  backgroundColor: colors.primary,
                  padding: spacing.md,
                  borderRadius: radius.lg,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: colors.white, fontWeight: "800" }}>닫기</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 검색바 + 필터 + 정렬 */}
      <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.sm, backgroundColor: colors.background }}>
        <View style={{
          flexDirection: "row", alignItems: "center",
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          borderWidth: 1, borderColor: colors.border,
          paddingHorizontal: spacing.md,
        }}>
          <Text style={{ fontSize: 15, marginRight: spacing.sm }}>🔍</Text>
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="맛집 이름, 태그, 메모 검색"
            placeholderTextColor={colors.textTertiary}
            style={{
              flex: 1, paddingVertical: spacing.md,
              fontSize: 14, color: colors.text,
            }}
          />
          {!!searchText && (
            <Pressable onPress={() => setSearchText("")}>
              <Text style={{ fontSize: 16, color: colors.textTertiary, paddingLeft: spacing.sm }}>✕</Text>
            </Pressable>
          )}
        </View>

        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {filterButtons.map((btn) => (
            <Pressable
              key={btn.value}
              onPress={() => setFilter(btn.value)}
              style={{
                paddingVertical: 6, paddingHorizontal: 12,
                borderRadius: radius.full,
                backgroundColor: filter === btn.value ? colors.text : colors.card,
                borderWidth: 1,
                borderColor: filter === btn.value ? colors.text : colors.border,
              }}
            >
              <Text style={{
                fontSize: 11, fontWeight: "700",
                color: filter === btn.value ? colors.white : colors.textSecondary,
              }}>
                {btn.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {sortButtons.map((btn) => (
            <Pressable
              key={btn.value}
              onPress={() => setSortType(btn.value)}
              style={{
                paddingVertical: 6, paddingHorizontal: 14,
                borderRadius: radius.full,
                backgroundColor: sortType === btn.value ? colors.primary : colors.card,
                borderWidth: 1,
                borderColor: sortType === btn.value ? colors.primary : colors.border,
              }}
            >
              <Text style={{
                fontSize: 12, fontWeight: "700",
                color: sortType === btn.value ? colors.white : colors.textSecondary,
              }}>
                {btn.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {!!searchText && (
          <Text style={{ ...typography.caption }}>
            검색 결과 {sortedPlaces.length}개
          </Text>
        )}
      </View>

      <FlatList
        data={sortedPlaces}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: spacing.xl,
          gap: spacing.md,
          paddingBottom: 100,
        }}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={() => (
          !loading ? (
            <View style={{
              backgroundColor: colors.card, borderRadius: radius.lg,
              padding: 40, alignItems: "center", gap: spacing.sm,
            }}>
              <Text style={{ fontSize: 40 }}>{searchText ? "🔍" : "🍽️"}</Text>
              <Text style={{ fontWeight: "700", color: colors.text }}>
                {searchText ? "검색 결과가 없어요" : filter === "unvisited" ? "방문 예정 맛집이 없어요" : filter === "visited" ? "방문 완료 맛집이 없어요" : "아직 맛집이 없어요"}
              </Text>
              <Text style={{ ...typography.caption, textAlign: "center" }}>
                {searchText ? `"${searchText}" 에 해당하는 맛집이 없어요` : "첫 번째 맛집을 추가해보세요!"}
              </Text>
            </View>
          ) : null
        )}
        renderItem={({ item }) => {
          const avg = average(item.ratings);
          return (
            <Pressable
              onPress={() => navigation.navigate("PlaceDetail", { groupId, placeId: item.id })}
              style={{
                backgroundColor: colors.card,
                borderRadius: radius.lg,
                padding: spacing.lg,
                shadowColor: "#000",
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 2,
                gap: spacing.sm,
                borderLeftWidth: 3,
                borderLeftColor: item.isVisited ? MINT : "#FFB800",
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: item.isVisited ? "#7BBFAA" : "#F0A500" }}>
                    {item.isVisited ? "✅ 방문완료" : "📌 방문예정"}
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }}>
                    {item.name}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: spacing.xs }}>
                  <StarRating avg={avg} />
                  <Pressable
                    onPress={() => toggleVisited(item.id, groupId, !item.isVisited)}
                    style={{
                      paddingVertical: 3, paddingHorizontal: 8,
                      borderRadius: radius.full,
                      backgroundColor: item.isVisited ? colors.background : colors.primaryLight,
                      borderWidth: 1,
                      borderColor: item.isVisited ? colors.border : colors.primary,
                    }}
                  >
                    <Text style={{
                      fontSize: 10, fontWeight: "700",
                      color: item.isVisited ? colors.textTertiary : colors.primaryDark,
                    }}>
                      {item.isVisited ? "예정으로 변경" : "완료로 변경"}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {!!item.memo && (
                <Text style={{ ...typography.body, color: colors.textSecondary }} numberOfLines={2}>
                  {item.memo}
                </Text>
              )}

              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" }}>
                {item.tags.map((tag, i) => (
                  <View key={i} style={{
                    backgroundColor: colors.primaryLight,
                    paddingVertical: 3, paddingHorizontal: 8,
                    borderRadius: radius.full,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: colors.primaryDark }}>
                      {tag}
                    </Text>
                  </View>
                ))}
                <Text style={{ ...typography.caption, marginLeft: "auto" }}>
                  평가 {item.ratings.length}명
                </Text>
              </View>
            </Pressable>
          );
        }}
      />

      {/* FAB */}
      <Pressable
        onPress={() => navigation.navigate("AddPlace", { groupId })}
        style={{
          position: "absolute",
          right: 20,
          bottom: insets.bottom + 8,
          width: 52, height: 52,
          borderRadius: radius.full,
          backgroundColor: MINT,
          alignItems: "center", justifyContent: "center",
          shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, elevation: 10,
          zIndex: 999,
        }}
      >
        <Text style={{ fontSize: 26, color: colors.white, lineHeight: 30 }}>+</Text>
      </Pressable>
    </View>
  );
}