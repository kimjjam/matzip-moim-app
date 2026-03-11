import React, { useEffect, useMemo } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useGroupsStore } from "../store/useGroupsStore";
import { colors, radius, spacing, typography } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Places">;

const MINT = "#A8DAC5";

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

export default function PlaceListScreen({ navigation, route }: Props) {
  const { groupId } = route.params;
  const { groups, loadGroups, loading } = useGroupsStore();
  const insets = useSafeAreaInsets();

  const group = useMemo(() => groups.find((g) => g.id === groupId), [groups, groupId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadGroups();
    });
    return unsubscribe;
  }, [navigation, loadGroups]);

  if (!group) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <Text style={{ color: colors.textSecondary }}>모임을 찾을 수 없어요.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={group.places}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: spacing.xl,
          gap: spacing.md,
          paddingBottom: 100,
        }}
        ListHeaderComponent={() => (
          <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
            <Text style={{ fontSize: 22, fontWeight: "900", color: colors.text }}>
              {group.name}
            </Text>
            <Text style={{ ...typography.caption }}>
              맛집 {group.places.length}개
            </Text>
            {loading && <ActivityIndicator color={colors.primary} />}
          </View>
        )}
        ListEmptyComponent={() => (
          !loading ? (
            <View style={{
              backgroundColor: colors.card, borderRadius: radius.lg,
              padding: 40, alignItems: "center", gap: spacing.sm,
            }}>
              <Text style={{ fontSize: 40 }}>🍽️</Text>
              <Text style={{ fontWeight: "700", color: colors.text }}>아직 맛집이 없어요</Text>
              <Text style={{ ...typography.caption, textAlign: "center" }}>
                첫 번째 맛집을 추가해보세요!
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
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text, flex: 1 }}>
                  {item.name}
                </Text>
                <StarRating avg={avg} />
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