import React, { useRef, useEffect } from 'react';
import { UnoCard } from './UnoCard';
import type { UnoCard as UnoCardType } from '../../types';

interface UnoHandProps {
  cards: UnoCardType[];
  playableCardId?: string | null;
  selectedCardId?: string | null;
  onSelectCard: (cardId: string) => void;
  isMyTurn: boolean;
  currentColor: string;
  topCardValue: string;
  stackValue: number;
}

export const UnoHand: React.FC<UnoHandProps> = ({
  cards,
  playableCardId,
  selectedCardId,
  onSelectCard,
  isMyTurn,
  currentColor,
  topCardValue,
  stackValue
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to right when drawing new cards
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [cards.length]);

  const checkPlayable = (card: UnoCardType): boolean => {
    if (!isMyTurn) return false;
    
    // If the engine forced a drawn playable card, ONLY that card is playable
    if (playableCardId) return card.id === playableCardId;
    
    // Evaluate Stacking
    if (stackValue > 0) {
      const getDrawValue = (val: string) => {
        if (val === 'draw_two') return 2;
        if (val === 'draw_four' || val === 'wild_reverse_draw_four') return 4;
        if (val === 'wild_draw_six') return 6;
        if (val === 'wild_draw_ten') return 10;
        return 0;
      };
      
      const cardVal = getDrawValue(card.value);
      const topVal = getDrawValue(topCardValue);
      return cardVal > 0 && cardVal >= topVal;
    }
    
    // Standard matching
    const isWild = card.color === 'wild' || (card.value as string).includes('wild');
    return isWild || card.color === currentColor || card.value === topCardValue;
  };

  return (
    <div className="w-full flex justify-center items-end px-2 mx-auto h-[120px] sm:h-[180px] max-w-[900px] pointer-events-none pb-4">
      {cards.map((card, idx) => {
        const isPlayable = checkPlayable(card);
        const isSelected = selectedCardId === card.id;
        const isLast = idx === cards.length - 1;
        
        const mid = (cards.length - 1) / 2;
        const distance = idx - mid;
        const rotFactor = cards.length > 12 ? 1.5 : cards.length > 6 ? 2.5 : 4;
        const rotation = distance * rotFactor;
        const transY = Math.abs(distance) * (cards.length > 10 ? 1 : 1.5);
        
        return (
          <div 
            key={card.id}
            className={`relative pointer-events-auto h-full group ${isLast ? 'shrink-0' : 'shrink'} basis-[56px] sm:basis-[96px] transition-all duration-300`}
            style={{ minWidth: '12px' }} // Ensures cards remain selectable even with 20+ cards
          >
            <div 
              className="absolute bottom-0 left-0 w-[56px] h-[84px] sm:w-[96px] sm:h-[144px] origin-bottom transition-transform duration-200"
              style={{
                transform: `rotate(${rotation}deg) translateY(${transY}px)`,
                zIndex: isSelected ? 50 : idx,
              }}
            >
              <UnoCard 
                card={card}
                isPlayable={isPlayable}
                isSelected={isSelected}
                onClick={() => isPlayable && onSelectCard(card.id)}
                className={`!w-full !h-full shadow-[0_5px_15px_rgba(0,0,0,0.5)] transition-all duration-200 ${isSelected ? '!scale-110 -translate-y-6' : 'hover:-translate-y-4 sm:hover:-translate-y-6 hover:scale-105'}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
