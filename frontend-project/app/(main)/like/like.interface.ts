export interface LikeStatusResponse {
  message: string;
  data: {
    liked: boolean;
    totalLikes: number;
  };
}

export interface ToggleLikeResponse {
  message: string;
  data: {
    liked: boolean;
  };
}
