import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, Alert, Share } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useGroupsStore } from "../store/useGroupsStore";

type Props = NativeStackScreenProps<RootStackParamList, "InviteMembers">;

export default function InviteMembersScreen({ route }: Props) {
  const { groupId, groupName } = route.params;

  const groups = useGroupsStore((s) => s.groups);
  const createInviteCode = useGroupsStore((s) => s.createInviteCode);
  const removeMember = useGroupsStore((s) => s.removeMember);

  const group = useMemo(() => groups.find((g) => g.id === groupId), [groups, groupId]);
  const [code, setCode] = useState<string>("");

  const isAdmin = group?.myRole === "admin";

  const onMakeCode = async () => {
    try {
      const c = await createInviteCode(groupId);
      setCode(c);
    } catch (e: any) {
      Alert.alert("실패", e?.message ?? "초대코드 생성 실패");
    }
  };

  const onShare = async () => {
    if (!code) {
      Alert.alert("안내", "먼저 초대코드를 생성해주세요.");
      return;
    }
    await Share.share({
      message: `[${groupName}] 초대코드: ${code}\n앱에서 '초대코드로 참가'에 입력하면 됩니다.`,
    });
  };

  const onKick = async (userId: string) => {
    if (!isAdmin) return;
    Alert.alert("멤버 제거", "이 멤버를 모임에서 제거할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "제거",
        style: "destructive",
        onPress: async () => {
          try {
            await removeMember(groupId, userId);
          } catch (e: any) {
            Alert.alert("실패", e?.message ?? "제거 실패");
          }
        },
      },
    ]);
  };

  useEffect(() => {
    setCode("");
  }, [groupId]);

  return (
    <View style={{ flex: 1, padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "900" }}>{groupName}</Text>
      <Text style={{ opacity: 0.7 }}>
        초대코드를 만들어 공유하면, 상대가 코드로 참가할 수 있습니다.
      </Text>

      <View style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#ddd", gap: 10 }}>
        <Text style={{ fontWeight: "900" }}>초대코드</Text>
        <Text style={{ fontSize: 22, fontWeight: "900" }}>{code || "—"}</Text>

        <Pressable
          onPress={onMakeCode}
          style={{ backgroundColor: "black", padding: 12, borderRadius: 12 }}
        >
          <Text style={{ color: "white", textAlign: "center", fontWeight: "900" }}>
            초대코드 생성
          </Text>
        </Pressable>

        <Pressable onPress={onShare} style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#ddd" }}>
          <Text style={{ textAlign: "center", fontWeight: "900" }}>공유하기</Text>
        </Pressable>

        {!isAdmin && (
          <Text style={{ fontSize: 12, opacity: 0.6 }}>
            ※ 초대코드 생성은 관리자(admin)만 가능합니다.
          </Text>
        )}
      </View>

      <Text style={{ fontWeight: "900", marginTop: 8 }}>멤버</Text>
      {(group?.members ?? []).map((m) => {
        const label = m.nickname ?? m.userId.slice(0, 8);
        return (
          <Pressable
            key={m.userId}
            onLongPress={() => onKick(m.userId)}
            disabled={!isAdmin}
            style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#ddd" }}
          >
            <Text style={{ fontWeight: "900" }}>
              {label} ({m.role})
            </Text>
            {isAdmin && <Text style={{ fontSize: 12, opacity: 0.6 }}>길게 눌러 제거</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}
