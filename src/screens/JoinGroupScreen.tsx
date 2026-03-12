import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { useGroupsStore } from "../store/useGroupsStore";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { colors, radius, spacing, typography } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "JoinGroup">;

export default function JoinGroupScreen({ navigation }: Props) {
  const joinByInviteCode = useGroupsStore((s) => s.joinByInviteCode);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  const onJoin = async () => {
    if (!code.trim()) {
      Alert.alert("확인", "초대코드를 입력해주세요.");
      return;
    }
    try {
      setJoining(true);
      await joinByInviteCode(code.trim());
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("참가 실패", e?.message ?? "참가 실패");
    } finally {
      setJoining(false);
    }
  };

  return (
    <View style={{
      flex: 1, backgroundColor: colors.background,
      padding: spacing.xl, justifyContent: "center", gap: spacing.md,
    }}>
      {/* 헤더 */}
      <View style={{ marginBottom: spacing.md }}>
        <Text style={{ fontSize: 28, fontWeight: "900", color: colors.text }}>초대코드로 참가</Text>
        <Text style={{ ...typography.caption, marginTop: 4 }}>
          친구가 준 초대코드를 입력해주세요
        </Text>
      </View>

      {/* 코드 입력 */}
      <View style={{ gap: spacing.sm }}>
        <Text style={{ ...typography.label }}>초대코드</Text>
        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="예: A2B3C4D5"
          autoCapitalize="characters"
          placeholderTextColor={colors.textTertiary}
          style={{
            backgroundColor: colors.white,
            borderRadius: radius.md,
            padding: spacing.md,
            fontSize: 18,
            fontWeight: "700",
            color: colors.text,
            borderWidth: 1,
            borderColor: colors.border,
            textAlign: "center",
            letterSpacing: 4,
          }}
        />
      </View>

      {/* 참가 버튼 */}
      <Pressable
        onPress={onJoin}
        disabled={joining}
        style={{
          backgroundColor: colors.primary,
          padding: spacing.lg,
          borderRadius: radius.lg,
          alignItems: "center",
          opacity: joining ? 0.6 : 1,
          marginTop: spacing.sm,
        }}
      >
        <Text style={{ color: colors.white, fontWeight: "800", fontSize: 16 }}>
          {joining ? "참가 중..." : "참가하기"}
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