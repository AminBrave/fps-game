export interface RoomConfig {
  id:string; hostId:string; map:string; weather:string; botCount:number; maxPlayers:number; createdAt:number;
}
export interface RoomSummary extends RoomConfig { playerCount:number; }

export class RoomManager {
  private rooms=new Map<string,RoomConfig>();
  private members=new Map<string,Set<string>>();

  create(hostId:string, config:Omit<RoomConfig,'id'|'hostId'|'createdAt'>):RoomSummary {
    const room:RoomConfig={id:randomRoomId(),hostId,createdAt:Date.now(),...config};
    this.rooms.set(room.id,room); this.members.set(room.id,new Set());
    return this.summary(room.id)!;
  }
  join(roomId:string,playerId:string):RoomSummary|null {
    const room=this.rooms.get(roomId); if(!room)return null;
    const members=this.members.get(roomId)!;
    if(!members.has(playerId)&&members.size>=room.maxPlayers)return null;
    members.add(playerId); return this.summary(roomId);
  }
  leave(roomId:string,playerId:string) {
    const members=this.members.get(roomId); if(!members)return;
    members.delete(playerId);
    if(!members.size){this.members.delete(roomId);this.rooms.delete(roomId);}
  }
  has(roomId:string){return this.rooms.has(roomId);}
  get(roomId:string){return this.rooms.get(roomId)||null;}
  list(){return Array.from(this.rooms.keys()).map(id=>this.summary(id)!).filter(Boolean).sort((a,b)=>a.createdAt-b.createdAt);}
  summary(roomId:string):RoomSummary|null {
    const room=this.rooms.get(roomId), members=this.members.get(roomId);
    return room&&members?{...room,playerCount:members.size}:null;
  }
}
function randomRoomId(){return Math.random().toString(36).slice(2,8).toUpperCase();}
