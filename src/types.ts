export type Rating = number; // 0.0 ~ 5.0

export type PlaceRating = {
  userId: string;
  value: Rating;
  ratedAt: string;
};

export type Place = {
  id: string;
  name: string;
  tags: string[];
  memo?: string;
  visitedAt: string;
  createdBy: string;
  ratings: PlaceRating[];
};

export type GroupMember = {
  userId: string;
  nickname: string | null;
  role: "admin" | "member";
};

export type Group = {
  id: string;
  name: string;
  myRole: "admin" | "member";
  members: GroupMember[];
  places: Place[];
};