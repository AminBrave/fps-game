/**
 * BREACHPOINT: Tactical Micro-Voxel FPS
 * Modern Warfare-inspired movement & HUD with Teardown-style micro-voxel destruction,
 * 3D Pre-Game Staging Armory with Turntable, and Real-World Material Penetration Ballistics.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { VoxelEngine } from './engine/voxelEngine';
import { physicsEngine } from './engine/physics';
import { soundEngine } from './engine/audio';
import { WEAPON_REGISTRY, createWeaponMesh, getWeaponMuzzleOffset, getWeaponEjectionOffset } from './engine/weapons';
import { AirdropManager } from './engine/airdrop';
import { BotManager, BotInstance } from './engine/botAI';
import { netcodeManager } from './engine/netcode';
import { BallisticsEngine } from './engine/ballistics';
import { WeaponFXManager } from './engine/weaponFX';
import { createViewmodelRig, attachViewmodel, syncViewmodelCamera, findMuzzleSocket, getSocketWorldPosition, ViewmodelRig } from './engine/viewmodel';
import { WeatherSystem, WeatherPresetId } from './engine/weather';
import {
  PlayerInput,
  PlayerState,
  WeaponConfig,
  HitmarkerEvent,
  KillfeedEntry,
  GunshotRadarPing,
  LeaderboardRecord,
  STATE_FLAGS,
} from './engine/types';

// UI Components
import { Lobby, MatchSettings, CamoType } from './ui/Lobby';
import { Compass } from './ui/Compass';
import { Minimap } from './ui/Minimap';
import { Hitmarker } from './ui/Hitmarker';
import { Crosshair } from './ui/Crosshair';
import { WeaponHUD } from './ui/WeaponHUD';
import { Killfeed } from './ui/Killfeed';
import { Scoreboard } from './ui/Scoreboard';
import { LoadoutPicker } from './ui/LoadoutPicker';
import { LeaderboardModal } from './ui/LeaderboardModal';
import { SettingsModal, GameSettings } from './ui/SettingsModal';
import { MatchControls } from './ui/MatchControls';
import { Play, RotateCcw, Home, LogOut } from 'lucide-react';

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Game Engine Lifecycle State: 'lobby' (staging armory) | 'playing' (active combat)
  const [gameMode, setGameMode] = useState<'lobby' | 'playing'>('lobby');

  // Staging Lobby Configurations
  const [camo, setCamo] = useState<CamoType>('factory');
  const [matchSettings, setMatchSettings] = useState<MatchSettings>({
    enableBots: true,
    botCount: 4, // Dynamic Tactical default
    aiDifficulty: 'regular',
    friendlyFire: false,
    enableHitmarkers: true,
    enableMinimap: true,
    enableAirdrops: true,
    highPrecisionBallistics: true,
    shadowQuality: 'high',
    particleDensity: 'high',
    volumetricFog: true,
    soundVolume: 0.85,
  });

  // UI Modal Overlays
  const [isLocked, setIsLocked] = useState(false);
  const [isScoreboardOpen, setIsScoreboardOpen] = useState(false);
  const [isLoadoutOpen, setIsLoadoutOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Player Telemetry & Combat Stats
  const [health, setHealth] = useState(100);
  const [armor, setArmor] = useState(150); // 3 plates x 50
  const [score, setScore] = useState(0);
  const [currentWeapon, setCurrentWeapon] = useState<WeaponConfig>(WEAPON_REGISTRY.m4a1);
  const [ammoInClip, setAmmoInClip] = useState(30);
  const [reserveAmmo, setReserveAmmo] = useState(180);
  const [isReloading, setIsReloading] = useState(false);
  const [reloadProgress, setReloadProgress] = useState(0);

  // Movement & Camera State
  const [playerYaw, setPlayerYaw] = useState(0);
  const [playerPos, setPlayerPos] = useState<[number, number, number]>([0, 1.7, 12]);
  const [tacSprintStamina, setTacSprintStamina] = useState(1.0);
  const [isSliding, setIsSliding] = useState(false);
  const [isTacSprinting, setIsTacSprinting] = useState(false);
  const [isADS, setIsADS] = useState(false);
  const [crosshairSpread, setCrosshairSpread] = useState(14);
  const [isFiringState, setIsFiringState] = useState(false);

  // Feeds & Lists
  const [hitmarkers, setHitmarkers] = useState<HitmarkerEvent[]>([]);
  const [killfeed, setKillfeed] = useState<KillfeedEntry[]>([]);
  const [gunshotPings, setGunshotPings] = useState<GunshotRadarPing[]>([]);
  const [playersList, setPlayersList] = useState<PlayerState[]>([]);
  const [matchScore, setMatchScore] = useState({ specOps: 0, shadowCompany: 0 });
  const [leaderboardRecords, setLeaderboardRecords] = useState<LeaderboardRecord[]>([]);
  const [roomSummaries, setRoomSummaries] = useState<Array<{id:string; map:string; weather:string; botCount:number; maxPlayers:number; playerCount:number}>>([]);

  // User Settings
  const [settings, setSettings] = useState<GameSettings>({
    mouseSensitivity: 1.8,
    adsSensitivityMultiplier: 0.75,
    fov: 82,
    volume: 0.85,
    invertY: false,
    shadows: true,
  });

  // Engine Subsystem References
  const settingsRef = useRef(settings);
  const matchSettingsRef = useRef(matchSettings);
  const currentWeaponRef = useRef(currentWeapon);
  const camoRef = useRef(camo);
  const lastNetworkSendRef = useRef(0);
  settingsRef.current = settings;
  matchSettingsRef.current = matchSettings;
  currentWeaponRef.current = currentWeapon;
  camoRef.current = camo;

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const voxelEngineRef = useRef<VoxelEngine | null>(null);
  const airdropManagerRef = useRef<AirdropManager | null>(null);
  const botManagerRef = useRef<BotManager | null>(null);
  const weaponMeshRef = useRef<THREE.Group | null>(null);
  const turntableWeaponRef = useRef<THREE.Group | null>(null);
  const ballisticsEngineRef = useRef<BallisticsEngine | null>(null);
  const weaponFXRef = useRef<WeaponFXManager | null>(null);
  const viewmodelRigRef = useRef<ViewmodelRig | null>(null);
  const weatherRef = useRef<WeatherSystem | null>(null);

  // Fast Mutable Loop State
  const gameStateRef = useRef({
    gameMode: 'lobby' as 'lobby' | 'playing',
    pos: new THREE.Vector3(0, 1.7, 12),
    vel: new THREE.Vector3(0, 0, 0),
    yaw: 0,
    pitch: 0,
    turntableYaw: 0,
    turntablePitch: 0.1,
    isDraggingTurntable: false,
    keys: {
      KeyW: false,
      KeyS: false,
      KeyA: false,
      KeyD: false,
      Space: false,
      ShiftLeft: false,
      KeyC: false,
      KeyQ: false,
      KeyE: false,
      KeyR: false,
      Tab: false,
    },
    mouseButtons: { left: false, right: false },
    isGrounded: true,
    isADS: false,
    adsAlpha: 0,
    isSliding: false,
    slideTimer: 0,
    slideDir: new THREE.Vector3(),
    stamina: 1.0,
    leanAngle: 0,
    targetLeanAngle: 0,
    recoilPitch: 0,
    recoilYaw: 0,
    fireTimer: 0,
    reloadTimer: 0,
    isReloading: false,
    ammoInClip: 30,
    reserveAmmo: 180,
    health: 100,
    armor: 150,
    score: 0,
    kills: 0,
    deaths: 0,
    footstepTimer: 0,
  });

  // Authoritative network reconciliation. Rendering remains client-side, but
  // the server owns the canonical player position and acknowledges input sequence.
  useEffect(() => {
    netcodeManager.connect();
    netcodeManager.onServerSnapshot = (_players, _tick, local) => {
      if (!local) return;
      const g = gameStateRef.current;
      const corrected = netcodeManager.reconcile(
        local.ackSeq ?? 0,
        local.position,
        [g.pos.x, g.pos.y, g.pos.z],
        local.velocity,
        true,
      );
      g.pos.set(corrected[0], corrected[1], corrected[2]);
      g.vel.set(local.velocity[0], local.velocity[1], local.velocity[2]);
    };
    return () => { netcodeManager.onServerSnapshot = undefined; };
  }, []);

  // Fetch initial leaderboard records
  useEffect(() => {
    fetch('/api/leaderboard')
      .then(res => res.json())
      .then(data => setLeaderboardRecords(data))
      .catch(() => {
        setLeaderboardRecords([
          { id: '1', name: 'Ghost_MW2', elo: 2420, kills: 1420, deaths: 420, kdRatio: 3.38, matchesPlayed: 85, wins: 72, lastActive: 'Just now' },
          { id: '2', name: 'Soap_MacTavish', elo: 2280, kills: 1190, deaths: 480, kdRatio: 2.47, matchesPlayed: 74, wins: 58, lastActive: '5m ago' },
          { id: '3', name: 'CaptainPrice', elo: 2150, kills: 980, deaths: 410, kdRatio: 2.39, matchesPlayed: 62, wins: 49, lastActive: '12m ago' },
        ]);
      });
  }, []);

  // Update volume whenever settings or matchSettings mutate
  useEffect(() => {
    soundEngine.setVolume(matchSettings.soundVolume);
  }, [matchSettings.soundVolume]);

  // Pointer Lock API handlers
  const requestPointerLock = useCallback(() => {
    soundEngine.init();
    soundEngine.resume();
    if (mountRef.current) {
      mountRef.current.requestPointerLock();
    }
  }, []);

  useEffect(() => {
    const handleLockChange = () => {
      const locked = document.pointerLockElement === mountRef.current;
      setIsLocked(locked);
    };
    document.addEventListener('pointerlockchange', handleLockChange);
    return () => document.removeEventListener('pointerlockchange', handleLockChange);
  }, []);

  // Deploy to match trigger from Staging Lobby
  const handleDeployMatch = useCallback(() => {
    soundEngine.playDeployHorn();

    // Transition state
    setGameMode('playing');
    gameStateRef.current.gameMode = 'playing';

    // Position player in the staging corridor of the killhouse
    gameStateRef.current.pos.set(0, 1.7, 14);
    gameStateRef.current.yaw = Math.PI; // Face north toward warehouse
    gameStateRef.current.pitch = 0;

    // Remove Turntable weapon mesh
    if (turntableWeaponRef.current && sceneRef.current) {
      sceneRef.current.remove(turntableWeaponRef.current);
      turntableWeaponRef.current = null;
    }

    // Attach First-Person Viewmodel weapon to Camera
    if (cameraRef.current) {
      if (weaponMeshRef.current) {
        cameraRef.current.remove(weaponMeshRef.current);
      }
      const fpMesh = createWeaponMesh(currentWeapon, camo, false);
      weaponMeshRef.current = fpMesh;
      if (viewmodelRigRef.current) attachViewmodel(viewmodelRigRef.current, fpMesh);
    }

    // Spawn bot roster
    if (botManagerRef.current) {
      if (matchSettings.enableBots) {
        botManagerRef.current.syncRoster(matchSettings.botCount, matchSettings.aiDifficulty);
      } else {
        botManagerRef.current.clearBots();
      }
    }

    // Request pointer lock for first-person combat
    setTimeout(() => {
      requestPointerLock();
    }, 100);
  }, [currentWeapon, camo, matchSettings, requestPointerLock]);

  // Return to armory lobby
  const handleReturnToLobby = useCallback(() => {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    setGameMode('lobby');
    gameStateRef.current.gameMode = 'lobby';

    // Remove First-Person Viewmodel weapon
    if (weaponMeshRef.current && cameraRef.current) {
      if (viewmodelRigRef.current?.weaponRoot === weaponMeshRef.current) {
        viewmodelRigRef.current.scene.remove(weaponMeshRef.current);
        viewmodelRigRef.current.weaponRoot = null;
      }
      weaponMeshRef.current = null;
    }

    // Spawn 3D Turntable weapon in staging dock
    if (sceneRef.current) {
      if (turntableWeaponRef.current) {
        sceneRef.current.remove(turntableWeaponRef.current);
      }
      const tableMesh = createWeaponMesh(currentWeapon, camo, true);
      turntableWeaponRef.current = tableMesh;
      sceneRef.current.add(tableMesh);
    }
  }, [currentWeapon, camo]);

  // Update Turntable weapon mesh whenever weapon, camo, or attachments change in Lobby
  useEffect(() => {
    if (gameMode !== 'lobby' || !sceneRef.current) return;

    if (turntableWeaponRef.current) {
      sceneRef.current.remove(turntableWeaponRef.current);
    }
    const tableMesh = createWeaponMesh(currentWeapon, camo, true);
    turntableWeaponRef.current = tableMesh;
    sceneRef.current.add(tableMesh);
  }, [currentWeapon, camo, gameMode]);

  // Mouse Controller: Look (Playing) vs Orbit Turntable (Lobby)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const g = gameStateRef.current;

      if (g.gameMode === 'playing' && isLocked) {
        // High-precision FPS mouse look
        const sens = (settings.mouseSensitivity * 0.0018) * (g.isADS ? settings.adsSensitivityMultiplier : 1.0);
        const invert = settings.invertY ? -1 : 1;

        g.yaw -= e.movementX * sens;
        g.pitch -= e.movementY * sens * invert;
        g.pitch = Math.max(-Math.PI * 0.48, Math.min(Math.PI * 0.48, g.pitch));
      } else if (g.gameMode === 'lobby' && g.isDraggingTurntable) {
        // Rotate weapon on turntable
        g.turntableYaw += e.movementX * 0.01;
        g.turntablePitch = Math.max(-0.4, Math.min(0.5, g.turntablePitch + e.movementY * 0.008));
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const g = gameStateRef.current;
      if (g.gameMode === 'playing') {
        if (!isLocked) return;
        if (e.button === 0) g.mouseButtons.left = true;
        if (e.button === 2) g.mouseButtons.right = true;
      } else if (g.gameMode === 'lobby') {
        if (e.button === 0) g.isDraggingTurntable = true;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const g = gameStateRef.current;
      if (g.gameMode === 'playing') {
        if (e.button === 0) g.mouseButtons.left = false;
        if (e.button === 2) g.mouseButtons.right = false;
      } else if (g.gameMode === 'lobby') {
        g.isDraggingTurntable = false;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isLocked, settings]);

  // Keyboard Movement & Action Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const g = gameStateRef.current;

      if (e.code === 'Space' && g.gameMode === 'lobby') {
        e.preventDefault();
        handleDeployMatch();
        return;
      }

      if (e.code in g.keys) {
        (g.keys as any)[e.code] = true;
      }

      if (e.code === 'Tab') {
        e.preventDefault();
        setIsScoreboardOpen(true);
      } else if (e.code === 'KeyM') {
        setIsLoadoutOpen(prev => !prev);
      } else if (e.code === 'KeyL') {
        setIsLeaderboardOpen(prev => !prev);
      } else if (e.code === 'KeyO') {
        setIsSettingsOpen(prev => !prev);
      } else if (e.code === 'Digit4' && matchSettings.enableAirdrops) {
        triggerAirdrop();
      } else if (e.code === 'Digit1') {
        switchWeapon(WEAPON_REGISTRY.m4a1);
      } else if (e.code === 'Digit2') {
        switchWeapon(WEAPON_REGISTRY.mp5);
      } else if (e.code === 'Digit3') {
        switchWeapon(WEAPON_REGISTRY.kar98k);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const g = gameStateRef.current;
      if (e.code in g.keys) {
        (g.keys as any)[e.code] = false;
      }
      if (e.code === 'Tab') {
        setIsScoreboardOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleDeployMatch, matchSettings.enableAirdrops]);

  // Reload Action
  const triggerReload = useCallback(() => {
    const g = gameStateRef.current;
    if (g.isReloading || g.ammoInClip >= currentWeapon.magSize || g.reserveAmmo <= 0) return;

    g.isReloading = true;
    g.reloadTimer = currentWeapon.reloadTime;
    setIsReloading(true);
    soundEngine.playReloadSound();
  }, [currentWeapon]);

  // Weapon Switcher
  const switchWeapon = useCallback((weapon: WeaponConfig) => {
    setCurrentWeapon(weapon);
    const g = gameStateRef.current;
    g.ammoInClip = weapon.magSize;
    g.reserveAmmo = weapon.maxReserveAmmo;
    g.isReloading = false;
    setAmmoInClip(weapon.magSize);
    setReserveAmmo(weapon.maxReserveAmmo);
    setIsReloading(false);

    if (g.gameMode === 'playing' && cameraRef.current && weaponMeshRef.current) {
      if (viewmodelRigRef.current?.weaponRoot === weaponMeshRef.current) viewmodelRigRef.current.scene.remove(weaponMeshRef.current);
      const newMesh = createWeaponMesh(weapon, camo, false);
      weaponMeshRef.current = newMesh;
      if (viewmodelRigRef.current) attachViewmodel(viewmodelRigRef.current, newMesh);
    }
  }, [camo]);

  // Airdrop Crate Spawn
  const triggerAirdrop = useCallback(() => {
    if (!airdropManagerRef.current) return;
    const g = gameStateRef.current;
    const dropX = g.pos.x + (Math.random() - 0.5) * 8;
    const dropZ = g.pos.z + (Math.random() - 0.5) * 8;
    airdropManagerRef.current.spawnAirdrop(dropX, dropZ, 26);
  }, []);

  // Bot Spawner
  const spawnNewBot = useCallback(() => {
    if (!botManagerRef.current) return;
    const botCount = botManagerRef.current.bots.length;
    const names = ['Ghost-4', 'Roach', 'Viper', 'Krueger', 'Makarov', 'Grinch', 'Bale', 'Rodion'];
    const botName = names[botCount % names.length] + `_${Math.floor(Math.random() * 90 + 10)}`;

    const spawnPos = new THREE.Vector3(
      (Math.random() - 0.5) * 36,
      0,
      (Math.random() - 0.5) * 36
    );

    const bot = botManagerRef.current.spawnBot(botName, 'shadow_company', spawnPos);
    bot.difficulty = matchSettings.aiDifficulty;
  }, [matchSettings.aiDifficulty]);

  // Reset Destructible Compound
  const resetCompound = useCallback(() => {
    if (voxelEngineRef.current) {
      voxelEngineRef.current.resetCompound();
    }
  }, []);

  // Main Three.js Engine Lifecycle
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0e12);
    if (matchSettingsRef.current.volumetricFog) {
      scene.fog = new THREE.FogExp2(0x0c0e12, 0.016);
    }
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(settingsRef.current.fov, window.innerWidth / window.innerHeight, 0.05, 500);
    camera.rotation.order = 'YXZ';
    cameraRef.current = camera;
    scene.add(camera);

    // 2. WebGL PBR Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = matchSettingsRef.current.shadowQuality !== 'low';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const viewmodelRig = createViewmodelRig(window.innerWidth, window.innerHeight);
    viewmodelRigRef.current = viewmodelRig;

    // 3. Tactical Military PBR Lighting
    const ambientLight = new THREE.AmbientLight(0xd4e2ed, 0.45);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff5e0, 1.35);
    dirLight.position.set(20, 45, 25);
    dirLight.castShadow = matchSettingsRef.current.shadowQuality !== 'low';
    const shadowRes = matchSettingsRef.current.shadowQuality === 'high' ? 2048 : 1024;
    dirLight.shadow.mapSize.width = shadowRes;
    dirLight.shadow.mapSize.height = shadowRes;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 120;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    dirLight.shadow.bias = -0.0004;
    scene.add(dirLight);

    // Armory Staging Workbench Spotlight
    const stagingSpot = new THREE.SpotLight(0xffecd1, 2.5, 12, Math.PI / 4, 0.3);
    stagingSpot.position.set(0, 3.5, 1.0);
    stagingSpot.target.position.set(0, 0, 0);
    scene.add(stagingSpot);
    scene.add(stagingSpot.target);

    // 4. Instantiate Micro-Voxel World & Subsystems
    const voxelEngine = new VoxelEngine(scene);
    voxelEngine.generateKillhouseCompound();
    voxelEngineRef.current = voxelEngine;

    // Initial Physics Setup
    physicsEngine.init();

    // Weapon FX Engine & Particle Pools
    const weaponFX = new WeaponFXManager(scene, camera);
    weaponFXRef.current = weaponFX;
    const weather = new WeatherSystem(scene);
    weatherRef.current = weather;
    weather.setPreset('urban_clear');

    // Material-Based Ballistic Ray-Marcher
    const ballisticsEngine = new BallisticsEngine(voxelEngine, weaponFX);
    ballisticsEngineRef.current = ballisticsEngine;

    // Airdrop Manager
    const airdropManager = new AirdropManager(scene);
    airdropManagerRef.current = airdropManager;

    // Tactical Bot AI Manager
    const botManager = new BotManager(scene);
    botManagerRef.current = botManager;

    // Networking
    netcodeManager.connect();
    netcodeManager.onVoxelDestruction = delta => {
      voxelEngine.carveSphere(delta.x, delta.y, delta.z, delta.radius);
    };

    // Pre-warm materials & shaders to prevent frame drop
    renderer.compile(scene, camera);

    // Spawn initial turntable weapon in staging lobby
    const initialTableMesh = createWeaponMesh(currentWeaponRef.current, camoRef.current, true);
    turntableWeaponRef.current = initialTableMesh;
    scene.add(initialTableMesh);

    // Camera initial position in Staging Lobby
    camera.position.set(0, 0.35, 1.45);
    camera.lookAt(0, 0, 0);

    // Resize Handler
    const handleResize = () => {
      if (!renderer || !camera) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // 5. Main Tick Loop
    let lastTime = performance.now();
    let animationFrameId: number;

    const tick = () => {
      animationFrameId = requestAnimationFrame(tick);

      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.08); // Clamp max dt
      lastTime = now;

      const g = gameStateRef.current;

      // Update Weapon FX, Particles, Shell casings
      weaponFX.update(dt);
      voxelEngine.updateDebris(dt);

      if (g.gameMode === 'lobby') {
        // --- 3D Staging Lobby Turntable Logic ---
        if (!g.isDraggingTurntable) {
          g.turntableYaw += dt * 0.4; // Gentle auto-rotation
        }

        if (turntableWeaponRef.current) {
          turntableWeaponRef.current.rotation.y = g.turntableYaw;
          turntableWeaponRef.current.rotation.x = g.turntablePitch;
        }

        // Camera smoothly frames the weapon workbench
        camera.position.set(
          Math.sin(g.turntableYaw * 0.15) * 0.3,
          0.35 + Math.sin(now * 0.001) * 0.02,
          1.45
        );
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
        return;
      }

      // --- Playing / Active Combat Loop ---

      // 1. Tac-Sprint Stamina Logic
      const wantsSprint = g.keys.ShiftLeft && g.keys.KeyW && !g.isADS && g.stamina > 0.1;
      if (wantsSprint) {
        g.stamina = Math.max(0, g.stamina - dt * 0.28);
      } else {
        g.stamina = Math.min(1.0, g.stamina + dt * 0.38);
      }
      setTacSprintStamina(g.stamina);
      setIsTacSprinting(wantsSprint);

      // 2. Sliding Mechanic
      if (g.keys.KeyC && wantsSprint && !g.isSliding && g.isGrounded) {
        g.isSliding = true;
        g.slideTimer = 0.85;
        g.slideDir.set(Math.sin(g.yaw), 0, Math.cos(g.yaw)).normalize();
        setIsSliding(true);
        soundEngine.playSlideSound();
      }

      if (g.isSliding) {
        g.slideTimer -= dt;
        if (g.slideTimer <= 0) {
          g.isSliding = false;
          setIsSliding(false);
        }
      }

      // 3. Aim-Down-Sights (ADS) Smoothing
      g.isADS = g.mouseButtons.right && !g.isSliding && !wantsSprint;
      setIsADS(g.isADS);
      const adsTarget = g.isADS ? 1.0 : 0.0;
      g.adsAlpha = THREE.MathUtils.lerp(g.adsAlpha, adsTarget, dt * 14.0);

      // Smooth ADS FOV zoom
      const targetFov = THREE.MathUtils.lerp(settingsRef.current.fov, currentWeaponRef.current.adsFov, g.adsAlpha);
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov = targetFov;
        camera.updateProjectionMatrix();
      }

      // Crosshair Dynamic Spread
      const targetSpread = g.isADS
        ? 0
        : wantsSprint
        ? 34
        : g.isSliding
        ? 28
        : Math.hypot(g.vel.x, g.vel.z) > 1.0
        ? 20
        : 12;
      setCrosshairSpread(prev => THREE.MathUtils.lerp(prev, targetSpread, dt * 12.0));

      // 4. Peak-Leaning (Q / E)
      if (g.keys.KeyQ && !g.keys.KeyE) {
        g.targetLeanAngle = -0.24;
      } else if (g.keys.KeyE && !g.keys.KeyQ) {
        g.targetLeanAngle = 0.24;
      } else {
        g.targetLeanAngle = 0;
      }
      g.leanAngle = THREE.MathUtils.lerp(g.leanAngle, g.targetLeanAngle, dt * 10.0);

      // 5. FPS Movement Vector
      const moveVec = new THREE.Vector3();
      if (g.keys.KeyW) moveVec.z += 1;
      if (g.keys.KeyS) moveVec.z -= 1;
      if (g.keys.KeyA) moveVec.x += 1;
      if (g.keys.KeyD) moveVec.x -= 1;
      moveVec.normalize();

      // Transform by Player Yaw
      moveVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), g.yaw);

      // Send compact input samples at 20Hz. The server ignores the pose fields
      // and advances its own simulation from these inputs.
      const networkNow = performance.now();
      if (networkNow - lastNetworkSendRef.current >= 50) {
        const input: PlayerInput = {
          seq: netcodeManager.getSequence(),
          dt,
          forward: g.keys.KeyW,
          backward: g.keys.KeyS,
          left: g.keys.KeyA,
          right: g.keys.KeyD,
          jump: g.keys.Space,
          crouch: g.keys.KeyC,
          slide: g.isSliding,
          tacSprint: wantsSprint,
          ads: g.isADS,
          fire: g.mouseButtons.left,
          reload: g.isReloading,
          leanLeft: g.keys.KeyQ,
          leanRight: g.keys.KeyE,
          yaw: g.yaw,
          pitch: g.pitch,
          weaponIndex: 0,
        };
        netcodeManager.sendInput(input, g.pos.x, g.pos.y, g.pos.z);
        lastNetworkSendRef.current = networkNow;
      }

      // Movement Speeds
      let speed = 4.8;
      if (wantsSprint) speed = 8.5; // Tactical double-time sprint
      if (g.isADS) speed = 2.4;
      if (g.keys.KeyC && !g.isSliding) speed = 2.2; // Crouch walk

      // Height
      const targetCameraHeight = g.isSliding ? 0.95 : g.keys.KeyC ? 1.15 : 1.7;

      // Jump
      if (g.keys.Space && g.isGrounded && !g.isSliding) {
        g.vel.y = 5.6;
        g.isGrounded = false;
      }

      // Gravity
      if (!g.isGrounded) {
        g.vel.y -= 18.0 * dt;
      }

      if (g.isSliding) {
        const slideSpeed = 8.8 * (g.slideTimer / 0.85);
        g.vel.x = g.slideDir.x * slideSpeed;
        g.vel.z = g.slideDir.z * slideSpeed;
      } else {
        g.vel.x = THREE.MathUtils.lerp(g.vel.x, moveVec.x * speed, dt * 12.0);
        g.vel.z = THREE.MathUtils.lerp(g.vel.z, moveVec.z * speed, dt * 12.0);
      }

      // Position update & perimeter collision
      g.pos.x += g.vel.x * dt;
      g.pos.y += g.vel.y * dt;
      g.pos.z += g.vel.z * dt;

      g.pos.x = Math.max(-23.0, Math.min(23.0, g.pos.x));
      g.pos.z = Math.max(-23.0, Math.min(23.0, g.pos.z));

      if (g.pos.y <= targetCameraHeight) {
        g.pos.y = targetCameraHeight;
        g.vel.y = 0;
        g.isGrounded = true;
      }

      // Footstep Sound Trigger
      const horizSpeed = Math.hypot(g.vel.x, g.vel.z);
      if (g.isGrounded && horizSpeed > 1.2 && !g.isSliding) {
        g.footstepTimer += dt * horizSpeed;
        if (g.footstepTimer >= 2.8) {
          g.footstepTimer = 0;
          soundEngine.playFootstep(wantsSprint);
        }
      }

      // Update Camera Position & Rotation
      camera.position.set(
        g.pos.x + Math.sin(g.yaw + Math.PI / 2) * (g.leanAngle * 1.2),
        g.pos.y,
        g.pos.z + Math.cos(g.yaw + Math.PI / 2) * (g.leanAngle * 1.2)
      );
      camera.rotation.y = g.yaw + g.recoilYaw;
      camera.rotation.x = g.pitch + g.recoilPitch;
      camera.rotation.z = -g.leanAngle;

      // 6. Recoil Spring Recovery
      g.recoilPitch = THREE.MathUtils.lerp(g.recoilPitch, 0, dt * currentWeaponRef.current.recoilRecoveryRate);
      g.recoilYaw = THREE.MathUtils.lerp(g.recoilYaw, 0, dt * currentWeaponRef.current.recoilRecoveryRate);

      // Reload timer
      if (g.isReloading) {
        g.reloadTimer -= dt;
        const progress = 1 - Math.max(0, g.reloadTimer) / currentWeaponRef.current.reloadTime;
        setReloadProgress(progress);

        if (g.reloadTimer <= 0) {
          g.isReloading = false;
          setIsReloading(false);
          const needed = currentWeaponRef.current.magSize - g.ammoInClip;
          const toAdd = Math.min(needed, g.reserveAmmo);
          g.ammoInClip += toAdd;
          g.reserveAmmo -= toAdd;
          setAmmoInClip(g.ammoInClip);
          setReserveAmmo(g.reserveAmmo);
        }
      }

      // 7. Weapon Firing & Material Ballistics
      g.fireTimer -= dt;
      const canFire =
        g.fireTimer <= 0 &&
        !g.isReloading &&
        g.ammoInClip > 0 &&
        (currentWeaponRef.current.automatic ? g.mouseButtons.left : g.mouseButtons.left && !isFiringState);

      if (canFire) {
        g.ammoInClip--;
        setAmmoInClip(g.ammoInClip);
        g.fireTimer = 60 / currentWeaponRef.current.fireRateRPM;
        setIsFiringState(true);

        const isSuppressed = currentWeaponRef.current.attachments.barrel === 'tactical_suppressor';

        // Play authentic weapon firing sound
        soundEngine.playGunshot(currentWeaponRef.current.category, isSuppressed);

        // Apply camera recoil
        g.recoilPitch += currentWeaponRef.current.recoilPitch;
        g.recoilYaw += (Math.random() - 0.5) * currentWeaponRef.current.recoilYawSpread;

        // Compute Muzzle & Shell Ejection World Positions
        const aimDir = new THREE.Vector3();
        camera.getWorldDirection(aimDir);

        const muzzleSocket = weaponMeshRef.current ? findMuzzleSocket(weaponMeshRef.current) : null;
        const muzzleWorld = muzzleSocket
          ? getSocketWorldPosition(muzzleSocket, camera)
          : camera.position.clone().addScaledVector(aimDir, 0.45);

        const ejectionOffset = getWeaponEjectionOffset(currentWeaponRef.current);
        const ejectionWorld = camera.position.clone().add(new THREE.Vector3(0.12, -0.08, 0)).addScaledVector(aimDir, 0.25);

        // Trigger Weapon FX: Point-Light Muzzle Flash, Brass Shell Ejection, Sparks & Viewmodel Recoil
        weaponFX.triggerMuzzleFX(muzzleWorld, ejectionWorld, aimDir, isSuppressed, 1.0);

        // Unsuppressed Gunshot Radar Ping for Compass & Minimap
        if (!isSuppressed) {
          const pingId = `ping_${Date.now()}`;
          setGunshotPings(prev => [
            ...prev.slice(-10),
            {
              id: pingId,
              x: g.pos.x,
              z: g.pos.z,
              timestamp: Date.now(),
              isHostile: false,
            },
          ]);
        }

        // Material-Based Micro-Step Ballistic Ray-March
        const hitResult = ballisticsEngine.fireBullet(
          camera.position,
          aimDir,
          currentWeaponRef.current,
          matchSettingsRef.current.enableBots ? botManager : null
        );

        // Handle Bot Damage Feedback & Hitmarkers
        if (hitResult.botHit) {
          const isKill = hitResult.botHit.isDead;
          const armorBreak = hitResult.botHit.state.armor <= 0 && hitResult.damageDealt > 0;

          let markerType: 'body' | 'headshot' | 'kill' | 'armor_break' = 'body';
          if (isKill) markerType = 'kill';
          else if (armorBreak) markerType = 'armor_break';
          else if (hitResult.isHeadshot) markerType = 'headshot';

          soundEngine.playHitmarker(markerType);

          if (matchSettingsRef.current.enableHitmarkers) {
            setHitmarkers(prev => [
              ...prev.slice(-4),
              {
                id: `hit_${Date.now()}_${Math.random()}`,
                type: markerType,
                timestamp: Date.now(),
                damage: hitResult.damageDealt,
              },
            ]);
          }

          if (isKill) {
            g.kills++;
            g.score += 100;
            setScore(g.score);
            setMatchScore(prev => ({ ...prev, specOps: prev.specOps + 1 }));

            setKillfeed(prev => [
              ...prev.slice(-4),
              {
                id: `kill_${Date.now()}`,
                killer: 'Operator (You)',
                victim: hitResult.botHit!.state.name,
                weapon: currentWeaponRef.current.name.split(' ')[0],
                headshot: hitResult.isHeadshot,
                wallbang: hitResult.wallbang,
                timestamp: Date.now(),
              },
            ]);
          }
        }
      }

      if (!g.mouseButtons.left) {
        setIsFiringState(false);
      }

      // 8. Viewmodel ADS & Recoil Interpolation
      if (weaponMeshRef.current) {
        const hipPos = new THREE.Vector3(0.24, -0.22, -0.42);
        const adsPos = new THREE.Vector3(0.0, -0.155, -0.32);
        const basePos = hipPos.lerp(adsPos, g.adsAlpha);

        // Weapon breathing bobbing while walking
        const bobX = Math.sin(now * 0.007) * (wantsSprint ? 0.025 : 0.008) * (1 - g.adsAlpha);
        const bobY = Math.abs(Math.sin(now * 0.012)) * (wantsSprint ? 0.03 : 0.01) * (1 - g.adsAlpha);

        weaponMeshRef.current.position.set(
          basePos.x + bobX + weaponFX.recoilOffset.x,
          basePos.y + bobY + weaponFX.recoilOffset.y,
          basePos.z + weaponFX.recoilOffset.z
        );

        weaponMeshRef.current.rotation.x = weaponFX.recoilRotation.x;
        weaponMeshRef.current.rotation.y = weaponFX.recoilRotation.y;
        weaponMeshRef.current.rotation.z = weaponFX.recoilRotation.z;
      }

      // 9. Update Subsystems
      weatherRef.current?.update(dt, g.pos);
      if (matchSettingsRef.current.enableAirdrops) {
        airdropManager.update(dt);
        const openedDrop = airdropManager.checkInteraction(g.pos);
        if (openedDrop) {
          g.armor = Math.min(150, g.armor + 100);
          g.reserveAmmo += 90;
          setArmor(g.armor);
          setReserveAmmo(g.reserveAmmo);
        }
      }

      if (matchSettingsRef.current.enableBots) {
        botManager.update(dt, g.pos, (bot, targetPoint) => {
          // Bot firing at player
          const toPlayer = g.pos.clone().sub(bot.meshGroup.position);
          if (toPlayer.length() < 28) {
            const botDamage = Math.floor(14 + Math.random() * 12);
            if (g.armor > 0) {
              g.armor = Math.max(0, g.armor - botDamage * 0.7);
              g.health = Math.max(1, g.health - botDamage * 0.3);
            } else {
              g.health = Math.max(0, g.health - botDamage);
            }

            setHealth(g.health);
            setArmor(g.armor);

            // Red damage flash & hitmarker
            if (g.health <= 0) {
              // Player eliminated -> Respawn in safe corner
              g.deaths++;
              g.health = 100;
              g.armor = 100;
              setHealth(100);
              setArmor(100);
              g.pos.set((Math.random() - 0.5) * 30, 1.7, (Math.random() - 0.5) * 30);
              setMatchScore(prev => ({ ...prev, shadowCompany: prev.shadowCompany + 1 }));

              setKillfeed(prev => [
                ...prev.slice(-4),
                {
                  id: `kill_${Date.now()}`,
                  killer: bot.state.name,
                  victim: 'Operator (You)',
                  weapon: 'M4A1',
                  headshot: false,
                  wallbang: false,
                  timestamp: Date.now(),
                },
              ]);
            }
          }
        });
      }

      // Sync state to React for HUD
      setPlayerYaw(g.yaw);
      setPlayerPos([g.pos.x, g.pos.y, g.pos.z]);

      // Render world first, then the isolated viewmodel depth pass.
      syncViewmodelCamera(viewmodelRig, camera);
      renderer.render(scene, camera);
      renderer.clearDepth();
      renderer.render(viewmodelRig.scene, viewmodelRig.camera);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      viewmodelRig.scene.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); if (Array.isArray(o.material)) o.material.forEach(m=>m.dispose()); else o.material.dispose(); } });
      viewmodelRigRef.current = null;
      weatherRef.current = null;
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white select-none">
      {/* 3D WebGL Canvas Mount */}
      <div ref={mountRef} className="absolute inset-0 z-0 cursor-crosshair" onClick={() => {
        if (gameMode === 'playing' && !isLocked) requestPointerLock();
      }} />

      {/* --- PRE-GAME STAGING LOBBY OVERLAY --- */}
      {gameMode === 'lobby' && (
        <Lobby
          currentWeapon={currentWeapon}
          onSelectWeapon={w => setCurrentWeapon(w)}
          onUpdateAttachments={atts => setCurrentWeapon(prev => ({ ...prev, attachments: atts }))}
          camo={camo}
          onSelectCamo={c => setCamo(c)}
          matchSettings={matchSettings}
          onUpdateMatchSettings={s => setMatchSettings(s)}
          onDeployMatch={handleDeployMatch}
        />
      )}

      {/* --- IN-MATCH CALL OF DUTY HUD LAYER --- */}
      {gameMode === 'playing' && (
        <>
          {/* Top Compass Heading Ribbon */}
          <Compass yaw={playerYaw} gunshotPings={gunshotPings} playerPos={playerPos} />

          {/* Minimap Radar */}
          {matchSettings.enableMinimap && (
            <Minimap
              playerPos={playerPos}
              playerYaw={playerYaw}
              players={botManagerRef.current?.bots.map(b => b.state) || []}
              gunshotPings={gunshotPings}
              airdrops={airdropManagerRef.current?.airdrops.map(a => ({
                id: a.id,
                position: [a.position.x, a.position.y, a.position.z] as [number, number, number],
                velocity: [a.velocity.x, a.velocity.y, a.velocity.z] as [number, number, number],
                landed: a.landed,
                opened: a.opened,
                smokeColor: '#22ee77',
                flareIntensity: 1.0,
              })) || []}
            />
          )}

          {/* Center Dynamic Crosshair */}
          <Crosshair isADS={isADS} spread={crosshairSpread} isFiring={isFiringState} />

          {/* Dynamic Hitmarkers */}
          <Hitmarker events={hitmarkers} />

          {/* Bottom-Right Weapon HUD & Ammo Readout */}
          <WeaponHUD
            weapon={currentWeapon}
            ammoInClip={ammoInClip}
            reserveAmmo={reserveAmmo}
            isReloading={isReloading}
            reloadProgress={reloadProgress}
            tacSprintStamina={tacSprintStamina}
            isTacSprinting={isTacSprinting}
            isSliding={isSliding}
            health={health}
            maxHealth={100}
            armor={armor}
            score={score}
          />

          {/* Top-Right Combat Killfeed */}
          <Killfeed entries={killfeed} localPlayerName="Operator (You)" />

          {/* In-Match Tactical Controls & Keybind Quickbar */}
          <MatchControls
            isLocked={isLocked}
            onLockPointer={requestPointerLock}
            onOpenLoadout={() => setIsLoadoutOpen(true)}
            onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onSpawnBot={spawnNewBot}
            onTriggerAirdrop={triggerAirdrop}
            onResetCompound={resetCompound}
            botCount={botManagerRef.current?.bots.length || 0}
          />

          {/* Match Scoreboard Overlay (Tab) */}
          <Scoreboard
            isOpen={isScoreboardOpen}
            players={[
              {
                id: 'local_player',
                name: 'Operator (You)',
                isLocal: true,
                position: playerPos,
                velocity: [0, 0, 0],
                yaw: playerYaw,
                pitch: 0,
                health,
                maxHealth: 100,
                armor,
                maxArmor: 150,
                stateFlags: 0,
                currentWeaponId: currentWeapon.id,
                ammoInClip,
                reserveAmmo,
                kills: gameStateRef.current.kills,
                deaths: gameStateRef.current.deaths,
                score,
                ping: 15,
                team: 'spec_ops',
              },
              ...(botManagerRef.current?.bots.map(b => b.state) || []),
            ]}
            matchScore={matchScore}
          />

          {/* In-Match Pause & Return to Staging Overlay */}
          {!isLocked && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md">
              <div className="flex flex-col items-center max-w-sm w-full p-6 bg-zinc-900/90 border border-zinc-700/80 rounded-2xl shadow-2xl text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
                  <Play className="w-6 h-6 fill-current" />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-wider text-zinc-100">MATCH PAUSED</h3>
                  <p className="text-xs text-zinc-400 mt-1">Pointer lock released. Click below to re-enter combat or modify loadout in the staging armory.</p>
                </div>
                <div className="flex flex-col w-full gap-2.5 pt-2">
                  <button
                    onClick={requestPointerLock}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-widest rounded-lg transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                  >
                    RESUME COMBAT
                  </button>
                  <button
                    onClick={handleReturnToLobby}
                    className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Home className="w-4 h-4" />
                    RETURN TO ARMORY LOBBY
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Global Modals */}
      <LoadoutPicker
        isOpen={isLoadoutOpen}
        onClose={() => setIsLoadoutOpen(false)}
        currentWeaponId={currentWeapon.id}
        onSelectWeapon={switchWeapon}
      />

      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        records={leaderboardRecords}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
      />
    </div>
  );
}