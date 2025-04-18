import axios from 'axios';
import {
  Room,
  RoomEvent,
  LocalParticipant,
  RemoteParticipant,
  ConnectionState,
  createLocalTracks,
  LocalTrackPublication,
  DisconnectReason
} from 'livekit-client';

// 활성 방 정보 인터페이스 정의
export interface RoomInfo {
  name: string;
  numParticipants: number;
  creationTime: string;
  metadata: {
    hostName?: string;
    category?: string;
    description?: string;
  } | null;
  activeRecording: boolean;
}

// LiveKit 서비스 - 토큰 생성 및 방 연결 관리
export class LiveKitService {
  private room: Room;
  
  constructor() {
    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
      disconnectOnPageLeave: false,
    });
    
    // 기본 이벤트 핸들러 설정
    this.room
      .on(RoomEvent.ParticipantConnected, this.handleParticipantConnected)
      .on(RoomEvent.ParticipantDisconnected, this.handleParticipantDisconnected)
      .on(RoomEvent.Disconnected, this.handleDisconnect)
      .on(RoomEvent.ConnectionStateChanged, this.handleConnectionStateChanged)
      .on(RoomEvent.DataReceived, this.handleDataReceived);
      
    console.log('LiveKitService 생성됨 - Room 객체 초기화');
  }
  
  // 활성 방 목록 가져오기
  async getActiveRooms(): Promise<RoomInfo[]> {
    try {
      const response = await axios.get('/api/rooms');
      return response.data.rooms;
    } catch (error) {
      console.error('Failed to get active rooms:', error);
      throw new Error('방 목록을 가져오는데 실패했습니다.');
    }
  }
  
  // 토큰 생성 요청
  async createToken(identity: string, roomName: string, name?: string, isHost: boolean = false): Promise<string> {
    try {
      const metadata = {
        name: name || identity,
        role: isHost ? 'host' : 'viewer' // 호스트 또는 시청자 역할 지정
      };
      
      const response = await axios.post('/api/create-token', {
        identity,
        roomName,
        metadata
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
      // 항상 직접 LiveKit 서버에 연결
      const livekitUrl = 'wss://livekitserver1.picklive.show';
      console.log(`LiveKit 서버 연결 시도: ${livekitUrl}`);
      console.log(`토큰 일부: ${token.substring(0, 20)}...`);
      
      // 연결 옵션 설정
      const connectOptions = {
        autoSubscribe: true
      };
      
      // 채팅 데이터 수신 테스트
      const onDataTest = (payload: Uint8Array, participant?: RemoteParticipant) => {
        try {
          const decoder = new TextDecoder();
          const dataStr = decoder.decode(payload);
          const data = JSON.parse(dataStr);
          
          console.log('방송자 - 데이터 수신:', {
            sender: participant?.identity || 'unknown',
            type: data.type,
            content: data.type === 'chat' ? data.content : undefined,
            length: dataStr.length
          });
        } catch (e) {
          console.error('데이터 디코딩 오류:', e);
        }
      };
      
      // 연결 상태 변경 감지
      const onConnectionStateChanged = (state: string) => {
        console.log('방송자 연결 상태 변경:', state);
      };
      
      // 이벤트 리스너 등록
      this.room.on('dataReceived', onDataTest);
      this.room.on('connectionStateChanged', onConnectionStateChanged);
      
      console.log('LiveKit 서버 연결 시작...');
      
      // LiveKit 서버에 연결
      await this.room.connect(livekitUrl, token, connectOptions);
      console.log('방에 성공적으로 연결됨:', this.room.name);
      
      // 방송자 권한 정보 로깅
      console.log('방송자 정보:', {
        identity: this.room.localParticipant.identity,
        metadata: this.room.localParticipant.metadata,
        sid: this.room.localParticipant.sid,
        permissions: this.room.localParticipant.permissions,
        connectionQuality: this.room.localParticipant.connectionQuality,
        isSpeaking: this.room.localParticipant.isSpeaking,
      });
      
      // 로컬 트랙 게시 (카메라 및 마이크)
      await this.publishLocalTracks();
      console.log('로컬 미디어 트랙 게시 완료');
      
      // 채팅 데이터 발행 테스트
      setTimeout(async () => {
        try {
          console.log('방송자에서 채팅 데이터 발행 테스트 시작...');
          const testMessage = {
            type: 'chat',
            id: 'broadcast-test-' + Date.now(),
            sender: this.room.localParticipant.identity,
            content: '방송자 채팅 테스트 메시지',
            timestamp: new Date().toISOString()
          };
          
          const encoder = new TextEncoder();
          const data = encoder.encode(JSON.stringify(testMessage));
          
          await this.room.localParticipant.publishData(data, { reliable: true });
          console.log('방송자 채팅 테스트 데이터 전송 성공!');
        } catch (e) {
          console.error('방송자 채팅 테스트 데이터 전송 실패:', e);
        }
      }, 3000); // 3초 후 테스트
      
      return this.room;
    } catch (error) {
      console.error('Failed to connect to room:', error);
      throw new Error('방송 시작에 실패했습니다.');
    }
  }
  
  // 시청자 모드로 방 참여
  async joinAsViewer(token: string): Promise<Room> {
    try {
      // LiveKit 서버에 연결
      const livekitUrl = 'wss://livekitserver1.picklive.show';
      console.log(`시청자 모드로 LiveKit 서버 연결 시도: ${livekitUrl}`);
      console.log(`토큰 일부: ${token.substring(0, 20)}...`);
      
      // 연결 옵션 설정 - 시청자는 마이크와 카메라 없이 참여
      const connectOptions = {
        autoSubscribe: true
      };
      
      // 테스트용 이벤트 리스너 추가
      const onDataTest = (payload: Uint8Array) => {
        console.log('데이터 수신 테스트:', payload.length);
      };
      
      // 연결 상태 변경 감지
      const onConnectionStateChanged = (state: string) => {
        console.log('시청자 연결 상태 변경:', state);
      };
      
      // 테스트용 이벤트 리스너 등록
      this.room.on('dataReceived', onDataTest);
      this.room.on('connectionStateChanged', onConnectionStateChanged);
      
      // LiveKit 서버에 연결
      await this.room.connect(livekitUrl, token, connectOptions);
      console.log('시청자로 방에 성공적으로 연결됨:', this.room.name);
      
      // 참가자 권한 정보 로깅
      console.log('시청자 정보:', {
        identity: this.room.localParticipant.identity,
        metadata: this.room.localParticipant.metadata,
        sid: this.room.localParticipant.sid,
        permissions: this.room.localParticipant.permissions,
        connectionQuality: this.room.localParticipant.connectionQuality,
        isSpeaking: this.room.localParticipant.isSpeaking,
      });
      
      // 채팅 데이터 발행 테스트
      setTimeout(async () => {
        try {
          console.log('시청자에서 채팅 데이터 발행 테스트 시작...');
          const testMessage = {
            type: 'chat',
            id: 'test-' + Date.now(),
            sender: this.room.localParticipant.identity,
            content: '시청자 채팅 테스트 메시지',
            timestamp: new Date().toISOString()
          };
          
          const encoder = new TextEncoder();
          const data = encoder.encode(JSON.stringify(testMessage));
          
          await this.room.localParticipant.publishData(data, { reliable: true });
          console.log('시청자 채팅 테스트 데이터 전송 성공!');
        } catch (e) {
          console.error('시청자 채팅 테스트 데이터 전송 실패:', e);
        }
      }, 5000); // 5초 후 테스트
      
      return this.room;
    } catch (error) {
      console.error('Failed to join room as viewer:', error);
      throw new Error('방 참여에 실패했습니다.');
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
  
  // 로컬 참가자의 비디오 트랙 가져오기
  getLocalVideoTrack(): LocalTrackPublication | undefined {
    const localParticipant = this.getLocalParticipant();
    if (!localParticipant) return undefined;
    
    return Array.from(localParticipant.trackPublications.values())
      .find(pub => pub.kind === 'video');
  }
  
  // 비디오 트랙을 비디오 요소에 연결
  attachVideoTrack(videoElement: HTMLVideoElement): boolean {
    console.log('attachVideoTrack 호출됨:', videoElement);
    
    const localParticipant = this.getLocalParticipant();
    if (!localParticipant) {
      console.error('로컬 참가자를 찾을 수 없습니다');
      return false;
    }

    console.log('로컬 참가자 ID:', localParticipant.identity);

    try {
      // 모든 비디오 트랙 출력
      const allTracks = Array.from(localParticipant.trackPublications.values());
      console.log('사용 가능한 트랙:', allTracks.map(t => ({
        kind: t.kind,
        trackName: t.trackName,
        source: t.source,
        hasTrack: !!t.track
      })));
      
      // 비디오 트랙 필터링
      const videoPublications = allTracks.filter(pub => pub.kind === 'video');
      console.log('비디오 트랙 수:', videoPublications.length);
      
      if (videoPublications.length === 0) {
        // 비디오 트랙이 없는 경우 직접 생성 시도
        console.log('비디오 트랙을 찾을 수 없어 직접 미디어 스트림을 연결합니다');
        this.attachDirectMediaStream(videoElement);
        return true;
      }
      
      // 첫 번째 비디오 트랙 사용
      const videoPublication = videoPublications[0];
      console.log('사용할 비디오 트랙:', videoPublication.trackName);
      
      const videoTrack = videoPublication.track;
      
      if (!videoTrack) {
        console.error('비디오 트랙이 없습니다');
        return false;
      }
      
      console.log('비디오 트랙 정보:', {
        id: videoTrack.sid,
        kind: videoTrack.kind,
        mediaStreamTrack: videoTrack.mediaStreamTrack ? '있음' : '없음'
      });
      
      // 비디오 요소에 트랙 연결
      videoTrack.attach(videoElement);
      console.log('비디오 트랙 연결 성공:', videoPublication.trackName);
      return true;
    } catch (error) {
      console.error('비디오 트랙 연결 실패:', error);
      return false;
    }
  }
  
  // 직접 미디어 스트림 연결
  async attachDirectMediaStream(videoElement: HTMLVideoElement): Promise<boolean> {
    try {
      console.log('직접 미디어 스트림 연결 시도...');
      
      // 이미 srcObject가 있는지 확인
      if (videoElement.srcObject) {
        console.log('이미 비디오 요소에 스트림이 연결되어 있습니다');
        return true;
      }
      
      // 사용자 미디어 가져오기
      const constraints = { 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 } 
        }, 
        audio: true 
      };
      
      console.log('사용자 미디어 요청 중...', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // 트랙 정보 로깅
      console.log('미디어 스트림 트랙:', stream.getTracks().map(t => ({
        kind: t.kind,
        label: t.label,
        enabled: t.enabled,
        id: t.id
      })));
      
      // 비디오 요소에 스트림 연결
      videoElement.srcObject = stream;
      
      // 자동 재생 시도
      try {
        await videoElement.play();
        console.log('비디오 요소 재생 시작');
      } catch (playError) {
        console.error('비디오 요소 재생 실패:', playError);
        // 사용자 상호작용이 필요할 수 있음을 알림
        console.log('브라우저 정책으로 인해 사용자 상호작용 후 재생이 필요할 수 있습니다');
      }
      
      console.log('직접 미디어 스트림 연결 성공');
      return true;
    } catch (err) {
      console.error('직접 미디어 스트림 연결 실패:', err);
      return false;
    }
  }
  
  // 이벤트 핸들러
  private handleParticipantConnected = (participant: RemoteParticipant) => {
    try {
      const metadata = participant.metadata ? JSON.parse(participant.metadata) : {};
      console.log('참가자 연결됨:', {
        identity: participant.identity, 
        name: metadata.name,
        role: metadata.role
      });
    } catch (e) {
      console.error('참가자 연결 이벤트 처리 오류:', e);
    }
  }
  
  private handleParticipantDisconnected = (participant: RemoteParticipant) => {
    try {
      console.log('참가자 연결 해제됨:', participant.identity);
    } catch (e) {
      console.error('참가자 연결 해제 이벤트 처리 오류:', e);
    }
  }
  
  // 연결 해제 이벤트 핸들러
  private handleDisconnect = (reason?: DisconnectReason) => {
    console.log('방 연결 해제됨:', reason || '알 수 없는 이유');
  }
  
  private handleConnectionStateChanged = (state: ConnectionState) => {
    console.log('연결 상태 변경됨:', state);
  }
  
  private handleDataReceived = (payload: Uint8Array, participant?: RemoteParticipant) => {
    try {
      const decoder = new TextDecoder();
      const dataStr = decoder.decode(payload);
      const data = JSON.parse(dataStr);
      
      console.log('LiveKitService 데이터 수신:', {
        sender: participant?.identity || 'unknown',
        type: data.type,
        length: dataStr.length
      });
    } catch (e) {
      console.error('데이터 수신 처리 오류:', e);
    }
  }
}

// 싱글톤 인스턴스 생성
const livekitService = new LiveKitService();
export default livekitService; 