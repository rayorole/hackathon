export const deskRoutes = {
  overview: "/overzicht",
  street: "/straatbeeld",
  map: "/kaart",
  review: "/nazicht",
  history: "/historiek",
  sources: "/bronnen",
  states: "/toestanden",
} as const;
export type DeskScreen = keyof typeof deskRoutes;
