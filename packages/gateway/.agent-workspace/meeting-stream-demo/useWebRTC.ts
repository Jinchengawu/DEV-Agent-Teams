import { useState, useEffect, useCallback, useRef } from 'react';
import { WebRTCConfig, Participant } from './types';
import { useMeetingActions } from './MeetingContext';

// 默认WebRTC配置
const defaultConfig: WebRTCConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  mediaConstraints: {
    audio: true,
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: 'user',
    },
  },
};

export function useWebRTC(config: WebRTCConfig = defaultConfig) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peerConnections, setPeerConnections] = useState<Map<string, RTCPeerConnection>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const { addParticipant, updateParticipant } = useMeetingActions();
  const localStreamRef = useRef<MediaStream | null>(null);

  // 获取本地媒体流
  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(config.mediaConstraints);
      setLocalStream(stream);
      localStreamRef.current = stream;
      
      // 创建本地参与者
      const localParticipant: Participant = {
        id: 'local',
        name: '本地用户',
        isMuted: false,
        isVideoEnabled: true,
        isScreenSharing: false,
        stream,
        connectionState: 'connected',
      };
      
      addParticipant(localParticipant);
      return stream;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '无法访问媒体设备';
      setError(errorMessage);
      throw err;
    }
  }, [config.mediaConstraints, addParticipant]);

  // 切换音频
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        updateParticipant('local', { isMuted: !audioTrack.enabled });
      }
    }
  }, [localStream, updateParticipant]);

  // 切换视频
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        updateParticipant('local', { isVideoEnabled: videoTrack.enabled });
      }
    }
  }, [localStream, updateParticipant]);

  // 开始屏幕共享
  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      
      // 替换视频轨道
      if (localStream) {
        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = peerConnections.get('local')?.getSenders().find(s => s.track?.kind === 'video');
        
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
        
        updateParticipant('local', { isScreenSharing: true });
        
        // 监听屏幕共享结束
        videoTrack.onended = () => {
          stopScreenShare();
        };
      }
    } catch (err) {
      console.error('屏幕共享失败:', err);
    }
  }, [localStream, peerConnections, updateParticipant]);

  // 停止屏幕共享
  const stopScreenShare = useCallback(async () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      const sender = peerConnections.get('local')?.getSenders().find(s => s.track?.kind === 'video');
      
      if (sender && videoTrack) {
        sender.replaceTrack(videoTrack);
      }
      
      updateParticipant('local', { isScreenSharing: false });
    }
  }, [localStream, peerConnections, updateParticipant]);

  // 创建PeerConnection
  const createPeerConnection = useCallback((participantId: string) => {
    const pc = new RTCPeerConnection(config);
    
    // 添加本地流
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }
    
    // ICE候选处理
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // 这里应该通过信令服务器发送ICE候选
        console.log('ICE候选:', event.candidate);
      }
    };
    
    // 远程流处理
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      updateParticipant(participantId, {
        stream: remoteStream,
        connectionState: 'connected',
      });
    };
    
    // 连接状态变化
    pc.onconnectionstatechange = () => {
      updateParticipant(participantId, {
        connectionState: pc.connectionState as Participant['connectionState'],
      });
    };
    
    setPeerConnections(prev => new Map(prev).set(participantId, pc));
    return pc;
  }, [config, localStream, updateParticipant]);

  // 清理函数
  const cleanup = useCallback(() => {
    // 停止本地流
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // 关闭所有PeerConnection
    peerConnections.forEach(pc => pc.close());
    setPeerConnections(new Map());
    setLocalStream(null);
  }, [peerConnections]);

  // 组件卸载时清理
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    localStream,
    peerConnections,
    error,
    getLocalStream,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    createPeerConnection,
    cleanup,
  };
}