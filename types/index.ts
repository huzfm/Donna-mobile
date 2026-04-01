export type Message = {
  id: number;
  content: string;
  created_at: string;
  user_id?: string;
};

export type AuthContextType = {
  user: any;
};