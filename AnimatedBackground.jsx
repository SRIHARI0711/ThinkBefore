// AnimatedBackground.jsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function AnimatedBackground() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Generate random particles that float around
  // 
  const particles = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 2,
    delay: Math.random() * 5,
    duration: Math.random() * 20 + 20,
    x: Math.random() * dimensions.width,
    y: Math.random() * dimensions.height,
  }));

  // Floating orbs with different colors
  const orbs = [
    {
      id: 'orb-1',
      size: 280,
      color: '#3b82f6',
      delay: 0,
      x: '10%',
      y: '15%',
    },
    {
      id: 'orb-2',
      size: 320,
      color: '#8b5cf6',
      delay: 2,
      x: '80%',
      y: '70%',
    },
    {
      id: 'orb-3',
      size: 240,
      color: '#ec4899',
      delay: 4,
      x: '60%',
      y: '20%',
    },
    {
      id: 'orb-4',
      size: 200,
      color: '#06b6d4',
      delay: 1,
      x: '15%',
      y: '80%',
    },
  ];

  // Floating shapes for visual interest
  const shapes = [
    {
      id: 'shape-1',
      type: 'circle',
      size: 100,
      delay: 0,
      x: '25%',
      y: '30%',
    },
    {
      id: 'shape-2',
      type: 'square',
      size: 80,
      delay: 1.5,
      x: '75%',
      y: '50%',
    },
    {
      id: 'shape-3',
      type: 'circle',
      size: 60,
      delay: 3,
      x: '50%',
      y: '70%',
    },
    {
      id: 'shape-4',
      type: 'square',
      size: 70,
      delay: 2.5,
      x: '20%',
      y: '60%',
    },
  ];

  const orbVariants = {
    animate: (custom) => ({
      y: [0, 50, -50, 0],
      x: [0, 40, -40, 0],
      transition: {
        duration: 20 + custom * 2,
        repeat: Infinity,
        repeatType: 'reverse',
        ease: 'easeInOut',
      },
    }),
  };

  const particleVariants = {
    animate: (custom) => ({
      y: [-20, -window.innerHeight],
      opacity: [0, 0.6, 0],
      transition: {
        duration: 15 + custom.duration,
        repeat: Infinity,
        delay: custom.delay,
        ease: 'linear',
      },
    }),
  };

  const shapeVariants = {
    animate: (custom) => ({
      y: [0, 40, -40, 0],
      rotate: [0, 180, 360],
      opacity: [0.3, 0.6, 0.3],
      transition: {
        duration: 15 + custom * 3,
        repeat: Infinity,
        delay: custom,
        ease: 'easeInOut',
      },
    }),
  };

  const pulseVariants = {
    animate: {
      scale: [1, 1.1, 1],
      opacity: [0.5, 0.8, 0.5],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 0,
      pointerEvents: 'none',
      overflow: 'hidden',
      background: 'transparent',
    }}>
      {/* Animated Orbs */}
      {orbs.map((orb) => (
        <motion.div
          key={orb.id}
          custom={orb.delay}
          animate="animate"
          variants={orbVariants}
          style={{
            position: 'absolute',
            width: orb.size,
            height: orb.size,
            borderRadius: '50%',
            left: orb.x,
            top: orb.y,
            background: `radial-gradient(circle, ${orb.color}, transparent 70%)`,
            filter: 'blur(60px)',
            opacity: 0.15,
          }}
        />
      ))}

      {/* Floating Shapes */}
      {shapes.map((shape) => (
        <motion.div
          key={shape.id}
          custom={shape.delay}
          animate="animate"
          variants={shapeVariants}
          style={{
            position: 'absolute',
            width: shape.size,
            height: shape.size,
            left: shape.x,
            top: shape.y,
            borderRadius: shape.type === 'circle' ? '50%' : '0',
            border: '2px solid rgba(59, 130, 246, 0.2)',
            opacity: 0.3,
          }}
        />
      ))}

      {/* Floating Particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          custom={particle}
          animate="animate"
          variants={particleVariants}
          style={{
            position: 'absolute',
            width: particle.size,
            height: particle.size,
            borderRadius: '50%',
            left: `${Math.random() * 100}%`,
            top: '-10px',
            background: `radial-gradient(circle, rgba(59, 130, 246, 0.8), transparent)`,
            filter: 'blur(2px)',
          }}
        />
      ))}

      {/* Central Pulsing Element */}
      <motion.div
        animate="animate"
        variants={pulseVariants}
        style={{
          position: 'absolute',
          width: 150,
          height: 150,
          borderRadius: '50%',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          border: '2px solid rgba(139, 92, 246, 0.3)',
          opacity: 0.5,
        }}
      />

      {/* Decorative Grid Lines */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0.05,
        }}
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Animated Gradient Background */}
      <motion.div
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%'],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          repeatType: 'reverse',
          ease: 'linear',
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(139, 92, 246, 0.02) 50%, rgba(236, 72, 153, 0.03) 100%)',
          backgroundSize: '200% 200%',
          pointerEvents: 'none',
        }}
      />

      {/* Floating Data Streams */}
      {[0, 1, 2].map((index) => (
        <motion.div
          key={`stream-${index}`}
          animate={{
            y: [0, -1000],
            opacity: [0, 0.4, 0],
          }}
          transition={{
            duration: 10 + index * 2,
            repeat: Infinity,
            delay: index * 3,
            ease: 'linear',
          }}
          style={{
            position: 'absolute',
            left: `${20 + index * 30}%`,
            top: 0,
            width: '2px',
            height: '100px',
            background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.6), transparent)',
            filter: 'blur(1px)',
          }}
        />
      ))}
    </div>
  );
}
