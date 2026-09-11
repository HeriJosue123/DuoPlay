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
    name: "EQUIZ CERO",
    description: "Conocimiento también se juega en duo.",
    image: "/games/tic-tac-toe.jpg",
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
