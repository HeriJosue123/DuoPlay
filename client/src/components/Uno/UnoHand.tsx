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

  // The overlap calculation adapts based on number of cards
  const overlapSpacing = cards.length > 15 ? -40 : cards.length > 8 ? -30 : -20;
  
  return (
    <div className="relative w-full flex justify-center items-end px-4 h-48 sm:h-64">
      {/* Scrollable container for many cards */}
      <div 
        ref={scrollRef}
        className="flex flex-nowrap items-end pb-8 pt-16 overflow-x-auto overflow-y-hidden hide-scrollbar max-w-full px-8"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="flex justify-center" style={{ minWidth: 'min-content' }}>
          {cards.map((card, index) => {
            const isPlayable = checkPlayable(card);
            const isSelected = selectedCardId === card.id;
            
            // Generate a subtle fan effect
            const mid = cards.length / 2;
            const distance = index - mid + 0.5;
            const rotation = cards.length > 5 ? distance * 2 : distance * 4;
            const translateY = Math.abs(distance) * (cards.length > 15 ? 1 : 2);
            
            return (
              <div 
                key={card.id}
                className="transition-transform duration-300 ease-out origin-bottom hover:z-50"
                style={{ 
                  marginLeft: index === 0 ? 0 : `${overlapSpacing}px`,
                  transform: `rotate(${rotation}deg) translateY(${translateY}px)`,
                  zIndex: isSelected ? 50 : index
                }}
              >
                <UnoCard 
                  card={card}
                  isPlayable={isPlayable}
                  isSelected={isSelected}
                  onClick={() => isPlayable && onSelectCard(card.id)}
                  size="lg"
                  className={isSelected ? '!scale-110' : ''}
                />
              </div>
            );
          })}
        </div>
      </div>
      
      {/* CSS to hide scrollbar but keep functionality */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};
