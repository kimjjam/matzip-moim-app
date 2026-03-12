import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, Pressable,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useAuthStore } from "../store/useAuthStore";
import { supabase } from "../lib/supabase";
import { colors, radius, spacing, typography } from "../theme";

WebBrowser.maybeCompleteAuthSession();

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation, route }: Props) {
  const user = useAuthStore((s) => s.user);
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState(route.params?.prefillEmail ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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

  const onGoogleLogin = async () => {
  try {
    setGoogleLoading(true);
    const redirectUrl = AuthSession.makeRedirectUri({ 
      scheme: "matzipmoimapp",
      path: "auth/callback",
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;
    if (!data.url) throw new Error("구글 로그인 URL을 가져오지 못했습니다.");

    const result = await WebBrowser.openAuthSessionAsync(
      data.url, 
      redirectUrl,
      { showInRecents: true }
    );

    console.log("result:", JSON.stringify(result));

    if (result.type === "success" && result.url) {
      const fragment = result.url.split("#")[1] ?? "";
      const params = new URLSearchParams(fragment);
      const at = params.get("access_token");
      const rt = params.get("refresh_token");

      if (at && rt) {
        await supabase.auth.setSession({ access_token: at, refresh_token: rt });
      } else {
        const url = new URL(result.url);
        const at2 = url.searchParams.get("access_token");
        const rt2 = url.searchParams.get("refresh_token");
        if (at2 && rt2) {
          await supabase.auth.setSession({ access_token: at2, refresh_token: rt2 });
        }
      }
    } else {
      console.log("result type:", result.type);
    }
  } catch (err: any) {
    Alert.alert("구글 로그인 실패", err?.message ?? "다시 시도해주세요.");
  } finally {
    setGoogleLoading(false);
  }
};

  const inputStyle = {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: spacing.xl }}>

        {/* 로고 */}
        <View style={{ alignItems: "center", marginBottom: 48 }}>
          <Text style={{ fontSize: 36, fontWeight: "900", color: colors.text, letterSpacing: -1 }}>
            MZ모임
          </Text>
          <Text style={{ ...typography.caption, marginTop: 8 }}>함께 찾는 우리만의 맛집</Text>
        </View>

        {/* 입력 카드 */}
        <View style={{
          backgroundColor: colors.card,
          borderRadius: radius.xl,
          padding: spacing.xl,
          gap: spacing.md,
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 16,
          elevation: 2,
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

          {/* 구분선 + 소셜 로그인 */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginVertical: 4 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            <Text style={{ fontSize: 12, color: colors.textTertiary, fontWeight: "600" }}>소셜 로그인</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          </View>

          {/* 소셜 버튼들 */}
          <View style={{ flexDirection: "row", justifyContent: "center", gap: spacing.lg }}>
            {/* 구글 */}
            <Pressable
              onPress={onGoogleLogin}
              disabled={googleLoading}
              style={{
                width: 52, height: 52, borderRadius: radius.full,
                backgroundColor: colors.white,
                borderWidth: 1.5, borderColor: colors.border,
                alignItems: "center", justifyContent: "center",
                shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
                opacity: googleLoading ? 0.7 : 1,
              }}
            >
              {googleLoading
                ? <ActivityIndicator color={colors.textSecondary} size="small" />
                : <Text style={{ fontSize: 22, fontWeight: "900", color: "#4285F4" }}>G</Text>
              }
            </Pressable>
          </View>

          {/* 비밀번호 찾기 */}
          <Pressable onPress={() => navigation.navigate("ResetPassword")}>
            <Text style={{ textAlign: "center", color: colors.textSecondary, fontWeight: "600", fontSize: 13 }}>
              비밀번호를 잊으셨나요?
            </Text>
          </Pressable>
        </View>

        {/* 하단 링크 */}
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