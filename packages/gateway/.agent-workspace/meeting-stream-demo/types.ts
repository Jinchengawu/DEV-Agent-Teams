// 会议流式系统类型定义

export interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  stream?: MediaStream;
  connectionState: 'connecting' | 'connected' | 'disconnected';
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'system';
}

export interface MeetingState {
  meetingId: string;
  participants: Map<string, Participant>;
  localParticipant: Participant | null;
  chatMessages: ChatMessage[];
  isRecording: boolean;
  meetingStatus: 'waiting' | 'active' | 'ended';
  layout: 'grid' | 'spotlight' | 'sidebar';
}

export type MeetingAction =
  | { type: 'PARTICIPANT_JOINED'; payload: Participant }
  | { type: 'PARTICIPANT_LEFT'; payload: string }
  | { type: 'UPDATE_PARTICIPANT'; payload: { id: string; updates: Partial<Participant> } }
  | { type: 'ADD_CHAT_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_LOCAL_PARTICIPANT'; payload: Participant }
  | { type: 'TOGGLE_RECORDING' }
  | { type: 'SET_LAYOUT'; payload: MeetingState['layout'] }
  | { type: 'SET_MEETING_STATUS'; payload: MeetingState['meetingStatus'] };

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  mediaConstraints: MediaStreamConstraints;
}

export interface SignalingMessage {
  type: 'join' | 'leave' | 'offer' | 'answer' | 'ice-candidate';
  meetingId: string;
  participantId: string;
  payload?: any;
}