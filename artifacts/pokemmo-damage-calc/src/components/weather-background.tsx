import React from 'react';

type Weather = 'none' | 'sun' | 'rain' | 'sand' | 'hail';

interface WeatherBackgroundProps {
  weather: Weather;
  defaultImage: string;
}

export const WeatherBackground: React.FC<WeatherBackgroundProps> = ({ weather, defaultImage }) => {
  if (weather === 'none') {
    return (
      <div
        className="weather-backdrop-container default-bg"
        style={{ backgroundImage: defaultImage }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className={`weather-backdrop-container weather-${weather}`} aria-hidden="true">
      {/* 🌧️ RAIN WEATHER: Animated storm clouds, falling rain streaks, ground mist & lightning flash */}
      {weather === 'rain' && (
        <div className="weather-effect-layer rain-layer">
          <div className="rain-sky-overlay" />
          <div className="rain-lightning-flash" />
          <div className="rain-storm-clouds-back" />
          <div className="rain-storm-clouds-front" />
          
          <div className="rain-drops-container">
            {Array.from({ length: 44 }).map((_, i) => (
              <span
                key={i}
                className="rain-drop"
                style={{
                  left: `${(i * 2.3 + (i % 3) * 0.7) % 100}%`,
                  animationDelay: `${(i * 0.07) % 1.4}s`,
                  animationDuration: `${0.45 + ((i % 6) * 0.08)}s`,
                  opacity: 0.35 + ((i % 5) * 0.15),
                  height: `${28 + ((i % 4) * 8)}px`,
                }}
              />
            ))}
          </div>

          <div className="rain-ground-mist" />
          <div className="rain-puddle-ripples">
            <span className="ripple r1" />
            <span className="ripple r2" />
            <span className="ripple r3" />
          </div>
        </div>
      )}

      {/* ☀️ SUN / DESERT SUN WEATHER: Blazing sun, rotating rays, heatwave shimmer, rising heat motes & rolling desert dunes */}
      {weather === 'sun' && (
        <div className="weather-effect-layer sun-layer">
          <div className="sun-sky-gradient" />
          <div className="sun-heatwave-shimmer" />

          {/* Radiant Sun with Coronal Flare */}
          <div className="sun-orb-anchor">
            <div className="sun-core" />
            <div className="sun-radiance-glow" />
            <div className="sun-corona-outer" />
            <div className="sun-rays">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="sun-ray"
                  style={{
                    transform: `rotate(${i * 30}deg)`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Rolling Desert Dunes at the horizon */}
          <div className="desert-dunes-back" />
          <div className="desert-dunes-mid" />
          <div className="desert-dunes-front" />

          {/* Floating Rising Sun Sparks / Golden Desert Dust Motes */}
          <div className="sun-sparks-container">
            {Array.from({ length: 24 }).map((_, i) => (
              <span
                key={i}
                className="sun-spark"
                style={{
                  left: `${(i * 4.3) % 100}%`,
                  animationDelay: `${(i * 0.22) % 3.6}s`,
                  animationDuration: `${2.8 + ((i % 5) * 0.6)}s`,
                  width: `${2 + (i % 3)}px`,
                  height: `${2 + (i % 3)}px`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 🏜️ SANDSTORM WEATHER: Howling sand clouds, speeding sand streaks, dusty wind haze */}
      {weather === 'sand' && (
        <div className="weather-effect-layer sand-layer">
          <div className="sand-dunes-bg" />
          <div className="sand-wind-haze" />
          <div className="sand-particles-container">
            {Array.from({ length: 36 }).map((_, i) => (
              <span
                key={i}
                className="sand-particle"
                style={{
                  top: `${(i * 2.8) % 100}%`,
                  animationDelay: `${(i * 0.08) % 1.6}s`,
                  animationDuration: `${0.65 + ((i % 5) * 0.18)}s`,
                  height: `${2 + (i % 3)}px`,
                  width: `${14 + ((i % 6) * 10)}px`,
                }}
              />
            ))}
          </div>
          <div className="sand-whirlwind" />
        </div>
      )}

      {/* 🌨️ HAIL / BLIZZARD WEATHER: Tumbling hail chunks, frosty vignette, blizzard haze */}
      {weather === 'hail' && (
        <div className="weather-effect-layer hail-layer">
          <div className="hail-frost-vignette" />
          <div className="hail-blizzard-haze" />
          <div className="hail-particles-container">
            {Array.from({ length: 34 }).map((_, i) => (
              <span
                key={i}
                className="hail-chunk"
                style={{
                  left: `${(i * 3.1) % 100}%`,
                  animationDelay: `${(i * 0.09) % 1.5}s`,
                  animationDuration: `${0.65 + ((i % 5) * 0.16)}s`,
                  width: `${4 + (i % 4)}px`,
                  height: `${4 + (i % 4)}px`,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
