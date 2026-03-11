import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, Pressable,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useAuthStore } from "../store/useAuthStore";
import { colors, radius, spacing, typography } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation, route }: Props) {
  const user = useAuthStore((s) => s.user);
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState(route.params?.prefillEmail ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
    }
  }, [user, navigation]);

  const onLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("확인", "이메일과 비밀번호를 입력해주세요.");
      return;
    }
    try {
      setLoading(true);
      await login(email.trim(), password);
      navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
    } catch (err: any) {
      Alert.alert("로그인 실패", err?.message ?? "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: spacing.xl }}>

        {/* 로고 */}
        <View style={{ alignItems: "center", marginBottom: 48 }}>
          <View style={{
            width: 88, height: 88, borderRadius: radius.xl,
            backgroundColor: colors.primaryLight,
            alignItems: "center", justifyContent: "center",
            marginBottom: 16,
            shadowColor: colors.primary,
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 4,
          }}>
            <Text style={{ fontSize: 40 }}>🍽️</Text>
          </View>
          <Text style={{ fontSize: 30, fontWeight: "900", color: colors.text, letterSpacing: -0.5 }}>MZ모임</Text>
          <Text style={{ ...typography.caption, marginTop: 6 }}>함께 찾는 우리만의 맛집</Text>
        </View>

        {/* 입력 카드 */}
        <View style={{
          backgroundColor: colors.card,
          borderRadius: radius.xl,
          padding: spacing.xl,
          gap: spacing.md,
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 16,
          elevation: 3,
        }}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="이메일"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            keyboardType="email-address"
            style={inputStyle}
          />

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="비밀번호"
            placeholderTextColor={colors.textTertiary}
            secureTextEntry
            onSubmitEditing={onLogin}
            style={inputStyle}
          />

          <Pressable
            onPress={onLogin}
            disabled={loading}
            style={{
              backgroundColor: colors.primary,
              padding: spacing.md,
              borderRadius: radius.md,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              marginTop: 4,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading && <ActivityIndicator color={colors.white} />}
            <Text style={{ color: colors.white, fontWeight: "800", fontSize: 16 }}>로그인</Text>
          </Pressable>

          {/* 비밀번호 찾기 */}
          <Pressable onPress={() => navigation.navigate("ResetPassword")}>
            <Text style={{ textAlign: "center", color: colors.textSecondary, fontWeight: "600", fontSize: 13 }}>
              비밀번호를 잊으셨나요?
            </Text>
          </Pressable>
        </View>

        {/* 하단 링크들 */}
        <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 }}>
            <Text style={{ color: colors.textTertiary, fontSize: 14 }}>아직 계정이 없으신가요?</Text>
            <Pressable onPress={() => navigation.navigate("Signup")}>
              <Text style={{ color: colors.primaryDark, fontWeight: "800", fontSize: 14 }}>회원가입</Text>
            </Pressable>
          </View>

          <Pressable onPress={() => navigation.navigate("ConfirmEmail", { email: email.trim() || "" })}>
            <Text style={{ textAlign: "center", color: colors.textTertiary, fontSize: 12, marginTop: 4 }}>
              인증메일 재전송
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}