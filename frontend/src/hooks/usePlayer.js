import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const audioRef = useRef(new Audio());
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off');
  const [shuffle, setShuffle] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    const handleEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else {
        next();
      }
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [repeatMode]);

  useEffect(() => {
    if (currentIndex >= 0 && queue[currentIndex]) {
      const track = queue[currentIndex];
      const audio = audioRef.current;
      audio.src = track.streamUrl;
      audio.play();
    }
  }, [currentIndex, queue]);

  useEffect(() => {
    if (currentIndex === -1) {
      const audio = audioRef.current;
      audio.pause();
      audio.currentTime = 0;
    }
  }, [currentIndex]);

  const playTrack = useCallback((track, options = {}) => {
    setQueue((prev) => {
      const newQueue = options.replace ? [track, ...prev.filter((t) => t.id !== track.id)] : [...prev, track];
      return newQueue;
    });
    setCurrentIndex((prev) => (options.replace ? 0 : prev < 0 ? 0 : prev));
  }, []);

  const setQueueAndPlay = useCallback((tracks, startIndex = 0) => {
    setQueue(tracks);
    setCurrentIndex(startIndex);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }, []);

  const next = useCallback(() => {
    setCurrentIndex((index) => {
      if (!queue.length) return -1;
      if (shuffle) {
        const randomIndex = Math.floor(Math.random() * queue.length);
        return randomIndex;
      }
      const nextIndex = index + 1;
      if (nextIndex >= queue.length) {
        if (repeatMode === 'all') {
          return 0;
        }
        return -1;
      }
      return nextIndex;
    });
  }, [queue, repeatMode, shuffle]);

  const previous = useCallback(() => {
    setCurrentIndex((index) => {
      if (!queue.length) return -1;
      if (shuffle) {
        const randomIndex = Math.floor(Math.random() * queue.length);
        return randomIndex;
      }
      const prevIndex = index - 1;
      if (prevIndex < 0) {
        return repeatMode === 'all' ? queue.length - 1 : 0;
      }
      return prevIndex;
    });
  }, [queue, repeatMode, shuffle]);

  const value = useMemo(
    () => ({
      audioRef,
      queue,
      currentIndex,
      currentTrack: currentIndex >= 0 ? queue[currentIndex] : null,
      isPlaying,
      repeatMode,
      shuffle,
      togglePlay,
      next,
      previous,
      playTrack,
      setQueueAndPlay,
      setRepeatMode,
      setShuffle,
      setVolume: (volume) => {
        audioRef.current.volume = volume;
      }
    }),
    [audioRef, queue, currentIndex, isPlaying, repeatMode, shuffle, togglePlay, next, previous, playTrack, setQueueAndPlay]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
