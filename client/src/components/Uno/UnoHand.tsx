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
    <div className="relative w-full flex justify-center items-end px-2 sm:px-8 h-[120px] sm:h-[180px] mb-2 sm:mb-4 pointer-events-none">
      <div 
        ref={scrollRef}
        className="flex justify-center items-end relative pointer-events-auto h-full w-full max-w-[800px]"
      >
        {cards.map((card, index) => {
          const isPlayable = checkPlayable(card);
          const isSelected = selectedCardId === card.id;
          
          let overlapPercent = 0;
          if (cards.length > 1) {
            if (cards.length <= 7) overlapPercent = (cards.length - 1) * 4; // up to 24%
            else if (cards.length <= 12) overlapPercent = 24 + (cards.length - 7) * 6; // up to 54%
            else overlapPercent = Math.min(82, 54 + (cards.length - 12) * 3.5); // max 82%
          }
          const marginStr = index === 0 ? '0' : `-${overlapPercent}%`;
          
          const mid = (cards.length - 1) / 2;
          const distance = index - mid;
          const rotFactor = cards.length > 12 ? 1.5 : cards.length > 7 ? 2.5 : 4;
          const rotation = distance * rotFactor;
          const translateY = Math.abs(distance) * 2;
          
          return (
            <div 
              key={card.id}
              className="relative transition-all duration-300 ease-out origin-bottom hover:z-[60]"
              style={{ 
                marginLeft: marginStr,
                transform: `rotate(${rotation}deg) translateY(${translateY}px)`,
                zIndex: isSelected ? 50 : index,
              }}
            >
              <div className="w-[56px] h-[84px] sm:w-[96px] sm:h-[144px] md:w-[112px] md:h-[168px]">
                <UnoCard 
                  card={card}
                  isPlayable={isPlayable}
                  isSelected={isSelected}
                  onClick={() => isPlayable && onSelectCard(card.id)}
                  className={`!w-full !h-full transition-transform duration-200 ${isSelected ? '!scale-110 -translate-y-4 sm:-translate-y-8' : 'hover:-translate-y-4 sm:hover:-translate-y-8'}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
