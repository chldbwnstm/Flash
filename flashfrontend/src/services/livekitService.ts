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
      // LiveKit 서버에 직접 연결
      const livekitUrl = 'wss://livekitserver1.picklive.show';
      
      console.log(`LiveKit 서버에 직접 연결 시도: ${livekitUrl}`);
      console.log(`토큰 일부: ${token.substring(0, 20)}...`);
      
      // 연결 옵션 설정
      const connectOptions = {
        autoSubscribe: true,
      };
      
      // 사전 검증 요청을 우리 서버의 프록시 엔드포인트를 통해 수행
      try {
        // 원래 LiveKit 검증 URL을 프록시로 대체
        const validateUrl = `/api/livekit/validate?access_token=${token}&auto_subscribe=1&sdk=js&version=2.9.9&protocol=15&adaptive_stream=1`;
        console.log('프록시를 통한 토큰 검증 요청 시도...');
        
        const validateResponse = await fetch(validateUrl);
        const validateResult = await validateResponse.text();
        
        console.log('토큰 검증 응답:', validateResponse.status, validateResponse.ok ? '성공' : '실패');
        if(!validateResponse.ok) {
          console.error('검증 응답 내용:', validateResult);
        }
      } catch (valErr) {
        console.log('토큰 검증 시도 중 오류 (무시 가능):', valErr);
        // 오류가 발생해도 계속 진행
      }
      
      // LiveKit 서버에 연결 시도
      await this.room.connect(livekitUrl, token, connectOptions);
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