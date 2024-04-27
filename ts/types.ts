export type Comment = {
  id?: number;
  message: string;
  author: string;
  approved: boolean;
  created_at?: Date;
};
