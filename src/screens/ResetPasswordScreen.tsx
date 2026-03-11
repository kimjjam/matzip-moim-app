import React, { useState } from "react";
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
import { supabase } from "../lib/supabase";
import * as Linking from "expo-linking";

type Props = NativeStackScreenProps<RootStackParamList, "ResetPassword">;

export default function ResetPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSend = async () => {
    const e = email.trim();
    if (!e) {
      Alert.alert("확인", "이메일을 입력해주세요.");
      return;
    }

    try {
      setLoading(true);
      const redirectTo = Linking.createURL("auth/callback");
      const { error } = await supabase.auth.resetPasswordForEmail(e, {
        redirectTo,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      Alert.alert("실패", err?.message ?? "재설정 메일 전송에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={{ flex: 1, padding: 20, justifyContent: "center", gap: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: "900" }}>메일을 보냈어요!</Text>
        <Text style={{ opacity: 0.7, lineHeight: 22 }}>
          {email} 으로 비밀번호 재설정 링크를 보냈습니다.{"\n"}
          메일함(스팸함 포함)을 확인해주세요.
        </Text>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ backgroundColor: "black", padding: 14, borderRadius: 12 }}
        >
          <Text style={{ color: "white", textAlign: "center", fontWeight: "900" }}>
            로그인으로 돌아가기
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "900" }}>비밀번호 재설정</Text>
      <Text style={{ opacity: 0.7 }}>
        가입한 이메일을 입력하면 재설정 링크를 보내드려요.
      </Text>

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

      <Pressable
        onPress={onSend}
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
        {loading && <ActivityIndicator color="white" />}
        <Text style={{ color: "white", fontWeight: "900" }}>재설정 메일 보내기</Text>
      </Pressable>

      <Pressable
        onPress={() => navigation.goBack()}
        style={{ padding: 12, borderRadius: 12 }}
      >
        <Text style={{ textAlign: "center", fontWeight: "900" }}>돌아가기</Text>
      </Pressable>
    </View>
  );
}