import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, Alert, ScrollView, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useAuthStore } from "../store/useAuthStore";
import { supabase } from "../lib/supabase";

type Props = NativeStackScreenProps<RootStackParamList, "AddPlace">;

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

export default function AddPlaceScreen({ navigation, route }: Props) {
  const { groupId } = route.params;

  // useAuthStore.user가 아직 string일 수도 있어서 안전하게 userId만 뽑음
  const user = useAuthStore((s: any) => s.user);
  const userId: string | null = useMemo(() => {
    if (!user) return null;
    if (typeof user === "string") return null; // (기존 닉네임 로그인 모드)
    return user.id ?? null; // (Supabase auth 모드)
  }, [user]);

  const [name, setName] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [memo, setMemo] = useState("");

  // 0.1 단위 평점
  const [initialRating, setInitialRating] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const tags = useMemo(() => {
    return tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }, [tagsText]);

  const inc = (delta: number) => {
    setInitialRating((prev) => round1(clamp(prev + delta, 0, 5)));
  };

  const onCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("확인", "맛집 이름을 입력해주세요.");
      return;
    }
    if (!userId) {
      Alert.alert("로그인 필요", "이 기능은 계정 로그인(이메일/비번) 모드에서 사용됩니다.");
      return;
    }

    try {
      setSaving(true);

      // 1) places 생성
      const memoValue = memo.trim() ? memo.trim() : null;

      const { data: placeRow, error: placeErr } = await supabase
        .from("places")
        .insert({
          group_id: groupId,
          name: trimmed,
          tags,
          memo: memoValue,
          created_by: userId,
        })
        .select("id")
        .single();

      if (placeErr) throw placeErr;
      if (!placeRow) throw new Error("맛집 생성에 실패했습니다.");

      const placeId = (placeRow as any).id as string;

      // 2) 초기 평점(선택): 0이면 저장 안 함
      if (initialRating > 0) {
        const { error: rateErr } = await supabase.from("place_ratings").upsert(
          {
            place_id: placeId,
            user_id: userId,
            rating: initialRating,
          },
          { onConflict: "place_id,user_id" }
        );
        if (rateErr) throw rateErr;
      }

      // 3) 상세로 이동
      navigation.replace("PlaceDetail", { groupId, placeId });
    } catch (e: any) {
      Alert.alert("오류", e?.message ?? "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "900" }}>맛집 추가</Text>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="맛집 이름 (필수)"
        style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12 }}
      />

      <TextInput
        value={tagsText}
        onChangeText={setTagsText}
        placeholder="태그 (쉼표로 구분) 예: 라멘, 혼밥"
        style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12 }}
      />

      <TextInput
        value={memo}
        onChangeText={setMemo}
        placeholder="메모 (선택)"
        multiline
        style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12, minHeight: 90 }}
      />

      <View style={{ gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#eee" }}>
        <Text style={{ fontWeight: "900" }}>내 초기 평점 (0.1 단위)</Text>
        <Text style={{ opacity: 0.7 }}>0점이면 저장하지 않습니다.</Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable
            onPress={() => inc(-0.1)}
            style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: "#ddd" }}
          >
            <Text style={{ fontWeight: "900" }}>-0.1</Text>
          </Pressable>

          <Text style={{ fontSize: 18, fontWeight: "900", minWidth: 70, textAlign: "center" }}>
            {initialRating.toFixed(1)}
          </Text>

          <Pressable
            onPress={() => inc(0.1)}
            style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: "#ddd" }}
          >
            <Text style={{ fontWeight: "900" }}>+0.1</Text>
          </Pressable>
        </View>

        <TextInput
          value={String(initialRating)}
          onChangeText={(t) => setInitialRating(round1(clamp(parseDecimal(t), 0, 5)))}
          keyboardType="numeric"
          placeholder="직접 입력 (예: 4.3)"
          style={{ borderWidth: 1, borderColor: "#eee", borderRadius: 12, padding: 12 }}
        />
      </View>

      <Pressable
        onPress={onCreate}
        disabled={saving}
        style={{
          backgroundColor: "black",
          padding: 14,
          borderRadius: 12,
          opacity: saving ? 0.6 : 1,
          marginTop: 6,
        }}
      >
        {saving ? (
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 10 }}>
            <ActivityIndicator />
            <Text style={{ color: "white", fontWeight: "900" }}>저장 중...</Text>
          </View>
        ) : (
          <Text style={{ color: "white", textAlign: "center", fontWeight: "900" }}>저장</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
