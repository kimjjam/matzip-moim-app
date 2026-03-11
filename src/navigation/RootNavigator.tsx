import React, { useEffect, useRef } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { NavigationContainer, NavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Linking from "expo-linking";

import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";
import ConfirmEmailScreen from "../screens/ConfirmEmailScreen";
import ResetPasswordScreen from "../screens/ResetPasswordScreen";
import NewPasswordScreen from "../screens/NewPasswordScreen";

import GroupScreen from "../screens/GroupScreen";
import PlaceListScreen from "../screens/PlaceListScreen";
import AddPlaceScreen from "../screens/AddPlaceScreen";
import PlaceDetailScreen from "../screens/PlaceDetailScreen";
import EditPlaceScreen from "../screens/EditPlaceScreen";

import CreateGroupScreen from "../screens/CreateGroupScreen";
import JoinGroupScreen from "../screens/JoinGroupScreen";
import InviteMembersScreen from "../screens/InviteMembersScreen";
import MyPageScreen from "../screens/MyPageScreen";

import { useAuthStore } from "../store/useAuthStore";
import { supabase } from "../lib/supabase";
import { colors } from "../theme";

export type RootStackParamList = {
  Login: { prefillEmail?: string } | undefined;
  Signup: undefined;
  ConfirmEmail: { email: string };
  ResetPassword: undefined;
  NewPassword: undefined;
  MainTabs: undefined;
  CreateGroup: undefined;
  JoinGroup: undefined;
  InviteMembers: { groupId: string; groupName: string };
  Places: { groupId: string };
  AddPlace: { groupId: string };
  PlaceDetail: { groupId: string; placeId: string };
  EditPlace: { groupId: string; placeId: string };
};

export type TabParamList = {
  Groups: undefined;
  MyPage: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      id="tabs"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 50 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Groups"
        component={GroupScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Text style={{
              fontSize: 13,
              fontWeight: focused ? "800" : "500",
              color: focused ? colors.primaryDark : colors.textTertiary,
            }}>
              홈
            </Text>
          ),
        }}
      />
      <Tab.Screen
        name="MyPage"
        component={MyPageScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Text style={{
              fontSize: 13,
              fontWeight: focused ? "800" : "500",
              color: focused ? colors.primaryDark : colors.textTertiary,
            }}>
              My
            </Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function parseAuthCallback(url: string) {
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
  };
}

export default function RootNavigator() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const handleUrl = async (url: string) => {
      if (!url) return;
      if (!url.includes("auth/callback")) return;

      const parsed = parseAuthCallback(url);
      if (parsed.error) return;

      try {
        if (parsed.type === "recovery") {
          if (parsed.access_token && parsed.refresh_token) {
            await supabase.auth.setSession({
              access_token: parsed.access_token,
              refresh_token: parsed.refresh_token,
            });
          } else if (parsed.code) {
            await supabase.auth.exchangeCodeForSession(parsed.code);
          }
          await hydrate();
          navigationRef.current?.navigate("NewPassword");
        } else {
          if (parsed.code) {
            await supabase.auth.exchangeCodeForSession(parsed.code);
          } else if (parsed.access_token && parsed.refresh_token) {
            await supabase.auth.setSession({
              access_token: parsed.access_token,
              refresh_token: parsed.refresh_token,
            });
          }
          await hydrate();
        }
      } catch {
        // 실패해도 로그인 화면에서 재시도 가능
      }
    };

    Linking.getInitialURL().then((u) => { if (u) handleUrl(u); });
    const sub = Linking.addEventListener("url", ({ url }) => { handleUrl(url); });
    return () => sub.remove();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <Text style={{ fontSize: 28, fontWeight: "900", color: colors.primary }}>🍽️ MZ모임</Text>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        id="root"
        screenOptions={{
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: colors.white },
          headerTitleStyle: { fontWeight: "800", color: colors.text },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Signup" component={SignupScreen} options={{ title: "회원가입" }} />
            <Stack.Screen name="ConfirmEmail" component={ConfirmEmailScreen} options={{ title: "이메일 확인" }} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ title: "비밀번호 재설정" }} />
            <Stack.Screen name="NewPassword" component={NewPasswordScreen} options={{ title: "새 비밀번호 설정" }} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ title: "비밀번호 재설정" }} />
            <Stack.Screen name="NewPassword" component={NewPasswordScreen} options={{ title: "새 비밀번호 설정" }} />
            <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: "모임 만들기" }} />
            <Stack.Screen name="JoinGroup" component={JoinGroupScreen} options={{ title: "초대코드로 참가" }} />
            <Stack.Screen name="InviteMembers" component={InviteMembersScreen} options={{ title: "멤버 초대/관리" }} />
            <Stack.Screen name="Places" component={PlaceListScreen} options={{ title: "맛집" }} />
            <Stack.Screen name="AddPlace" component={AddPlaceScreen} options={{ title: "맛집 추가" }} />
            <Stack.Screen name="PlaceDetail" component={PlaceDetailScreen} options={{ title: "맛집 상세" }} />
            <Stack.Screen name="EditPlace" component={EditPlaceScreen} options={{ title: "맛집 수정" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}