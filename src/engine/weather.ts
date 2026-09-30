import * as THREE from 'three';

export type WeatherPresetId = 'urban_clear' | 'desert_sandstorm' | 'night_rain';

export interface WeatherPreset {
  id: WeatherPresetId; name: string; fogColor: number; fogDensity: number;
  ambientIntensity: number; directionalIntensity: number;
  rain: boolean; dust: boolean; wetness: number; night: boolean;
}

export const WEATHER_PRESETS: Record<WeatherPresetId, WeatherPreset> = {
  urban_clear: { id:'urban_clear', name:'Urban Industrial / Clear', fogColor:0x9aa6b2, fogDensity:0.006, ambientIntensity:0.5, directionalIntensity:1.5, rain:false, dust:false, wetness:0, night:false },
  desert_sandstorm: { id:'desert_sandstorm', name:'Desert Outpost / Sandstorm', fogColor:0xc9a46a, fogDensity:0.024, ambientIntensity:0.38, directionalIntensity:1.15, rain:false, dust:true, wetness:0, night:false },
  night_rain: { id:'night_rain', name:'Night Operations / Rain', fogColor:0x17202d, fogDensity:0.018, ambientIntensity:0.18, directionalIntensity:0.25, rain:true, dust:false, wetness:1, night:true },
};

export class WeatherSystem {
  private readonly rain: THREE.Points;
  private readonly dust: THREE.Points;
  private readonly rainPositions: Float32Array;
  private readonly dustPositions: Float32Array;
  private preset = WEATHER_PRESETS.urban_clear;

  constructor(private readonly scene: THREE.Scene, count = 900) {
    this.rainPositions = new Float32Array(count * 3);
    this.dustPositions = new Float32Array(Math.floor(count * 0.45) * 3);
    for (let i=0;i<this.rainPositions.length;i+=3) {
      this.rainPositions[i]=(Math.random()-0.5)*90; this.rainPositions[i+1]=Math.random()*35; this.rainPositions[i+2]=(Math.random()-0.5)*90;
    }
    for (let i=0;i<this.dustPositions.length;i+=3) {
      this.dustPositions[i]=(Math.random()-0.5)*100; this.dustPositions[i+1]=Math.random()*25; this.dustPositions[i+2]=(Math.random()-0.5)*100;
    }
    const rg=new THREE.BufferGeometry(); rg.setAttribute('position',new THREE.BufferAttribute(this.rainPositions,3));
    this.rain=new THREE.Points(rg,new THREE.PointsMaterial({color:0x9ab8d4,size:0.045,transparent:true,opacity:0.5}));
    this.rain.visible=false; scene.add(this.rain);
    const dg=new THREE.BufferGeometry(); dg.setAttribute('position',new THREE.BufferAttribute(this.dustPositions,3));
    this.dust=new THREE.Points(dg,new THREE.PointsMaterial({color:0xd5b27c,size:0.12,transparent:true,opacity:0.18}));
    this.dust.visible=false; scene.add(this.dust);
  }

  setPreset(id: WeatherPresetId) {
    this.preset = WEATHER_PRESETS[id];
    this.scene.fog = new THREE.FogExp2(this.preset.fogColor, this.preset.fogDensity);
    this.rain.visible=this.preset.rain; this.dust.visible=this.preset.dust;
    return this.preset;
  }

  update(dt:number, player:THREE.Vector3) {
    const move=(points:THREE.Points, positions:Float32Array, vx:number,vy:number,vz:number,top:number)=>{
      const attr=points.geometry.getAttribute('position') as THREE.BufferAttribute;
      for(let i=0;i<positions.length;i+=3){
        positions[i]+=vx*dt; positions[i+1]+=vy*dt; positions[i+2]+=vz*dt;
        if(positions[i+1]<0){ positions[i]=player.x+(Math.random()-0.5)*90; positions[i+1]=top; positions[i+2]=player.z+(Math.random()-0.5)*90; }
      }
      attr.needsUpdate=true;
    };
    if(this.preset.rain) move(this.rain,this.rainPositions,0,-18,0,35);
    if(this.preset.dust) move(this.dust,this.dustPositions,-1.5,0.4,0.6,25);
  }

  getPreset(){ return this.preset; }
}
