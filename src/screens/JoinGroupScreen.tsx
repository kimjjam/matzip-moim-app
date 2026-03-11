import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { useGroupsStore } from "../store/useGroupsStore";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "JoinGroup">;

export default function JoinGroupScreen({ navigation }: Props) {
  const joinByInviteCode = useGroupsStore((s) => s.joinByInviteCode);
  const [code, setCode] = useState("");

  const onJoin = async () => {
    try {
      await joinByInviteCode(code);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("참가 실패", e?.message ?? "참가 실패");
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "900" }}>초대코드로 참가</Text>
      <Text style={{ opacity: 0.7 }}>친구가 준 초대코드를 입력하세요.</Text>

      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder="초대코드 (예: A2B3C4D5)"
        autoCapitalize="characters"
        style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12 }}
      />

      <Pressable onPress={onJoin} style={{ backgroundColor: "black", padding: 14, borderRadius: 12 }}>
        <Text style={{ color: "white", textAlign: "center", fontWeight: "900" }}>참가하기</Text>
      </Pressable>
    </View>
  );
}
