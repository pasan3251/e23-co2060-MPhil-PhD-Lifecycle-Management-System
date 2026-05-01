import React from 'react';
import styles from './rainbow-background.module.css';

const RainbowBackground = () => {
  const purple = 'rgb(232 121 249)';
  const blue = 'rgb(96 165 250)';
  const green = 'rgb(94 234 212)';
  
  const colorsList = [
    [purple, blue, green],
    [purple, green, blue],
    [green, purple, blue],
    [green, blue, purple],
    [blue, green, purple],
    [blue, purple, green],
  ];

  const animationTime = 45;
  const length = 25;

  return (
    <div className={styles.wrapper}>
      {Array.from({ length }).map((_, i) => {
        const index = i + 1;
        const randomColors = colorsList[i % 6]; // Simulating random(6) but deterministic for SSR
        
        const duration = animationTime - (animationTime / length / 2) * index;
        const delay = -(index / length) * animationTime;
        
        const boxShadow = `
          -130px 0 80px 40px white, 
          -50px 0 50px 25px ${randomColors[0]},
          0 0 50px 25px ${randomColors[1]}, 
          50px 0 50px 25px ${randomColors[2]},
          130px 0 80px 40px white
        `;

        return (
          <div
            key={i}
            className={styles.rainbow}
            style={{
              boxShadow,
              animation: `${styles.slide} ${duration}s linear infinite`,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
      {/* Fog/Glow effects */}
      <div className={styles.h} />
      <div className={styles.v} />
    </div>
  );
};

export default RainbowBackground;
