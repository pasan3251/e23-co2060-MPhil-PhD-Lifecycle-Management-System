import React from 'react';
import styles from './starfield-background.module.css';

const StarfieldBackground = () => {
  return (
    <div className={styles.wrapper}>
      <div className={styles.stars} />
      <div className={styles.stars2} />
      <div className={styles.stars3} />
    </div>
  );
};

export default StarfieldBackground;
