export enum NotificationType {
  LIKE = 'like',
  COMMENT = 'comment',
  FOLLOW = 'follow',
  MENTION = 'mention',
  COMMUNITY = 'community',
}

export interface NotificationActor {
  id: string;
  name: string;
  username: string;
  avatar?: string;
}

export interface NotificationPost {
  id: string;
  content: string;
  createdAt: string;
  medias?: {
    id: string;
    url: string;
    type: string;
  }[];
}

export interface NotificationCommunity {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface NotificationData {
  id: string;
  type: NotificationType;
  content: string;
  isRead: boolean;
  actor: NotificationActor;
  post?: NotificationPost;
  community?: NotificationCommunity;
  createdAt: string;
}
