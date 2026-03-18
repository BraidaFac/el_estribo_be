export const getToday = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(23, 59, 59);
  return yesterday;
};
export type Filters = {
  where?: string;
  order?: string;
};
