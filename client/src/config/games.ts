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
    id: "equiz-cero",
    name: "EQUIZ CERO",
    description: "Conocimiento también se juega en duo. ¡Muy pronto!",
    image: "/games/equiz-cero.jpg",
    players: 2,
    available: false
  }
];
