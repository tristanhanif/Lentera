import { BaseResponse } from "@/app/lib/axios";

export interface CommentPayload {
    content: string;
    postId: string;
    parentId?: string;
}

export interface CommentResponse {
    id: string
    content: string,
    createdAt: string,
    updatedAt: string,
    likesCount: number,
    isLiked: boolean,
    parentId?: string | null,

    user: {
        id: string,
        name: string,
        username?: string,
        avatar?: string,
    }

    post: {
        id: string,
    }
}

export interface PostCommentResponse extends BaseResponse {
    data: CommentResponse
}