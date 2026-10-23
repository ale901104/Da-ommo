import React, { useState } from 'react';
import { getPokemonShowdownSpriteStyle } from './PokemonSearchableSelect';
import { TYPE_COLORS } from '../pokemon-constants';

interface PokemonAnimatedSpriteProps {
  num: number;
  name: string;
  pokemonId?: string;
  type?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const PokemonAnimatedSprite: React.FC<PokemonAnimatedSpriteProps> = ({
  num,
  name,
  pokemonId,
  type = 'normal',
  size = 'lg',
  className = '',
}) => {
  // Step 0: Animated Showdown GIF from PokeAPI
  // Step 1: Animated Gen 5 Black/White GIF from PokeAPI
  // Step 2: Static PNG from PokeAPI
  // Step 3: Offline local Showdown spritesheet fallback
  const [errorStep, setErrorStep] = useState<number>(0);

  const cleanNum = Number(num);
  const isValidNum = !isNaN(cleanNum) && cleanNum > 0 && cleanNum <= 649;

  const typeConfig = TYPE_COLORS[type.toLowerCase()] || {
    bg: '#334155',
    text: '#ffffff',
    border: '#475569',
  };

  // Dimensions based on size prop
  const containerSizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-16 h-16 sm:w-20 sm:h-20',
    xl: 'w-24 h-24 sm:w-28 sm:h-28',
  }[size];

  const imageSizeClasses = {
    sm: 'max-w-[36px] max-h-[36px]',
    md: 'max-w-[48px] max-h-[48px]',
    lg: 'max-w-[62px] max-h-[62px] sm:max-w-[72px] sm:max-h-[72px]',
    xl: 'max-w-[90px] max-h-[90px] sm:max-w-[105px] sm:max-h-[105px]',
  }[size];

  let src = '';
  if (isValidNum) {
    if (errorStep === 0) {
      src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${cleanNum}.gif`;
    } else if (errorStep === 1) {
      src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${cleanNum}.gif`;
    } else if (errorStep === 2) {
      src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${cleanNum}.png`;
    }
  }

  const handleImgError = () => {
    setErrorStep(prev => prev + 1);
  };

  return (
    <div
      className={`relative rounded-2xl flex items-center justify-center p-1.5 transition-transform duration-200 group-hover:scale-105 ${containerSizeClasses} ${className}`}
      style={{
        background: `radial-gradient(circle at center, ${typeConfig.bg}25 0%, rgba(15, 23, 42, 0.75) 75%)`,
        border: `1.5px solid ${typeConfig.bg}45`,
        boxShadow: `0 4px 12px rgba(0, 0, 0, 0.35), inset 0 0 16px ${typeConfig.bg}15`,
      }}
      title={`#${cleanNum} ${name}`}
    >
      {isValidNum && errorStep <= 2 && src ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          decoding="async"
          onError={handleImgError}
          className={`object-contain transition-transform duration-200 select-none ${imageSizeClasses}`}
          style={{
            imageRendering: 'pixelated',
            filter: 'drop-shadow(0 3px 5px rgba(0, 0, 0, 0.55))',
          }}
        />
      ) : (
        /* Fallback: Local offline spritesheet icon */
        <span
          style={getPokemonShowdownSpriteStyle(pokemonId || name || cleanNum)}
          className="image-pixelated inline-block"
          role="img"
          aria-label={name}
        />
      )}
    </div>
  );
};
