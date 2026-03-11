import React, { useEffect } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useGroupsStore } from "../store/useGroupsStore";
import { useAuthStore } from "../store/useAuthStore";

type Props = NativeStackScreenProps<RootStackParamList, "Groups">;

export default function GroupScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const { groups, loadGroups, loading } = useGroupsStore();

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const onLogout = () => {
    Alert.alert("로그아웃", "정말 로그아웃 하시겠어요?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
          } finally {
            navigation.reset({ index: 0, routes: [{ name: "Login" }] });
          }
        },
      },
    ]);
  };

  if (!user) return null;

  const displayName = user.nickname?.trim() || user.email || "사용자";

  return (
    <View style={{ flex: 1, padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 26, fontWeight: "900" }}>모임</Text>

      <View style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#ddd", gap: 8 }}>
        <Text style={{ fontWeight: "900" }}>현재 로그인: {displayName}</Text>
        <Text style={{ opacity: 0.7, fontSize: 12 }}>uid: {user.id}</Text>

        <Pressable onPress={onLogout} style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#ddd" }}>
          <Text style={{ textAlign: "center", fontWeight: "900" }}>로그아웃</Text>
        </Pressable>
      </View>

      {/* ✅ 모임 추가 / 참가 */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          onPress={() => navigation.navigate("CreateGroup")}
          style={{ flex: 1, backgroundColor: "black", padding: 14, borderRadius: 12 }}
        >
          <Text style={{ color: "white", textAlign: "center", fontWeight: "900" }}>+ 모임 만들기</Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate("JoinGroup")}
          style={{ flex: 1, borderWidth: 1, borderColor: "#ddd", padding: 14, borderRadius: 12 }}
        >
          <Text style={{ textAlign: "center", fontWeight: "900" }}>초대코드로 참가</Text>
        </Pressable>
      </View>

      <Text style={{ fontWeight: "900", marginTop: 6 }}>
        내 모임 {loading ? "(불러오는 중...)" : ""}
      </Text>

      {groups.map((g) => (
        <View key={g.id} style={{ gap: 10 }}>
          <Pressable
            onPress={() => navigation.navigate("Places", { groupId: g.id })}
            style={{ backgroundColor: "black", padding: 14, borderRadius: 12 }}
          >
            <Text style={{ color: "white", textAlign: "center", fontWeight: "900" }}>
              {g.name} 들어가기
            </Text>
            <Text style={{ color: "white", textAlign: "center", opacity: 0.75, marginTop: 6 }}>
              멤버 {g.members.length}명 · 맛집 {g.places.length}개 · 내 권한 {g.myRole}
            </Text>
          </Pressable>

          {/* ✅ 멤버 초대(관리자면 코드 생성 가능) */}
          <Pressable
            onPress={() => navigation.navigate("InviteMembers", { groupId: g.id, groupName: g.name })}
            style={{ borderWidth: 1, borderColor: "#ddd", padding: 14, borderRadius: 12 }}
          >
            <Text style={{ textAlign: "center", fontWeight: "900" }}>멤버 초대 / 멤버 관리</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}
