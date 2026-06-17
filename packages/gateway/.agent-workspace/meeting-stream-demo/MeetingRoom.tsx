import React, { useState, useEffect, useRef } from 'react';
import { useMeeting, useParticipants, useChatMessages, useMeetingActions } from './MeetingContext';
import { useWebRTC } from './useWebRTC';
import { Participant, ChatMessage } from './types';

// 视频组件
function VideoStream({ participant, isLocal = false }: { participant: Participant; isLocal?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="w-full h-full object-cover"
      />
      
      {/* 参与者信息覆盖层 */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              participant.connectionState === 'connected' ? 'bg-green-500' :
              participant.connectionState === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <span className="text-white text-sm font-medium truncate">
              {participant.name} {isLocal ? '(你)' : ''}
            </span>
          </div>
          
          <div className="flex items-center space-x-1">
            {participant.isMuted && (
              <div className="bg-red-500 rounded-full p-1">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              </div>
            )}
            
            {!participant.isVideoEnabled && (
              <div className="bg-gray-600 rounded-full p-1">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            
            {participant.isScreenSharing && (
              <div className="bg-blue-500 rounded-full p-1">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 连接状态指示器 */}
      {participant.connectionState === 'connecting' && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      )}
    </div>
  );
}

// 聊天组件
function ChatPanel() {
  const messages = useChatMessages();
  const { sendChatMessage } = useMeetingActions();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (inputValue.trim()) {
      sendChatMessage({
        senderId: 'local',
        senderName: '本地用户',
        content: inputValue.trim(),
        type: 'text',
      });
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">会议聊天</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.senderId === 'local' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.senderId === 'local'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              {message.senderId !== 'local' && (
                <div className="text-xs font-medium mb-1 opacity-70">
                  {message.senderName}
                </div>
              )}
              <div className="text-sm">{message.content}</div>
              <div className="text-xs mt-1 opacity-70">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入消息..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}

// 控制栏组件
function ControlBar() {
  const { localStream, toggleAudio, toggleVideo, startScreenShare, stopScreenShare } = useWebRTC();
  const { state } = useMeeting();
  const { toggleRecording, setLayout } = useMeetingActions();

  return (
    <div className="bg-gray-900 p-4 rounded-lg">
      <div className="flex items-center justify-center space-x-4">
        {/* 音频控制 */}
        <button
          onClick={toggleAudio}
          className={`p-3 rounded-full ${
            state.localParticipant?.isMuted
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-gray-700 hover:bg-gray-600'
          } text-white transition-colors`}
        >
          {state.localParticipant?.isMuted ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>

        {/* 视频控制 */}
        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full ${
            !state.localParticipant?.isVideoEnabled
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-gray-700 hover:bg-gray-600'
          } text-white transition-colors`}
        >
          {state.localParticipant?.isVideoEnabled ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          )}
        </button>

        {/* 屏幕共享 */}
        <button
          onClick={state.localParticipant?.isScreenSharing ? stopScreenShare : startScreenShare}
          className={`p-3 rounded-full ${
            state.localParticipant?.isScreenSharing
              ? 'bg-blue-500 hover:bg-blue-600'
              : 'bg-gray-700 hover:bg-gray-600'
          } text-white transition-colors`}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </button>

        {/* 录制 */}
        <button
          onClick={toggleRecording}
          className={`p-3 rounded-full ${
            state.isRecording
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-gray-700 hover:bg-gray-600'
          } text-white transition-colors`}
        >
          <div className={`w-6 h-6 rounded-full ${state.isRecording ? 'bg-red-300' : 'bg-white'}`} />
        </button>

        {/* 布局切换 */}
        <div className="flex space-x-2 ml-4">
          {(['grid', 'spotlight', 'sidebar'] as const).map((layout) => (
            <button
              key={layout}
              onClick={() => setLayout(layout)}
              className={`px-3 py-1 text-sm rounded ${
                state.layout === layout
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {layout === 'grid' ? '网格' : layout === 'spotlight' ? '聚焦' : '侧边'}
            </button>
          ))}
        </div>

        {/* 结束会议 */}
        <button className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 ml-4">
          离开会议
        </button>
      </div>
    </div>
  );
}

// 主会议组件
export default function MeetingRoom() {
  const { state } = useMeeting();
  const participants = useParticipants();
  const { getLocalStream } = useWebRTC();
  const [isInitialized, setIsInitialized] = useState(false);

  // 初始化本地流
  useEffect(() => {
    if (!isInitialized) {
      getLocalStream()
        .then(() => setIsInitialized(true))
        .catch(console.error);
    }
  }, [getLocalStream, isInitialized]);

  // 根据布局渲染参与者
  const renderParticipants = () => {
    const localParticipant = state.localParticipant;
    if (!localParticipant) return null;

    switch (state.layout) {
      case 'grid':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            <VideoStream participant={localParticipant} isLocal />
            {participants
              .filter(p => p.id !== 'local')
              .map(participant => (
                <VideoStream key={participant.id} participant={participant} />
              ))}
          </div>
        );

      case 'spotlight':
        return (
          <div className="flex flex-col h-full">
            <div className="flex-1 p-4">
              <VideoStream participant={localParticipant} isLocal />
            </div>
            <div className="flex space-x-2 p-4 overflow-x-auto">
              {participants
                .filter(p => p.id !== 'local')
                .map(participant => (
                  <div key={participant.id} className="flex-shrink-0 w-32">
                    <VideoStream participant={participant} />
                  </div>
                ))}
            </div>
          </div>
        );

      case 'sidebar':
        return (
          <div className="flex h-full">
            <div className="flex-1 p-4">
              <VideoStream participant={localParticipant} isLocal />
            </div>
            <div className="w-80 border-l border-gray-200 p-4 overflow-y-auto">
              <div className="space-y-4">
                {participants
                  .filter(p => p.id !== 'local')
                  .map(participant => (
                    <VideoStream key={participant.id} participant={participant} />
                  ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">正在初始化会议...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* 顶部信息栏 */}
      <div className="bg-white shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">
              会议: {state.meetingId}
            </h1>
            <p className="text-sm text-gray-500">
              参与者: {participants.length} | 
              状态: {state.meetingStatus} | 
              录制: {state.isRecording ? '进行中' : '未录制'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-600">连接正常</span>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 视频区域 */}
        <div className="flex-1 overflow-y-auto">
          {renderParticipants()}
        </div>

        {/* 聊天面板 */}
        <div className="w-80 border-l border-gray-200">
          <ChatPanel />
        </div>
      </div>

      {/* 底部控制栏 */}
      <div className="p-4">
        <ControlBar />
      </div>
    </div>
  );
}