import React, { useState, useEffect, useRef, useCallback } from 'react';

const TRACKS = [
  {
    id: 1,
    title: "DATA_STREAM_01.WAV",
    artist: "UNKNOWN_ENTITY",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    cover: "https://picsum.photos/seed/glitch1/200/200?grayscale&blur=1"
  },
  {
    id: 2,
    title: "MEMORY_LEAK_02.WAV",
    artist: "SECTOR_7G",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    cover: "https://picsum.photos/seed/glitch2/200/200?grayscale&blur=1"
  },
  {
    id: 3,
    title: "CORRUPT_SECTOR_03.WAV",
    artist: "SYS_ADMIN",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    cover: "https://picsum.photos/seed/glitch3/200/200?grayscale&blur=1"
  }
];

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION = { x: 0, y: -1 };

export default function App() {
  // --- Music Player State ---
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentTrack = TRACKS[currentTrackIndex];

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.play().catch(e => console.error("ERR_AUDIO_PLAY:", e));
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrackIndex]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  
  const nextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
    setIsPlaying(true);
  };
  
  const prevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };

  // --- Snake Game State ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  
  const snakeRef = useRef(INITIAL_SNAKE);
  const directionRef = useRef(INITIAL_DIRECTION);
  const nextDirectionRef = useRef(INITIAL_DIRECTION);
  const foodRef = useRef({ x: 5, y: 5 });
  const gameLoopRef = useRef<number | null>(null);

  const generateFood = useCallback(() => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      // eslint-disable-next-line no-loop-func
      const isOnSnake = snakeRef.current.some(segment => segment.x === newFood.x && segment.y === newFood.y);
      if (!isOnSnake) break;
    }
    foodRef.current = newFood;
  }, []);

  const resetGame = useCallback(() => {
    snakeRef.current = INITIAL_SNAKE;
    directionRef.current = INITIAL_DIRECTION;
    nextDirectionRef.current = INITIAL_DIRECTION;
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    generateFood();
  }, [generateFood]);

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw Grid
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1;
    for (let i = 0; i <= CANVAS_SIZE; i += CELL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(CANVAS_SIZE, i);
      ctx.stroke();
    }

    // Draw Food
    ctx.fillStyle = '#FF00FF'; // Magenta
    ctx.fillRect(
      foodRef.current.x * CELL_SIZE,
      foodRef.current.y * CELL_SIZE,
      CELL_SIZE,
      CELL_SIZE
    );

    // Draw Snake
    snakeRef.current.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? '#FFFFFF' : '#00FFFF'; // Head white, body cyan
      ctx.fillRect(
        segment.x * CELL_SIZE,
        segment.y * CELL_SIZE,
        CELL_SIZE,
        CELL_SIZE
      );
      // Inner detail for raw pixel look
      ctx.fillStyle = '#000000';
      ctx.fillRect(
        segment.x * CELL_SIZE + 4,
        segment.y * CELL_SIZE + 4,
        CELL_SIZE - 8,
        CELL_SIZE - 8
      );
    });
  }, []);

  const updateGame = useCallback(() => {
    if (gameOver || !gameStarted) return;

    directionRef.current = nextDirectionRef.current;
    const head = snakeRef.current[0];
    const newHead = {
      x: head.x + directionRef.current.x,
      y: head.y + directionRef.current.y
    };

    // Check wall collision
    if (
      newHead.x < 0 ||
      newHead.x >= GRID_SIZE ||
      newHead.y < 0 ||
      newHead.y >= GRID_SIZE
    ) {
      setGameOver(true);
      return;
    }

    // Check self collision
    if (snakeRef.current.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
      setGameOver(true);
      return;
    }

    const newSnake = [newHead, ...snakeRef.current];

    // Check food collision
    if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
      setScore(s => {
        const newScore = s + 10;
        setHighScore(h => Math.max(h, newScore));
        return newScore;
      });
      generateFood();
    } else {
      newSnake.pop();
    }

    snakeRef.current = newSnake;
    drawGame();
  }, [gameOver, gameStarted, generateFood, drawGame]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === ' ' && (gameOver || !gameStarted)) {
        resetGame();
        return;
      }

      const dir = directionRef.current;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (dir.y !== 1) nextDirectionRef.current = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (dir.y !== -1) nextDirectionRef.current = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (dir.x !== 1) nextDirectionRef.current = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (dir.x !== -1) nextDirectionRef.current = { x: 1, y: 0 };
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver, gameStarted, resetGame]);

  useEffect(() => {
    if (gameStarted && !gameOver) {
      gameLoopRef.current = window.setInterval(updateGame, 100); // Faster, more brutal
    } else if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameStarted, gameOver, updateGame]);

  useEffect(() => {
    drawGame();
  }, [drawGame]);

  return (
    <div className="min-h-screen bg-black text-[#00FFFF] font-digital uppercase overflow-hidden relative flex flex-col items-center justify-center p-4 selection:bg-[#FF00FF] selection:text-black">
      
      {/* Overlays */}
      <div className="scanlines pointer-events-none fixed inset-0 z-50"></div>
      <div className="static-noise pointer-events-none fixed inset-0 z-40 opacity-30"></div>

      <div className="z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start screen-tear">
        
        {/* Left Column: Music Player */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-black border-4 border-[#FF00FF] p-6 relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#00FFFF] animate-pulse" />
            
            <h2 
              className="text-2xl font-retro text-[#00FFFF] mb-6 glitch-text" 
              data-text="AUDIO_SUBSYSTEM"
            >
              AUDIO_SUBSYSTEM
            </h2>

            <div className="relative aspect-square w-full max-w-[240px] mx-auto mb-6 border-4 border-[#00FFFF] overflow-hidden">
              <img 
                src={currentTrack.cover} 
                alt="Cover" 
                className="w-full h-full object-cover grayscale contrast-200 mix-blend-screen"
                referrerPolicy="no-referrer"
                style={{ imageRendering: 'pixelated' }}
              />
              <div className="absolute inset-0 bg-[#FF00FF]/20 mix-blend-overlay" />
            </div>

            <div className="text-left mb-8 border-l-4 border-[#FF00FF] pl-4">
              <h3 className="text-xl font-bold text-[#FFFFFF] truncate">{currentTrack.title}</h3>
              <p className="text-lg text-[#00FFFF] truncate">SRC: {currentTrack.artist}</p>
            </div>

            <div className="flex items-center justify-between mb-6 font-retro text-sm">
              <button 
                onClick={prevTrack}
                className="px-2 py-2 border-2 border-[#00FFFF] hover:bg-[#00FFFF] hover:text-black transition-none"
              >
                [ &lt;&lt; ]
              </button>
              
              <button 
                onClick={togglePlay}
                className="px-4 py-2 border-2 border-[#FF00FF] text-[#FF00FF] hover:bg-[#FF00FF] hover:text-black transition-none"
              >
                {isPlaying ? '[ PAUSE ]' : '[ PLAY ]'}
              </button>
              
              <button 
                onClick={nextTrack}
                className="px-2 py-2 border-2 border-[#00FFFF] hover:bg-[#00FFFF] hover:text-black transition-none"
              >
                [ &gt;&gt; ]
              </button>
            </div>

            <div className="flex items-center gap-3 font-retro text-xs">
              <span className="text-[#FF00FF]">VOL:</span>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full h-2 bg-black border-2 border-[#00FFFF] appearance-none cursor-pointer"
                style={{ accentColor: '#FF00FF' }}
              />
            </div>

            <audio 
              ref={audioRef} 
              src={currentTrack.url} 
              onEnded={nextTrack}
              className="hidden"
            />
          </div>
        </div>

        {/* Right Column: Snake Game */}
        <div className="lg:col-span-8 flex flex-col items-center">
          
          <div className="w-full flex justify-between items-end mb-4 px-2 border-b-4 border-[#FF00FF] pb-2">
            <div>
              <h1 
                className="text-2xl md:text-3xl font-retro text-[#00FFFF] glitch-text"
                data-text="EXECUTE: SNAKE.EXE"
              >
                EXECUTE: SNAKE.EXE
              </h1>
              <p className="text-lg text-[#FF00FF] mt-2">INPUT: [W,A,S,D] OR [ARROWS]</p>
            </div>
            <div className="text-right">
              <div className="text-xl text-[#FF00FF]">MAX_MEM: {highScore}</div>
              <div 
                className="text-4xl font-retro text-[#00FFFF] glitch-text mt-2"
                data-text={`ALLOC: ${score}`}
              >
                ALLOC: {score}
              </div>
            </div>
          </div>

          <div className="relative bg-black p-2 border-4 border-[#00FFFF]">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="bg-black"
              style={{ 
                width: '100%', 
                maxWidth: `${CANVAS_SIZE}px`, 
                aspectRatio: '1/1',
                imageRendering: 'pixelated'
              }}
            />

            {/* Overlays */}
            {!gameStarted && !gameOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <button 
                  onClick={resetGame}
                  className="px-6 py-4 bg-black border-4 border-[#00FFFF] text-[#00FFFF] font-retro text-xl hover:bg-[#00FFFF] hover:text-black transition-none animate-pulse"
                >
                  INITIALIZE_SEQUENCE
                </button>
              </div>
            )}

            {gameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 border-4 border-[#FF00FF]">
                <h2 
                  className="text-3xl md:text-4xl font-retro text-[#FF00FF] mb-4 glitch-text text-center"
                  data-text="FATAL_ERROR"
                >
                  FATAL_ERROR
                </h2>
                <p className="text-2xl text-[#00FFFF] mb-8">COLLISION_DETECTED</p>
                <button 
                  onClick={resetGame}
                  className="px-6 py-4 bg-black border-4 border-[#FF00FF] text-[#FF00FF] font-retro text-xl hover:bg-[#FF00FF] hover:text-black transition-none"
                >
                  REBOOT_SYSTEM
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
