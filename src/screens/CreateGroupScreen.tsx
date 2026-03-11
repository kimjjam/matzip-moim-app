import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { useGroupsStore } from "../store/useGroupsStore";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { colors, radius, spacing, typography } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "CreateGroup">;

export default function CreateGroupScreen({ navigation }: Props) {
  const createGroup = useGroupsStore((s) => s.createGroup);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const onCreate = async () => {
    if (!name.trim()) {
      Alert.alert("확인", "모임 이름을 입력해주세요.");
      return;
    }
    try {
      setSaving(true);
      await createGroup(name.trim());
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("실패", e?.message ?? "모임 생성 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.xl, justifyContent: "center", gap: spacing.md }}>

      {/* 헤더 */}
      <View style={{ marginBottom: spacing.md }}>
        <Text style={{ fontSize: 28, fontWeight: "900", color: colors.text }}>모임 만들기</Text>
        <Text style={{ ...typography.caption, marginTop: 4 }}>
          함께할 모임 이름을 정해보세요
        </Text>
      </View>

      {/* 입력 */}
      <View style={{ gap: spacing.sm }}>
        <Text style={{ ...typography.label }}>모임 이름 <Text style={{ color: colors.danger }}>*</Text></Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="예: 우리동네 맛집 탐방대"
          placeholderTextColor={colors.textTertiary}
          style={{
            backgroundColor: colors.white,
            borderRadius: radius.md,
            padding: spacing.md,
            fontSize: 15,
            color: colors.text,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        />
      </View>

      {/* 만들기 버튼 */}
      <Pressable
        onPress={onCreate}
        disabled={saving}
        style={{
          backgroundColor: colors.primary,
          padding: spacing.lg,
          borderRadius: radius.lg,
          alignItems: "center",
          opacity: saving ? 0.6 : 1,
          marginTop: spacing.sm,
        }}
      >
        <Text style={{ color: colors.white, fontWeight: "800", fontSize: 16 }}>
          {saving ? "만드는 중..." : "만들기"}
        </Text>
      </Pressable>

      {/* 취소 */}
      <Pressable
        onPress={() => navigation.goBack()}
        style={{
          padding: spacing.md, borderRadius: radius.lg,
          alignItems: "center", borderWidth: 1, borderColor: colors.border,
        }}
      >
        <Text style={{ fontWeight: "700", color: colors.textSecondary }}>취소</Text>
      </Pressable>
    </View>
  );
}