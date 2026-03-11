import React, { useMemo } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useGroupsStore } from "../store/useGroupsStore";

type Props = NativeStackScreenProps<RootStackParamList, "Places">;

function average(ratings: { value: number }[]) {
  if (!ratings || ratings.length === 0) return null;
  const sum = ratings.reduce((a, b) => a + b.value, 0);
  return Math.round((sum / ratings.length) * 10) / 10; // 0.1 단위
}

export default function PlaceListScreen({ navigation, route }: Props) {
  const { groupId } = route.params;
  const { groups } = useGroupsStore();

  const group = useMemo(() => groups.find((g) => g.id === groupId), [groups, groupId]);

  if (!group) {
    return (
      <View style={{ flex: 1, padding: 20 }}>
        <Text>모임을 찾을 수 없어요.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "900" }}>{group.name} 맛집</Text>

      <Pressable
        onPress={() => navigation.navigate("AddPlace", { groupId })}
        style={{ backgroundColor: "black", padding: 14, borderRadius: 12 }}
      >
        <Text style={{ color: "white", textAlign: "center", fontWeight: "900" }}>
          + 맛집 추가
        </Text>
      </Pressable>

      <FlatList
        data={group.places}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const avg = average(item.ratings);
          return (
            <Pressable
              onPress={() => navigation.navigate("PlaceDetail", { groupId, placeId: item.id })}
              style={{
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#ddd",
                marginTop: 10,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                <Text style={{ fontSize: 16, fontWeight: "900", flex: 1 }}>{item.name}</Text>
                <Text style={{ fontWeight: "900" }}>
                  {avg === null ? "평점 없음" : `평균 ${avg.toFixed(1)}`}
                </Text>
              </View>

              {!!item.memo && <Text style={{ opacity: 0.75, marginTop: 6 }}>{item.memo}</Text>}

              <Text style={{ opacity: 0.6, marginTop: 6 }}>
                {item.tags.join(" · ")} · 평가 {item.ratings.length}명
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
