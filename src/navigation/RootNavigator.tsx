import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Linking from "expo-linking";

import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";
import ConfirmEmailScreen from "../screens/ConfirmEmailScreen";

import GroupScreen from "../screens/GroupScreen";
import PlaceListScreen from "../screens/PlaceListScreen";
import AddPlaceScreen from "../screens/AddPlaceScreen";
import PlaceDetailScreen from "../screens/PlaceDetailScreen";

// ✅ 추가된 화면들
import CreateGroupScreen from "../screens/CreateGroupScreen";
import JoinGroupScreen from "../screens/JoinGroupScreen";
import InviteMembersScreen from "../screens/InviteMembersScreen";

import { useAuthStore } from "../store/useAuthStore";
import { supabase } from "../lib/supabase";

export type RootStackParamList = {
  // 로그인 화면에 이메일 미리 채우기 용
  Login: { prefillEmail?: string } | undefined;
  Signup: undefined;
  ConfirmEmail: { email: string };

  Groups: undefined;

  // ✅ 모임 기능 추가
  CreateGroup: undefined;
  JoinGroup: undefined;
  InviteMembers: { groupId: string; groupName: string };

  Places: { groupId: string };
  AddPlace: { groupId: string };
  PlaceDetail: { groupId: string; placeId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function parseAuthCallback(url: string) {
  // query + hash 둘 다 파싱 (케이스에 따라 토큰이 hash로 올 수 있음)
  const query = url.includes("?") ? url.split("?")[1].split("#")[0] : "";
  const hash = url.includes("#") ? url.split("#")[1] : "";

  const q = new URLSearchParams(query);
  const h = new URLSearchParams(hash);

  const get = (k: string) => h.get(k) ?? q.get(k);

  return {
    access_token: get("access_token"),
    refresh_token: get("refresh_token"),
    code: get("code"),
    type: get("type"),
    error: get("error"),
    error_description: get("error_description"),
  };
}

export default function RootNavigator() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // ✅ 이메일 인증 링크(딥링크) 들어왔을 때 세션 저장 처리
  useEffect(() => {
    const handleUrl = async (url: string) => {
      if (!url) return;
      if (!url.includes("auth/callback")) return;

      const parsed = parseAuthCallback(url);

      // 에러가 넘어온 경우(예: otp_expired)
      if (parsed.error) {
        // 여기서 Alert 띄우고 싶으면 Root에서 Alert를 쓸 수도 있지만
        // 일단 조용히 무시하고 로그인/재시도 흐름으로 두는게 안전합니다.
        return;
      }

      try {
        if (parsed.code) {
          // PKCE 코드로 세션 교환
          await supabase.auth.exchangeCodeForSession(parsed.code);
        } else if (parsed.access_token && parsed.refresh_token) {
          // 토큰이 바로 오는 케이스
          await supabase.auth.setSession({
            access_token: parsed.access_token,
            refresh_token: parsed.refresh_token,
          });
        }

        // 세션 반영(스토어 갱신)
        await hydrate();
      } catch {
        // 실패해도 사용자가 로그인 화면에서 로그인 가능
      }
    };

    Linking.getInitialURL().then((u) => {
      if (u) handleUrl(u);
    });

    const sub = Linking.addEventListener("url", ({ url }) => {
      handleUrl(url);
    });

    return () => sub.remove();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator id="root" screenOptions={{ headerTitleAlign: "center" }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: "로그인" }} />
            <Stack.Screen name="Signup" component={SignupScreen} options={{ title: "회원가입" }} />
            <Stack.Screen
              name="ConfirmEmail"
              component={ConfirmEmailScreen}
              options={{ title: "이메일 확인" }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Groups" component={GroupScreen} options={{ title: "모임" }} />

            {/* ✅ 모임 기능 */}
            <Stack.Screen
              name="CreateGroup"
              component={CreateGroupScreen}
              options={{ title: "모임 만들기" }}
            />
            <Stack.Screen
              name="JoinGroup"
              component={JoinGroupScreen}
              options={{ title: "초대코드로 참가" }}
            />
            <Stack.Screen
              name="InviteMembers"
              component={InviteMembersScreen}
              options={{ title: "멤버 초대/관리" }}
            />

            <Stack.Screen name="Places" component={PlaceListScreen} options={{ title: "맛집" }} />
            <Stack.Screen name="AddPlace" component={AddPlaceScreen} options={{ title: "맛집 추가" }} />
            <Stack.Screen
              name="PlaceDetail"
              component={PlaceDetailScreen}
              options={{ title: "맛집 상세" }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
