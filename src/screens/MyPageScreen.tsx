import React, { useState } from "react";
import {
  View, Text, Pressable, Alert, ScrollView,
  TextInput, Modal, ActivityIndicator,
} from "react-native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TabParamList, RootStackParamList } from "../navigation/RootNavigator";
import { useAuthStore } from "../store/useAuthStore";
import { supabase } from "../lib/supabase";
import { colors, radius, spacing, typography } from "../theme";

type Props = BottomTabScreenProps<TabParamList, "MyPage">;

export default function MyPageScreen({ navigation }: Props) {
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const hydrate = useAuthStore((s) => s.hydrate);

  const [editingNickname, setEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState("");
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const displayName = (user as any).nickname?.trim() || (user as any).email || "사용자";
  const currentNickname = (user as any).nickname ?? "";
  const email = (user as any).email ?? "";
  const uid = (user as any).id ?? "";

  const onSaveNickname = async () => {
    const trimmed = newNickname.trim();
    if (!trimmed) { Alert.alert("확인", "닉네임을 입력해주세요."); return; }
    try {
      setSaving(true);
      const { error } = await supabase.from("profiles").update({ nickname: trimmed }).eq("id", uid);
      if (error) throw error;
      await hydrate();
      setEditingNickname(false);
      Alert.alert("완료", "닉네임이 변경됐어요!");
    } catch (e: any) {
      Alert.alert("실패", e?.message ?? "닉네임 변경에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const onLogout = () => {
    Alert.alert("로그아웃", "정말 로그아웃 하시겠어요?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃", style: "destructive",
        onPress: async () => {
          try { await logout(); }
          finally { rootNavigation.reset({ index: 0, routes: [{ name: "Login" }] }); }
        },
      },
    ]);
  };

  return (
    <>
      <Modal visible={editingNickname} transparent animationType="fade" onRequestClose={() => setEditingNickname(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", padding: 30 }}>
          <View style={{ backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md }}>
            <Text style={typography.heading2}>닉네임 수정</Text>
            <TextInput
              value={newNickname}
              onChangeText={setNewNickname}
              placeholder="새 닉네임"
              placeholderTextColor={colors.textTertiary}
              style={{
                backgroundColor: colors.background,
                borderRadius: radius.md,
                padding: spacing.md,
                fontSize: 15, color: colors.text,
              }}
            />
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Pressable
                onPress={() => setEditingNickname(false)}
                style={{ flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.background }}
              >
                <Text style={{ textAlign: "center", fontWeight: "700", color: colors.textSecondary }}>취소</Text>
              </Pressable>
              <Pressable
                onPress={onSaveNickname}
                disabled={saving}
                style={{
                  flex: 1, padding: spacing.md, borderRadius: radius.md,
                  backgroundColor: colors.primary, opacity: saving ? 0.7 : 1,
                  flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8,
                }}
              >
                {saving && <ActivityIndicator color={colors.white} />}
                <Text style={{ textAlign: "center", fontWeight: "700", color: colors.white }}>저장</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          padding: spacing.xl,
          paddingTop: insets.top + 12,
          gap: spacing.md,
        }}
      >
        <Text style={{ fontSize: 26, fontWeight: "900", color: colors.text, marginBottom: spacing.sm }}>마이페이지</Text>

        <View style={{
          backgroundColor: colors.primaryLight,
          borderRadius: radius.lg,
          padding: spacing.xl,
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <View style={{
              width: 52, height: 52, borderRadius: radius.full,
              backgroundColor: colors.primary,
              alignItems: "center", justifyContent: "center",
            }}>
              <Text style={{ fontSize: 22 }}>👤</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>{displayName}</Text>
              <Text style={{ ...typography.caption, marginTop: 2 }}>{email}</Text>
            </View>
            <Pressable
              onPress={() => { setNewNickname(currentNickname); setEditingNickname(true); }}
              style={{
                paddingVertical: 6, paddingHorizontal: 12,
                borderRadius: radius.full,
                backgroundColor: colors.white,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primaryDark }}>수정</Text>
            </Pressable>
          </View>
        </View>

        <View style={{
          backgroundColor: colors.white, borderRadius: radius.lg,
          overflow: "hidden",
          shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
        }}>
          <Pressable
            onPress={() => rootNavigation.navigate("ResetPassword")}
            style={{
              padding: spacing.lg, flexDirection: "row",
              justifyContent: "space-between", alignItems: "center",
            }}
          >
            <Text style={{ fontWeight: "600", color: colors.text }}>비밀번호 변경</Text>
            <Text style={{ color: colors.textTertiary }}>›</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={onLogout}
          style={{
            padding: spacing.lg, borderRadius: radius.lg,
            backgroundColor: colors.dangerLight,
            alignItems: "center",
          }}
        >
          <Text style={{ fontWeight: "700", color: colors.danger }}>로그아웃</Text>
        </Pressable>

        <Text style={{ ...typography.caption, textAlign: "center", marginTop: spacing.sm }}>
          uid: {uid}
        </Text>
      </ScrollView>
    </>
  );
}