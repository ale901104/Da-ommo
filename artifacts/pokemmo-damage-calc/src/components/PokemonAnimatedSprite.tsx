import React, { useEffect, useMemo, useState } from 'react';
import { getPokemonShowdownSpriteStyle, getPokemonIconIndex } from './PokemonSearchableSelect';
import { TYPE_COLORS } from '../pokemon-constants';

interface PokemonAnimatedSpriteProps {
  num: number;
  name: string;
  pokemonId?: string;
  type?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Global in-memory cache to remember loaded and failed local asset URLs.
// This prevents layout thrashing, repeated failed network events, and memory leaks.
const localSpriteCache = new Map<string, boolean>();
const preloadedImages = new Map<string, HTMLImageElement>();
const MAX_PRELOAD_CACHE = 150;

/**
 * Preloads and checks if a local image exists and decodes properly.
 */
function testLocalImage(url: string): Promise<boolean> {
  if (localSpriteCache.has(url)) {
    return Promise.resolve(localSpriteCache.get(url)!);
  }

  return new Promise(resolve => {
    const img = new Image();
    img.src = url;
    img.decoding = 'async';
    img.onload = () => {
      localSpriteCache.set(url, true);
      if (preloadedImages.size < MAX_PRELOAD_CACHE) {
        preloadedImages.set(url, img);
      }
      resolve(true);
    };
    img.onerror = () => {
      localSpriteCache.set(url, false);
      resolve(false);
    };
  });
}

export const PokemonAnimatedSprite: React.FC<PokemonAnimatedSpriteProps> = ({
  num,
  name,
  pokemonId,
  type = 'normal',
  size = 'lg',
  className = '',
}) => {
  const cleanNum = Number(num);
  const isValidNum = !isNaN(cleanNum) && cleanNum > 0 && cleanNum <= 649;
  const cleanId = (pokemonId || name || '').toLowerCase().replace(/^pk-/, '').replace(/[^a-z0-9_-]/g, '');

  // Generate candidate local paths (100% offline, internal app resources)
  const candidateUrls = useMemo(() => {
    const urls: string[] = [];
    if (cleanId) {
      urls.push(`/assets/sprites/${cleanId}.webp`);
      urls.push(`/assets/sprites/${cleanId}.gif`);
    }
    if (isValidNum) {
      urls.push(`/assets/sprites/${cleanNum}.webp`);
      urls.push(`/assets/sprites/${cleanNum}.gif`);
      urls.push(`/assets/sprites/${cleanNum}.png`);
    }
    return urls;
  }, [cleanId, cleanNum, isValidNum]);

  // Active verified local URL
  const [activeSrc, setActiveSrc] = useState<string | null>(() => {
    for (const url of candidateUrls) {
      if (localSpriteCache.get(url) === true) return url;
    }
    return null;
  });

  const [hasTested, setHasTested] = useState<boolean>(() => {
    return candidateUrls.length > 0 && candidateUrls.every(u => localSpriteCache.has(u));
  });

  useEffect(() => {
    let isCancelled = false;

    // Check if one of the candidate URLs is already known to be loaded
    for (const url of candidateUrls) {
      if (localSpriteCache.get(url) === true) {
        setActiveSrc(url);
        setHasTested(true);
        return;
      }
    }

    // Otherwise, asynchronously test local resource files sequentially
    const evaluateLocalSprites = async () => {
      for (const url of candidateUrls) {
        if (localSpriteCache.get(url) === false) continue;
        const exists = await testLocalImage(url);
        if (isCancelled) return;
        if (exists) {
          setActiveSrc(url);
          setHasTested(true);
          return;
        }
      }
      if (!isCancelled) {
        setActiveSrc(null);
        setHasTested(true);
      }
    };

    evaluateLocalSprites();

    return () => {
      isCancelled = true;
    };
  }, [candidateUrls]);

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

  // Has valid local Showdown spritesheet index
  const iconIndex = getPokemonIconIndex(pokemonId || name || cleanNum, cleanNum);
  const hasLocalSheetSprite = iconIndex > 0 && iconIndex <= 1640;

  return (
    <div
      className={`relative rounded-2xl flex items-center justify-center p-1.5 transition-transform duration-200 group-hover:scale-105 ${containerSizeClasses} ${className}`}
      style={{
        background: `radial-gradient(circle at center, ${typeConfig.bg}25 0%, rgba(15, 23, 42, 0.75) 75%)`,
        border: `1.5px solid ${typeConfig.bg}45`,
        boxShadow: `0 4px 12px rgba(0, 0, 0, 0.35), inset 0 0 16px ${typeConfig.bg}15`,
      }}
      title={`#${cleanNum || '---'} ${name}`}
    >
      {activeSrc ? (
        /* Local Animated WebP or GIF from internal assets/sprites/ */
        <img
          src={activeSrc}
          alt={name}
          loading="lazy"
          decoding="async"
          className={`object-contain transition-transform duration-200 select-none ${imageSizeClasses}`}
          style={{
            imageRendering: 'pixelated',
            filter: 'drop-shadow(0 3px 5px rgba(0, 0, 0, 0.55))',
          }}
          onError={() => {
            localSpriteCache.set(activeSrc, false);
            setActiveSrc(null);
          }}
        />
      ) : hasLocalSheetSprite ? (
        /* Fallback 1: Bundled local offline Showdown spritesheet icon */
        <span
          style={getPokemonShowdownSpriteStyle(pokemonId || name || cleanNum, cleanNum)}
          className="image-pixelated inline-block select-none"
          role="img"
          aria-label={name}
        />
      ) : (
        /* Fallback 2: Default offline local silhouette SVG placeholder */
        <img
          src="/assets/sprites/placeholder.svg"
          alt={name}
          className={`object-contain opacity-60 select-none ${imageSizeClasses}`}
        />
      )}
    </div>
  );
};
