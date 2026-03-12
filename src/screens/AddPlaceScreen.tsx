import React, { useMemo, useState } from "react";
import {
  View, Text, TextInput, Pressable, Alert,
  ScrollView, ActivityIndicator,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useAuthStore } from "../store/useAuthStore";
import { supabase } from "../lib/supabase";
import { colors, radius, spacing, typography } from "../theme";
const MINT = "#A8DAC5";
const MINT_DARK = "#7BBFAA";
const MINT_BG = "#E8F5F0";

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
function todayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function isValidDate(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s);
  return !isNaN(d.getTime());
}

export default function AddPlaceScreen({ navigation, route }: Props) {
  const { groupId } = route.params;

  const user = useAuthStore((s: any) => s.user);
  const userId: string | null = useMemo(() => {
    if (!user) return null;
    if (typeof user === "string") return null;
    return user.id ?? null;
  }, [user]);

  const [name, setName] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [memo, setMemo] = useState("");
  const [visitedAt, setVisitedAt] = useState(todayString());
  const [isVisited, setIsVisited] = useState(true);
  const [initialRating, setInitialRating] = useState<number>(0);
  const [initialRatingText, setInitialRatingText] = useState<string>("0");
  const [initialComment, setInitialComment] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const tags = useMemo(() => {
    return tagsText.split(",").map((t) => t.trim()).filter(Boolean);
  }, [tagsText]);

  const inc = (delta: number) => {
    const next = round1(clamp(initialRating + delta, 0, 5));
    setInitialRating(next);
    setInitialRatingText(String(next));
  };

  const onCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("확인", "맛집 이름을 입력해주세요.");
      return;
    }
    if (isVisited && !isValidDate(visitedAt)) {
      Alert.alert("확인", "방문일을 YYYY-MM-DD 형식으로 입력해주세요.");
      return;
    }
    if (!userId) {
      Alert.alert("로그인 필요", "이 기능은 계정 로그인 모드에서 사용됩니다.");
      return;
    }

    try {
      setSaving(true);

      const { data: placeRow, error: placeErr } = await supabase
        .from("places")
        .insert({
          group_id: groupId,
          name: trimmed,
          tags,
          memo: memo.trim() || null,
          created_by: userId,
          visited_at: isVisited ? new Date(visitedAt).toISOString() : new Date().toISOString(),
          is_visited: isVisited,
        })
        .select("id")
        .single();

      if (placeErr) throw placeErr;
      if (!placeRow) throw new Error("맛집 생성에 실패했습니다.");

      const placeId = (placeRow as any).id as string;

      if (isVisited && initialRating > 0) {
        const { error: rateErr } = await supabase.from("place_ratings").upsert(
          {
            place_id: placeId,
            user_id: userId,
            value: initialRating,
            comment: initialComment.trim() || null,
          },
          { onConflict: "place_id,user_id" }
        );
        if (rateErr) throw rateErr;
      }

      navigation.replace("PlaceDetail", { groupId, placeId });
    } catch (e: any) {
      Alert.alert("오류", e?.message ?? "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.xl, gap: spacing.md, paddingBottom: 40 }}
    >
      <Text style={{ fontSize: 22, fontWeight: "900", color: colors.text, marginBottom: spacing.sm }}>
        맛집 추가
      </Text>

      {/* 맛집 이름 */}
      <View style={{ gap: spacing.sm }}>
        <Text style={{ ...typography.label }}>맛집 이름 <Text style={{ color: colors.danger }}>*</Text></Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="예: 을지로 라멘집"
          placeholderTextColor={colors.textTertiary}
          style={inputStyle}
        />
      </View>

      {/* 방문 상태 선택 */}
      <View style={{ gap: spacing.sm }}>
        <Text style={{ ...typography.label }}>방문 상태</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Pressable
            onPress={() => setIsVisited(true)}
            style={{
              flex: 1, padding: spacing.md, borderRadius: radius.lg,
              alignItems: "center",
              backgroundColor: isVisited ? MINT_BG : colors.card,
              borderWidth: 1.5,
              borderColor: isVisited ? MINT : colors.border,
            }}
          >
            <Text style={{ fontSize: 20 }}>✅</Text>
            <Text style={{ fontSize: 13, fontWeight: "700", color: isVisited ? MINT_DARK : colors.textSecondary, marginTop: 4 }}>
              방문완료
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setIsVisited(false)}
            style={{
              flex: 1, padding: spacing.md, borderRadius: radius.lg,
              alignItems: "center",
              backgroundColor: !isVisited ? "#FFFBEA" : colors.card,
              borderWidth: 1.5,
              borderColor: !isVisited ? "#FFB800" : colors.border,
            }}
          >
            <Text style={{ fontSize: 20 }}>📌</Text>
            <Text style={{ fontSize: 13, fontWeight: "700", color: !isVisited ? "#F0A500" : colors.textSecondary, marginTop: 4 }}>
              방문예정
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 방문일 (방문완료일 때만) */}
      {isVisited && (
        <View style={{ gap: spacing.sm }}>
          <Text style={{ ...typography.label }}>방문일 <Text style={{ color: colors.danger }}>*</Text></Text>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <TextInput
              value={visitedAt}
              onChangeText={setVisitedAt}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
              maxLength={10}
              style={{ ...inputStyle, flex: 1 }}
            />
            <Pressable
              onPress={() => setVisitedAt(todayString())}
              style={{
                paddingHorizontal: spacing.md,
                backgroundColor: colors.primaryLight,
                borderRadius: radius.md,
                alignItems: "center", justifyContent: "center",
                borderWidth: 1, borderColor: colors.primary,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primaryDark }}>오늘</Text>
            </Pressable>
          </View>
          {visitedAt.length === 10 && !isValidDate(visitedAt) && (
            <Text style={{ fontSize: 12, color: colors.danger }}>날짜 형식이 올바르지 않아요 (YYYY-MM-DD)</Text>
          )}
        </View>
      )}

      {/* 태그 */}
      <View style={{ gap: spacing.sm }}>
        <Text style={{ ...typography.label }}>태그</Text>
        <TextInput
          value={tagsText}
          onChangeText={setTagsText}
          placeholder="쉼표로 구분 (예: 라멘, 혼밥, 점심)"
          placeholderTextColor={colors.textTertiary}
          style={inputStyle}
        />
        {tags.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {tags.map((tag, i) => (
              <View key={i} style={{
                backgroundColor: colors.primaryLight,
                paddingVertical: 3, paddingHorizontal: 8,
                borderRadius: radius.full,
              }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: colors.primaryDark }}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 메모 */}
      <View style={{ gap: spacing.sm }}>
        <Text style={{ ...typography.label }}>메모</Text>
        <TextInput
          value={memo}
          onChangeText={setMemo}
          placeholder="간단한 메모를 남겨보세요"
          placeholderTextColor={colors.textTertiary}
          multiline
          style={{ ...inputStyle, minHeight: 90, textAlignVertical: "top" }}
        />
      </View>

      {/* 초기 평점 (방문완료일 때만) */}
      {isVisited && (
        <View style={{
          backgroundColor: colors.white, borderRadius: radius.lg,
          padding: spacing.lg, gap: spacing.md,
          borderWidth: 1, borderColor: colors.border,
        }}>
          <View>
            <Text style={{ ...typography.label }}>초기 평점</Text>
            <Text style={{ ...typography.caption, marginTop: 2 }}>0점이면 저장하지 않아요</Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.md }}>
            <Pressable
              onPress={() => inc(-0.1)}
              style={{
                width: 44, height: 44, borderRadius: radius.full,
                backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Text style={{ fontWeight: "700", fontSize: 16, color: colors.text }}>−</Text>
            </Pressable>

            <Text style={{ fontSize: 32, fontWeight: "900", color: colors.text, minWidth: 80, textAlign: "center" }}>
              {initialRatingText}
            </Text>

            <Pressable
              onPress={() => inc(0.1)}
              style={{
                width: 44, height: 44, borderRadius: radius.full,
                backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Text style={{ fontWeight: "700", fontSize: 16, color: colors.text }}>+</Text>
            </Pressable>
          </View>

          <TextInput
            value={initialRatingText}
            onChangeText={(t) => {
              setInitialRatingText(t);
              const n = parseDecimal(t);
              if (Number.isFinite(n)) {
                setInitialRating(round1(clamp(n, 0, 5)));
              }
            }}
            keyboardType="numeric"
            placeholder="직접 입력 (예: 4.3)"
            placeholderTextColor={colors.textTertiary}
            style={{ ...inputStyle, textAlign: "center" }}
          />

          <TextInput
            value={initialComment}
            onChangeText={setInitialComment}
            placeholder="한줄평을 남겨보세요 (선택)"
            placeholderTextColor={colors.textTertiary}
            maxLength={100}
            style={inputStyle}
          />
          <Text style={{ ...typography.caption, textAlign: "right", marginTop: -spacing.sm }}>
            {initialComment.length}/100
          </Text>
        </View>
      )}

      {/* 저장 버튼 */}
      <Pressable
        onPress={onCreate}
        disabled={saving}
        style={{
          backgroundColor: colors.primary,
          padding: spacing.lg,
          borderRadius: radius.lg,
          opacity: saving ? 0.6 : 1,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: spacing.sm,
        }}
      >
        {saving && <ActivityIndicator color={colors.white} />}
        <Text style={{ color: colors.white, fontWeight: "800", fontSize: 16 }}>
          {saving ? "저장 중..." : "저장"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}