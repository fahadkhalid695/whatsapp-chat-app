import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  IconButton,
  Typography,
  LinearProgress,
  Fade,
  Slide,
} from '@mui/material';
import {
  Mic,
  Stop,
  Send,
  Delete,
  PlayArrow,
  Pause,
} from '@mui/icons-material';

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSend, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const playAudio = () => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSend = () => {
    if (audioBlob) {
      onSend(audioBlob, recordingTime);
      resetRecorder();
    }
  };

  const handleCancel = () => {
    resetRecorder();
    onCancel();
  };

  const resetRecorder = () => {
    setIsRecording(false);
    setIsPlaying(false);
    setRecordingTime(0);
    setAudioBlob(null);
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl('');
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Slide direction="up" in={true} mountOnEnter unmountOnExit>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 2,
          bgcolor: '#f5f5f5',
          borderRadius: 3,
          border: '2px solid #25D366',
        }}
      >
        {!isRecording && !audioBlob && (
          <Fade in={true}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                onClick={startRecording}
                sx={{
                  bgcolor: '#25D366',
                  color: 'white',
                  '&:hover': {
                    bgcolor: '#128C7E',
                  },
                }}
              >
                <Mic />
              </IconButton>
              <Typography variant="body2" color="text.secondary">
                Tap to record voice message
              </Typography>
            </Box>
          </Fade>
        )}

        {isRecording && (
          <Fade in={true}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <IconButton
                onClick={stopRecording}
                sx={{
                  bgcolor: '#dc3545',
                  color: 'white',
                  '&:hover': {
                    bgcolor: '#c82333',
                  },
                }}
              >
                <Stop />
              </IconButton>
              
              <Box sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: '#dc3545',
                      animation: 'pulse 1s infinite',
                      '@keyframes pulse': {
                        '0%': { opacity: 1 },
                        '50%': { opacity: 0.5 },
                        '100%': { opacity: 1 },
                      },
                    }}
                  />
                  <Typography variant="body2" color="text.primary">
                    Recording... {formatTime(recordingTime)}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="indeterminate" 
                  sx={{ 
                    height: 4, 
                    borderRadius: 2,
                    '& .MuiLinearProgress-bar': {
                      bgcolor: '#25D366',
                    },
                  }} 
                />
              </Box>
              
              <IconButton onClick={handleCancel}>
                <Delete />
              </IconButton>
            </Box>
          </Fade>
        )}

        {audioBlob && !isRecording && (
          <Fade in={true}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <IconButton
                onClick={isPlaying ? pauseAudio : playAudio}
                sx={{
                  bgcolor: '#25D366',
                  color: 'white',
                  '&:hover': {
                    bgcolor: '#128C7E',
                  },
                }}
              >
                {isPlaying ? <Pause /> : <PlayArrow />}
              </IconButton>
              
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2" color="text.primary">
                  Voice message • {formatTime(recordingTime)}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={isPlaying ? 50 : 0} // In a real app, this would track actual playback progress
                  sx={{ 
                    height: 4, 
                    borderRadius: 2,
                    '& .MuiLinearProgress-bar': {
                      bgcolor: '#25D366',
                    },
                  }} 
                />
              </Box>
              
              <IconButton onClick={handleCancel}>
                <Delete />
              </IconButton>
              
              <IconButton
                onClick={handleSend}
                sx={{
                  bgcolor: '#25D366',
                  color: 'white',
                  '&:hover': {
                    bgcolor: '#128C7E',
                  },
                }}
              >
                <Send />
              </IconButton>
            </Box>
          </Fade>
        )}

        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            style={{ display: 'none' }}
          />
        )}
      </Box>
    </Slide>
  );
};

export default VoiceRecorder;