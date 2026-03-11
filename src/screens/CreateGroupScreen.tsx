import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { useGroupsStore } from "../store/useGroupsStore";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "CreateGroup">;

export default function CreateGroupScreen({ navigation }: Props) {
  const createGroup = useGroupsStore((s) => s.createGroup);
  const [name, setName] = useState("");

  const onCreate = async () => {
    try {
      await createGroup(name);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("실패", e?.message ?? "모임 생성 실패");
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "900" }}>모임 만들기</Text>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="모임 이름 (예: 우리모임)"
        style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12 }}
      />

      <Pressable onPress={onCreate} style={{ backgroundColor: "black", padding: 14, borderRadius: 12 }}>
        <Text style={{ color: "white", textAlign: "center", fontWeight: "900" }}>만들기</Text>
      </Pressable>
    </View>
  );
}
