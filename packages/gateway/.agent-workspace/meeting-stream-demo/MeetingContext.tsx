import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { MeetingState, MeetingAction, Participant, ChatMessage } from './types';

// 初始状态
const initialState: MeetingState = {
  meetingId: '',
  participants: new Map(),
  localParticipant: null,
  chatMessages: [],
  isRecording: false,
  meetingStatus: 'waiting',
  layout: 'grid',
};

// Reducer函数
function meetingReducer(state: MeetingState, action: MeetingAction): MeetingState {
  switch (action.type) {
    case 'PARTICIPANT_JOINED': {
      const newParticipants = new Map(state.participants);
      newParticipants.set(action.payload.id, action.payload);
      return { ...state, participants: newParticipants };
    }

    case 'PARTICIPANT_LEFT': {
      const newParticipants = new Map(state.participants);
      newParticipants.delete(action.payload);
      return { ...state, participants: newParticipants };
    }

    case 'UPDATE_PARTICIPANT': {
      const newParticipants = new Map(state.participants);
      const existing = newParticipants.get(action.payload.id);
      if (existing) {
        newParticipants.set(action.payload.id, { ...existing, ...action.payload.updates });
      }
      return { ...state, participants: newParticipants };
    }

    case 'ADD_CHAT_MESSAGE': {
      return {
        ...state,
        chatMessages: [...state.chatMessages, action.payload],
      };
    }

    case 'SET_LOCAL_PARTICIPANT': {
      return { ...state, localParticipant: action.payload };
    }

    case 'TOGGLE_RECORDING': {
      return { ...state, isRecording: !state.isRecording };
    }

    case 'SET_LAYOUT': {
      return { ...state, layout: action.payload };
    }

    case 'SET_MEETING_STATUS': {
      return { ...state, meetingStatus: action.payload };
    }

    default:
      return state;
  }
}

// Context类型
interface MeetingContextType {
  state: MeetingState;
  dispatch: React.Dispatch<MeetingAction>;
}

// 创建Context
const MeetingContext = createContext<MeetingContextType | undefined>(undefined);

// Provider组件
export function MeetingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(meetingReducer, initialState);

  return (
    <MeetingContext.Provider value={{ state, dispatch }}>
      {children}
    </MeetingContext.Provider>
  );
}

// 自定义Hook
export function useMeeting() {
  const context = useContext(MeetingContext);
  if (context === undefined) {
    throw new Error('useMeeting must be used within a MeetingProvider');
  }
  return context;
}

// 辅助Hook：获取参与者列表
export function useParticipants() {
  const { state } = useMeeting();
  return Array.from(state.participants.values());
}

// 辅助Hook：获取聊天消息
export function useChatMessages() {
  const { state } = useMeeting();
  return state.chatMessages;
}

// 辅助Hook：会议操作
export function useMeetingActions() {
  const { dispatch } = useMeeting();

  const addParticipant = (participant: Participant) => {
    dispatch({ type: 'PARTICIPANT_JOINED', payload: participant });
  };

  const removeParticipant = (participantId: string) => {
    dispatch({ type: 'PARTICIPANT_LEFT', payload: participantId });
  };

  const updateParticipant = (id: string, updates: Partial<Participant>) => {
    dispatch({ type: 'UPDATE_PARTICIPANT', payload: { id, updates } });
  };

  const sendChatMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const chatMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: chatMessage });
  };

  const toggleRecording = () => {
    dispatch({ type: 'TOGGLE_RECORDING' });
  };

  const setLayout = (layout: MeetingState['layout']) => {
    dispatch({ type: 'SET_LAYOUT', payload: layout });
  };

  return {
    addParticipant,
    removeParticipant,
    updateParticipant,
    sendChatMessage,
    toggleRecording,
    setLayout,
  };
}