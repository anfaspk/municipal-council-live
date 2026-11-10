export const serverOffset = (server: number, sent: number, got: number): number =>
  server + 500 - (sent + got) / 2;
