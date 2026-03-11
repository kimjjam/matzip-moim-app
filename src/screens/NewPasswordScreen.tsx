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

type Props = NativeStackScreenProps<RootStackParamList, "NewPassword">;

export default function NewPasswordScreen({ navigation }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!password) {
      Alert.alert("확인", "새 비밀번호를 입력해주세요.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("확인", "비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("확인", "비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      Alert.alert("완료", "비밀번호가 변경됐어요!", [
        {
          text: "확인",
          onPress: () =>
            navigation.reset({ index: 0, routes: [{ name: "Groups" }] }),
        },
      ]);
    } catch (err: any) {
      Alert.alert("실패", err?.message ?? "비밀번호 변경에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "900" }}>새 비밀번호 설정</Text>
      <Text style={{ opacity: 0.7 }}>새로 사용할 비밀번호를 입력해주세요.</Text>

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="새 비밀번호 (6자 이상)"
        secureTextEntry
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 12,
          padding: 12,
        }}
      />

      <TextInput
        value={confirm}
        onChangeText={setConfirm}
        placeholder="비밀번호 확인"
        secureTextEntry
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 12,
          padding: 12,
        }}
      />

      <Pressable
        onPress={onSubmit}
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
        <Text style={{ color: "white", fontWeight: "900" }}>비밀번호 변경</Text>
      </Pressable>
    </View>
  );
}