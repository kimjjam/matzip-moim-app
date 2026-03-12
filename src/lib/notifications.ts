import * as Notifications from "expo-notifications";
import { supabase } from "./supabase";

// 포그라운드에서도 알림 표시
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerPushToken() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return null;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "5fa51518-1081-4640-a6c9-b0bbead876a1",
    });

    const token = tokenData.data;

    const { data: session } = await supabase.auth.getSession();
    const uid = session?.session?.user?.id;
    if (!uid) return null;

    await supabase.from("push_tokens").upsert(
      { user_id: uid, token, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

    return token;
  } catch (e) {
    console.log("[registerPushToken] error:", e);
    return null;
  }
}

export async function sendPushToGroupMembers(
  groupId: string,
  excludeUserId: string,
  title: string,
  body: string
) {
  try {
    const { data: members } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId)
      .neq("user_id", excludeUserId);

    if (!members || members.length === 0) return;

    const userIds = members.map((m: any) => m.user_id);

    const { data: tokens } = await supabase
      .from("push_tokens")
      .select("token")
      .in("user_id", userIds);

    if (!tokens || tokens.length === 0) return;

    const messages = tokens.map((t: any) => ({
      to: t.token,
      title,
      body,
      sound: "default",
    }));

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.log("[sendPushToGroupMembers] error:", e);
  }
}