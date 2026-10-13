export interface CommentLikeStatusResponse {
  message: string;
  data: {
    liked: boolean;
    totalLikes: number;
  };
}

export interface ToggleCommentLikeResponse {
  message: string;
  data: {
    liked: boolean;
    totalLikes: number;
  };
}
