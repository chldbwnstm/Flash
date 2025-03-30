import axios from 'axios';
import {
  Room,
  RoomEvent,
  LocalParticipant,
  RemoteParticipant,
  ConnectionState,
  createLocalTracks,
  LocalTrackPublication
} from 'livekit-client';

// LiveKit 서비스 - 토큰 생성 및 방 연결 관리
export class LiveKitService {
  private room: Room;
  
  constructor() {
    this.room = new Room();
    
    // 기본 이벤트 핸들러 설정
    this.room
      .on(RoomEvent.ParticipantConnected, this.handleParticipantConnected)
      .on(RoomEvent.ParticipantDisconnected, this.handleParticipantDisconnected)
      .on(RoomEvent.Disconnected, this.handleDisconnect)
      .on(RoomEvent.ConnectionStateChanged, this.handleConnectionStateChanged);
  }
  
  // 토큰 생성 요청
  async createToken(identity: string, roomName: string, name?: string): Promise<string> {
    try {
      const response = await axios.post('/api/create-token', {
        identity,
        roomName,
        metadata: { name }
      });
      
      return response.data.token;
    } catch (error) {
      console.error('Failed to create token:', error);
      throw new Error('토큰 생성에 실패했습니다.');
    }
  }
  
  // 방송 시작 (방에 연결)
  async startBroadcast(token: string): Promise<Room> {
    try {
      // LiveKit 서버에 연결
      console.log('연결 시도할 URL:', import.meta.env.VITE_LIVEKIT_URL);
      console.log('토큰 값:', token); // 토큰 값 로그
      
      await this.room.connect(import.meta.env.VITE_LIVEKIT_URL || 'ws://localhost:7880', token);
      console.log('Connected to room:', this.room.name);
      
      // 로컬 트랙 게시 (카메라 및 마이크)
      await this.publishLocalTracks();
      
      return this.room;
    } catch (error) {
      console.error('Failed to connect to room:', error);
      throw new Error('방송 시작에 실패했습니다.');
    }
  }
  
  // 로컬 트랙(비디오, 오디오) 게시
  async publishLocalTracks(): Promise<LocalTrackPublication[]> {
    try {
      // 카메라 및 마이크 트랙 생성
      const tracks = await createLocalTracks({
        audio: true,
        video: true
      });
      
      // 트랙 게시
      const publications: LocalTrackPublication[] = [];
      for (const track of tracks) {
        const publication = await this.room.localParticipant.publishTrack(track);
        publications.push(publication);
      }
      
      console.log('Local tracks published');
      return publications;
    } catch (error) {
      console.error('Failed to publish local tracks:', error);
      throw new Error('카메라 및 마이크 설정에 실패했습니다.');
    }
  }
  
  // 방송 종료 (연결 해제)
  async stopBroadcast(): Promise<void> {
    this.room.disconnect();
    console.log('Disconnected from room');
  }
  
  // 현재 연결된 방 가져오기
  getRoom(): Room {
    return this.room;
  }
  
  // 로컬 참가자 가져오기
  getLocalParticipant(): LocalParticipant | undefined {
    return this.room.localParticipant;
  }
  
  // 원격 참가자들 가져오기
  getRemoteParticipants(): RemoteParticipant[] {
    // remoteParticipants는 Map 객체이므로 배열로 변환
    return Array.from(this.room.remoteParticipants.values());
  }
  
  // 이벤트 핸들러
  private handleParticipantConnected = (participant: RemoteParticipant) => {
    console.log('Participant connected:', participant.identity);
  };
  
  private handleParticipantDisconnected = (participant: RemoteParticipant) => {
    console.log('Participant disconnected:', participant.identity);
  };
  
  private handleDisconnect = () => {
    console.log('Disconnected from room');
  };
  
  private handleConnectionStateChanged = (state: ConnectionState) => {
    console.log('Connection state changed:', state);
  };
}

// 싱글톤 인스턴스 생성
const livekitService = new LiveKitService();
export default livekitService; 