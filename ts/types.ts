export type Comment = {
  id: number;
  secret: string | null;
  message: string;
  author: string;
  approved: boolean;
  created_at: Date;
};
