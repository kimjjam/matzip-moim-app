import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useAuthStore } from "../store/useAuthStore";
import { colors, radius, spacing, typography } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Signup">;

export default function SignupScreen({ navigation }: Props) {
  const signup = useAuthStore((s) => s.signup);

  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSignup = async () => {
    const n = nickname.trim();
    const e = email.trim();

    if (!n || !e || !password) {
      Alert.alert("확인", "닉네임/이메일/비밀번호를 모두 입력해주세요.");
      return;
    }

    try {
      setLoading(true);
      const { needsEmailConfirm } = await signup(e, password, n);
      if (needsEmailConfirm) {
        navigation.replace("ConfirmEmail", { email: e });
      } else {
        navigation.replace("MainTabs");
      }
    } catch (err: any) {
      Alert.alert("회원가입 실패", err?.message ?? "회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
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
      contentContainerStyle={{ padding: spacing.xl, justifyContent: "center", gap: spacing.md, flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* 헤더 */}
      <View style={{ marginBottom: spacing.md }}>
        <Text style={{ fontSize: 32, fontWeight: "900", color: colors.text }}>🍽️ 회원가입</Text>
        <Text style={{ ...typography.caption, marginTop: 6 }}>
          닉네임은 모임과 평점에서 표시돼요
        </Text>
      </View>

      {/* 닉네임 */}
      <View style={{ gap: spacing.sm }}>
        <Text style={{ ...typography.label }}>닉네임 <Text style={{ color: colors.danger }}>*</Text></Text>
        <TextInput
          value={nickname}
          onChangeText={setNickname}
          placeholder="예: 재원"
          autoCapitalize="none"
          placeholderTextColor={colors.textTertiary}
          style={inputStyle}
        />
      </View>

      {/* 이메일 */}
      <View style={{ gap: spacing.sm }}>
        <Text style={{ ...typography.label }}>이메일 <Text style={{ color: colors.danger }}>*</Text></Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="example@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor={colors.textTertiary}
          style={inputStyle}
        />
      </View>

      {/* 비밀번호 */}
      <View style={{ gap: spacing.sm }}>
        <Text style={{ ...typography.label }}>비밀번호 <Text style={{ color: colors.danger }}>*</Text></Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="6자 이상 입력해주세요"
          secureTextEntry
          placeholderTextColor={colors.textTertiary}
          style={inputStyle}
        />
      </View>

      {/* 가입 버튼 */}
      <Pressable
        onPress={onSignup}
        disabled={loading}
        style={{
          backgroundColor: colors.primary,
          padding: spacing.lg,
          borderRadius: radius.lg,
          opacity: loading ? 0.6 : 1,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: spacing.sm,
          marginTop: spacing.sm,
        }}
      >
        {loading && <ActivityIndicator color={colors.white} />}
        <Text style={{ color: colors.white, fontWeight: "800", fontSize: 16 }}>
          {loading ? "가입 중..." : "가입하기"}
        </Text>
      </Pressable>

      {/* 로그인으로 */}
      <Pressable
        onPress={() => navigation.replace("Login")}
        style={{ padding: spacing.md, borderRadius: radius.lg, alignItems: "center" }}
      >
        <Text style={{ fontWeight: "700", color: colors.textSecondary }}>
          이미 계정이 있으신가요? <Text style={{ color: colors.primary }}>로그인</Text>
        </Text>
      </Pressable>
    </ScrollView>
  );
}