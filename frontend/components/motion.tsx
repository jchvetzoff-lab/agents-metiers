"use client";

import { useEffect, useState, ReactNode, useRef } from "react";

interface FadeInViewProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  direction?: string;
}

export function FadeInView({ children, delay = 0, className = "", direction = "up" }: FadeInViewProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay * 1000);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  const getTransformClasses = () => {
    const baseClasses = "transition-all duration-700";
    
    if (isVisible) {
      return `${baseClasses} opacity-100 translate-x-0 translate-y-0`;
    }
    
    switch (direction) {
      case "up":
        return `${baseClasses} opacity-0 translate-y-4`;
      case "down":
        return `${baseClasses} opacity-0 -translate-y-4`;
      case "left":
        return `${baseClasses} opacity-0 translate-x-4`;
      case "right":
        return `${baseClasses} opacity-0 -translate-x-4`;
      default:
        return `${baseClasses} opacity-0 translate-y-4`;
    }
  };

  return (
    <div
      ref={ref}
      className={`${getTransformClasses()} ${className}`}
    >
      {children}
    </div>
  );
}

interface StaggerContainerProps {
  children: ReactNode;
  stagger?: number;
  className?: string;
}

export function StaggerContainer({ children, stagger = 0.1, className = "" }: StaggerContainerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {Array.isArray(children)
        ? children.map((child, index) => (
            <StaggerItem key={index} delay={isVisible ? index * stagger : 0}>
              {child}
            </StaggerItem>
          ))
        : children}
    </div>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  delay?: number;
}

export function StaggerItem({ children, delay = 0 }: StaggerItemProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setIsVisible(true), delay * 1000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(true);
    }
  }, [delay]);

  return (
    <div
      className={`transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      {children}
    </div>
  );
}

interface CountUpProps {
  value?: number;
  target?: number;
  duration?: number;
  className?: string;
  suffix?: string;
}

export function CountUp({ value, target, duration = 2, className = "", suffix = "" }: CountUpProps) {
  const targetValue = target ?? value ?? 0;
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const steps = 60;
    const increment = targetValue / steps;
    const stepDuration = (duration * 1000) / steps;

    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= targetValue) {
        setCount(targetValue);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [isVisible, targetValue, duration]);

  return (
    <span ref={ref} className={className}>
      {count.toLocaleString("fr-FR")}{suffix}
    </span>
  );
}

// Alias for CountUp (for backward compatibility)
export const AnimatedCounter = CountUp;

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <div className="animate-in fade-in duration-300">
      {children}
    </div>
  );
}