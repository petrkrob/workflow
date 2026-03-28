/**
 * Transcript — output of audio transcription.
 * Holds both raw and cleaned versions with quality metadata.
 */

export interface Transcript {
  transcript_id: string;
  case_id: string;
  created_at: string;
  updated_at: string;

  // Source
  audio_file_id: string;
  audio_duration_seconds?: number;

  // Transcription results
  raw_transcript: TranscriptSegment[];
  cleaned_transcript: string; // Normalized, readable version
  full_raw_text: string; // Plain text concatenation of raw segments

  // Speaker info
  speakers: SpeakerInfo[];
  speaker_diarization_available: boolean;

  // Quality metadata
  quality: TranscriptQuality;

  // Processing info
  provider: string; // e.g. "whisper", "deepgram", "assemblyai"
  model_version?: string;
  language: string; // ISO 639-1
  processing_time_ms?: number;
}

export interface TranscriptSegment {
  segment_id: string;
  speaker?: string; // Speaker label or name
  start_time_seconds: number;
  end_time_seconds: number;
  text: string;
  confidence?: number; // 0-1
  flagged_unclear?: boolean;
}

export interface SpeakerInfo {
  label: string; // e.g. "Speaker 1", "Advisor", "Client"
  identified_name?: string;
  role?: 'advisor' | 'client' | 'other' | 'unknown';
}

export interface TranscriptQuality {
  overall_confidence: number; // 0-1
  unclear_segments_count: number;
  total_segments_count: number;
  estimated_word_error_rate?: number;
  quality_rating: 'high' | 'medium' | 'low';
  quality_notes?: string[];
}
