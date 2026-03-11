import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useAuthStore } from "../store/useAuthStore";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation, route }: Props) {
  const user = useAuthStore((s) => s.user);
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState(route.params?.prefillEmail ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigation.reset({
        index: 0,
        routes: [{ name: "Groups" }],
      });
    }
  }, [user, navigation]);

  const onLogin = async () => {
    const e = email.trim();

    if (!e || !password) {
      Alert.alert("확인", "이메일과 비밀번호를 입력해주세요.");
      return;
    }

    try {
      setLoading(true);

      // 1) Supabase REST 네트워크 테스트
      try {
        const res = await fetch(
          "https://liertsboplbpctzyjfzr.supabase.co/rest/v1/",
          {
            headers: {
              apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
            },
          }
        );

        console.log("FETCH TEST STATUS =", res.status);
        const text = await res.text();
        console.log("FETCH TEST BODY =", text);
      } catch (fetchErr) {
        console.log("FETCH TEST ERROR =", fetchErr);
      }

      // 2) 실제 로그인
      await login(e, password);

      navigation.reset({
        index: 0,
        routes: [{ name: "Groups" }],
      });
    } catch (err: any) {
      console.log("LOGIN ERROR =", err);
      Alert.alert("로그인 실패", err?.message ?? "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 26, fontWeight: "900" }}>맛집 모임</Text>
      <Text style={{ opacity: 0.7 }}>이메일/비밀번호로 로그인합니다.</Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="이메일"
        autoCapitalize="none"
        keyboardType="email-address"
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 12,
          padding: 12,
        }}
      />

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="비밀번호"
        secureTextEntry
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 12,
          padding: 12,
        }}
      />

      <Pressable
        onPress={onLogin}
        disabled={loading}
        style={{
          backgroundColor: "black",
          padding: 14,
          borderRadius: 12,
          opacity: loading ? 0.6 : 1,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
        }}
      >
        {loading && <ActivityIndicator color="white" />}
        <Text style={{ color: "white", textAlign: "center", fontWeight: "900" }}>
          로그인
        </Text>
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate("ConfirmEmail", { email: email.trim() || "" })}
        style={{ padding: 12, borderRadius: 12 }}
      >
        <Text style={{ textAlign: "center", fontWeight: "900" }}>인증메일 재전송</Text>
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate("Signup")}
        style={{ padding: 12, borderRadius: 12 }}
      >
        <Text style={{ textAlign: "center", fontWeight: "900" }}>회원가입</Text>
      </Pressable>
    </View>
  );
}