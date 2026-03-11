import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, FlatList, Alert, ScrollView, TextInput } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useAuthStore } from "../store/useAuthStore";
import { supabase } from "../lib/supabase";

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
  rating: number | string; // numeric면 string으로 올 수도 있어서 둘 다 허용
  created_at: string;
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

export default function PlaceDetailScreen({ route, navigation }: Props) {
  const { groupId, placeId } = route.params;

  const user = useAuthStore((s: any) => s.user);
  const userId: string | null = useMemo(() => {
    if (!user) return null;
    if (typeof user === "string") return null;
    return user.id ?? null;
  }, [user]);

  const [loading, setLoading] = useState(true);
  const [place, setPlace] = useState<PlaceRow | null>(null);
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [nickMap, setNickMap] = useState<Record<string, string>>({});

  const [myRating, setMyRating] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const avg = useMemo(() => {
    if (!ratings.length) return 0;
    const sum = ratings.reduce((acc, r) => acc + Number(r.rating), 0);
    return sum / ratings.length;
  }, [ratings]);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      // 로그인(계정 모드) 기준
      if (!userId) {
        throw new Error("로그인이 필요합니다. (이메일/비번 계정 모드)");
      }

      // 1) place
      const { data: p, error: pErr } = await supabase
        .from("places")
        .select("*")
        .eq("id", placeId)
        .single();

      if (pErr) throw pErr;
      setPlace(p as PlaceRow);

      // 2) ratings
      const { data: rs, error: rErr } = await supabase
        .from("place_ratings")
        .select("*")
        .eq("place_id", placeId)
        .order("created_at", { ascending: false });

      if (rErr) throw rErr;

      const rows = ((rs ?? []) as any[]) as RatingRow[];
      setRatings(rows);

      const mine = rows.find((r) => r.user_id === userId);
      setMyRating(mine ? round1(Number(mine.rating)) : 0);

      // 3) nickname lookup
      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
      if (userIds.length) {
        const { data: ps, error: p2Err } = await supabase
          .from("profiles")
          .select("id,nickname")
          .in("id", userIds);

        if (p2Err) throw p2Err;

        const map: Record<string, string> = {};
        (ps ?? []).forEach((x: any) => {
          map[x.id] = x.nickname;
        });
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

  useEffect(() => {
    load();
  }, [load]);

  const inc = (delta: number) => {
    setMyRating((prev) => round1(clamp(prev + delta, 0, 5)));
  };

  const saveMyRating = async () => {
    if (!userId) {
      Alert.alert("로그인 필요", "이 기능은 계정 로그인(이메일/비번) 모드에서 사용됩니다.");
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.from("place_ratings").upsert(
        {
          place_id: placeId,
          user_id: userId,
          rating: myRating,
        },
        { onConflict: "place_id,user_id" }
      );

      if (error) throw error;
      await load();
    } catch (e: any) {
      Alert.alert("오류", e?.message ?? "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!place) {
    return (
      <View style={{ flex: 1, padding: 20, gap: 10 }}>
        <Text>맛집을 찾을 수 없어요.</Text>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ backgroundColor: "black", padding: 12, borderRadius: 12 }}
        >
          <Text style={{ color: "white", textAlign: "center", fontWeight: "900" }}>뒤로</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
      <Text style={{ fontSize: 24, fontWeight: "900" }}>{place.name}</Text>

      <Text style={{ opacity: 0.7 }}>
        평균 {ratings.length ? avg.toFixed(1) : "0.0"} / 5.0 · {ratings.length}명 참여
      </Text>

      {!!place.tags?.length && (
        <Text style={{ opacity: 0.7 }}>태그: {place.tags.join(" · ")}</Text>
      )}
      {!!place.memo && <Text style={{ opacity: 0.8 }}>메모: {place.memo}</Text>}

      <View style={{ gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#eee" }}>
        <Text style={{ fontWeight: "900" }}>내 평점 (0.1 단위)</Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable
            onPress={() => inc(-0.1)}
            style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: "#ddd" }}
          >
            <Text style={{ fontWeight: "900" }}>-0.1</Text>
          </Pressable>

          <Text style={{ fontSize: 18, fontWeight: "900", minWidth: 70, textAlign: "center" }}>
            {myRating.toFixed(1)}
          </Text>

          <Pressable
            onPress={() => inc(0.1)}
            style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: "#ddd" }}
          >
            <Text style={{ fontWeight: "900" }}>+0.1</Text>
          </Pressable>
        </View>

        <TextInput
          value={String(myRating)}
          onChangeText={(t) => setMyRating(round1(clamp(parseDecimal(t), 0, 5)))}
          keyboardType="numeric"
          placeholder="직접 입력 (예: 4.3)"
          style={{ borderWidth: 1, borderColor: "#eee", borderRadius: 12, padding: 12 }}
        />

        <Pressable
          onPress={saveMyRating}
          disabled={saving}
          style={{
            backgroundColor: "black",
            padding: 12,
            borderRadius: 12,
            opacity: saving ? 0.6 : 1,
            marginTop: 6,
          }}
        >
          <Text style={{ color: "white", textAlign: "center", fontWeight: "900" }}>
            {saving ? "저장 중..." : "내 평점 저장"}
          </Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          onPress={load}
          style={{ borderWidth: 1, borderColor: "#ddd", padding: 12, borderRadius: 12, flex: 1 }}
        >
          <Text style={{ textAlign: "center", fontWeight: "900" }}>새로고침</Text>
        </Pressable>
      </View>

      <Text style={{ fontSize: 18, fontWeight: "900", marginTop: 6 }}>누가 몇 점 줬는지</Text>

      <FlatList
        data={ratings}
        keyExtractor={(item) => `${item.user_id}-${item.place_id}`}
        scrollEnabled={false}
        renderItem={({ item }) => {
          const nickname = nickMap[item.user_id] ?? item.user_id.slice(0, 8);
          return (
            <View
              style={{
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#eee",
                marginTop: 10,
              }}
            >
              <Text style={{ fontWeight: "900" }}>{nickname}</Text>
              <Text style={{ marginTop: 6, fontSize: 16 }}>{Number(item.rating).toFixed(1)} / 5.0</Text>
              <Text style={{ marginTop: 6, opacity: 0.6 }}>{new Date(item.created_at).toLocaleString()}</Text>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={{ opacity: 0.7, marginTop: 8 }}>아직 평점이 없어요.</Text>}
      />
    </ScrollView>
  );
}
