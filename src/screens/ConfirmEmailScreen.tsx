import React, { useMemo, useState } from "react";
import { View, Text, Pressable, Alert, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { supabase } from "../lib/supabase";
import * as Linking from "expo-linking";

type Props = NativeStackScreenProps<RootStackParamList, "ConfirmEmail">;

export default function ConfirmEmailScreen({ route, navigation }: Props) {
  const { email } = route.params;

  const [loading, setLoading] = useState(false);

  const emailRedirectTo = useMemo(() => Linking.createURL("auth/callback"), []);

  const resend = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo },
      });
      if (error) throw error;

      Alert.alert("재전송 완료", "인증 메일을 다시 보냈습니다. 메일함/스팸함을 확인해주세요.");
    } catch (err: any) {
      Alert.alert("재전송 실패", err?.message ?? "인증 메일 재전송에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "900" }}>이메일 인증이 필요해요</Text>

      <Text style={{ opacity: 0.8, lineHeight: 20 }}>
        아래 이메일로 인증 링크를 보냈습니다.
      </Text>

      <Text style={{ fontWeight: "900" }}>{email}</Text>

      <Text style={{ opacity: 0.7, lineHeight: 20, marginTop: 10 }}>
        1) 메일함(스팸함 포함)에서 인증 메일을 열고{"\n"}
        2) 링크를 눌러 인증을 완료한 뒤{"\n"}
        3) 다시 로그인해 주세요.
      </Text>

      <Pressable
        onPress={resend}
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
          marginTop: 10,
        }}
      >
        {loading && <ActivityIndicator color="white" />}
        <Text style={{ color: "white", fontWeight: "900" }}>인증메일 재전송</Text>
      </Pressable>

      <Pressable
        onPress={() => navigation.replace("Login", { prefillEmail: email })}
        style={{ padding: 12, borderRadius: 12 }}
      >
        <Text style={{ textAlign: "center", fontWeight: "900" }}>
          로그인 화면으로
        </Text>
      </Pressable>

      <Text style={{ opacity: 0.55, fontSize: 12, marginTop: 10 }}>
        * 인증 링크를 눌렀는데 "otp_expired"가 뜨면,
        오래된 메일일 가능성이 큽니다. "재전송" 후 새 메일로 다시 진행하세요.
      </Text>
    </View>
  );
}