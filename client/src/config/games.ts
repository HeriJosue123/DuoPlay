export interface GameConfig {
  id: string;
  name: string;
  description: string;
  image: string;
  players: number;
  available: boolean;
}

export const gamesCatalog: GameConfig[] = [
  {
    id: "tic-tac-toe",
    name: "TRES EN RAYA",
    description: "El clásico juego de estrategia de X y O.",
    image: "/games/tic-tac-toe.webp",
    players: 2,
    available: true
  },
  {
    id: "coming-soon",
    name: "PRÓXIMAMENTE",
    description: "Nuevos juegos están por llegar.",
    image: "/games/coming-soon.webp",
    players: 2,
    available: false
  }
];
