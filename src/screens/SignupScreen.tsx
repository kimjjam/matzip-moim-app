import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useAuthStore } from "../store/useAuthStore";

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
        // ✅ 안내 화면으로 이동
        navigation.replace("ConfirmEmail", { email: e });
      } else {
        navigation.replace("Groups");
      }
    } catch (err: any) {
      Alert.alert("회원가입 실패", err?.message ?? "회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 26, fontWeight: "900" }}>회원가입</Text>
      <Text style={{ opacity: 0.7 }}>닉네임은 모임/평점에서 표시됩니다.</Text>

      <TextInput
        value={nickname}
        onChangeText={setNickname}
        placeholder="닉네임 (예: 재원)"
        autoCapitalize="none"
        style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12 }}
      />

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="이메일"
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12 }}
      />

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="비밀번호"
        secureTextEntry
        style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12 }}
      />

      <Pressable
        onPress={onSignup}
        disabled={loading}
        style={{
          backgroundColor: "black",
          padding: 14,
          borderRadius: 12,
          opacity: loading ? 0.6 : 1,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {loading && <ActivityIndicator />}
        <Text style={{ color: "white", textAlign: "center", fontWeight: "900" }}>
          가입하기
        </Text>
      </Pressable>

      <Pressable onPress={() => navigation.replace("Login")} style={{ padding: 12, borderRadius: 12 }}>
        <Text style={{ textAlign: "center", fontWeight: "900" }}>로그인으로 돌아가기</Text>
      </Pressable>
    </View>
  );
}
