export interface RegisterPayload {
  username: string;
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
  access_token: string;
  refresh_token: string;
}
