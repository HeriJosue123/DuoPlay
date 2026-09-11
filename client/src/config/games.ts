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
    id: "memory-match",
    name: "MEMORY MATCH",
    description: "Encuentra las parejas antes que tu rival.",
    image: "/games/coming-soon.webp", // For now use coming-soon or we can use another fallback
    players: 2,
    available: true
  }
];
