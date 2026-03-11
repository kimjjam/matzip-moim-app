import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, TextInput, Pressable, Alert,
  ActivityIndicator, ScrollView,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { supabase } from "../lib/supabase";
import { colors, radius, spacing, typography } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "EditPlace">;

export default function EditPlaceScreen({ route, navigation }: Props) {
  const { groupId, placeId } = route.params;

  const [name, setName] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const tags = useMemo(() => {
    return tagsText.split(",").map((t) => t.trim()).filter(Boolean);
  }, [tagsText]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("places").select("*").eq("id", placeId).single();
        if (error) throw error;
        setName(data.name ?? "");
        setTagsText((data.tags ?? []).join(", "));
        setMemo(data.memo ?? "");
      } catch (e: any) {
        Alert.alert("오류", e?.message ?? "불러오기에 실패했습니다.");
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [placeId]);

  const onSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("확인", "맛집 이름을 입력해주세요.");
      return;
    }
    try {
      setSaving(true);
      const { error } = await supabase
        .from("places")
        .update({ name: trimmed, tags, memo: memo.trim() || null })
        .eq("id", placeId);
      if (error) throw error;
      Alert.alert("완료", "맛집 정보가 수정됐어요!", [
        { text: "확인", onPress: () => navigation.goBack() },
      ]);
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

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.xl, gap: spacing.md, paddingBottom: 40 }}
    >
      <Text style={{ fontSize: 22, fontWeight: "900", color: colors.text, marginBottom: spacing.sm }}>
        맛집 수정
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

      {/* 저장 버튼 */}
      <Pressable
        onPress={onSave}
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
          marginTop: spacing.sm,
        }}
      >
        {saving && <ActivityIndicator color={colors.white} />}
        <Text style={{ color: colors.white, fontWeight: "800", fontSize: 16 }}>
          {saving ? "저장 중..." : "저장"}
        </Text>
      </Pressable>

      {/* 취소 버튼 */}
      <Pressable
        onPress={() => navigation.goBack()}
        style={{
          padding: spacing.md,
          borderRadius: radius.lg,
          alignItems: "center",
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ fontWeight: "700", color: colors.textSecondary }}>취소</Text>
      </Pressable>
    </ScrollView>
  );
}