from agno.agent import Agent
import os
from datetime import datetime
import asyncio
import tempfile
import numpy as np
import soundfile as sf
from typing import Any, Dict, List, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor
import aiofiles
from openai import AsyncOpenAI
from utils.load_api_keys import load_api_key

PODCASTS_FOLDER = "podcasts"
PODCAST_AUDIO_FOLDER = os.path.join(PODCASTS_FOLDER, "audio")
OPENAI_VOICES = {1: "alloy", 2: "echo", 3: "fable", 4: "onyx", 5: "nova", 6: "shimmer"}
DEFAULT_VOICE_MAP = {1: "alloy", 2: "nova"}
TTS_MODEL = "gpt-4o-mini-tts"


class DictPodcastScript:
    """Helper class to convert dictionary format to iterable script format"""

    def __init__(self, entries):
        self.entries = entries

    def __iter__(self):
        return iter(self.entries)


def create_silence_audio(silence_duration: float, sampling_rate: int) -> np.ndarray:
    """Create a silent audio segment."""
    if sampling_rate <= 0:
        print(f"Invalid sampling rate ({sampling_rate}) for silence generation")
        return np.zeros(0, dtype=np.float32)
    return np.zeros(int(sampling_rate * silence_duration), dtype=np.float32)


def combine_audio_segments(audio_segments: List[np.ndarray], silence_duration: float, sampling_rate: int) -> np.ndarray:
    """Combine multiple audio segments with silence between them."""
    if not audio_segments:
        return np.zeros(0, dtype=np.float32)
    silence = create_silence_audio(silence_duration, sampling_rate)
    combined_segments = []
    for i, segment in enumerate(audio_segments):
        combined_segments.append(segment)
        if i < len(audio_segments) - 1:
            combined_segments.append(silence)
    combined = np.concatenate(combined_segments)
    max_amp = np.max(np.abs(combined))
    if max_amp > 0:
        combined = combined / max_amp * 0.95
    return combined


def process_audio_file(temp_path: str) -> Optional[Tuple[np.ndarray, int]]:
    """Process audio file in a synchronous manner (to be run in thread pool)."""
    try:
        from pydub import AudioSegment

        audio_segment = AudioSegment.from_mp3(temp_path)
        channels = audio_segment.channels
        sample_width = audio_segment.sample_width
        frame_rate = audio_segment.frame_rate
        samples = np.array(audio_segment.get_array_of_samples())
        if channels == 2:
            samples = samples.reshape(-1, 2).mean(axis=1)
        max_possible_value = float(2 ** (8 * sample_width - 1))
        samples = samples.astype(np.float32) / max_possible_value
        return samples, frame_rate
    except ImportError:
        print("Pydub not available, falling back to soundfile")
    except Exception as e:
        print(f"Pydub processing failed: {e}")
    try:
        audio_np, samplerate = sf.read(temp_path)
        return audio_np, samplerate
    except Exception as e:
        print(f"Failed to process audio with soundfile: {e}")
        try:
            from pydub import AudioSegment

            sound = AudioSegment.from_mp3(temp_path)
            wav_path = temp_path.replace(".mp3", ".wav")
            sound.export(wav_path, format="wav")
            audio_np, samplerate = sf.read(wav_path)
            os.unlink(wav_path)
            return audio_np, samplerate
        except Exception as e:
            print(f"All audio processing methods failed: {e}")
    return None


def resample_audio(audio, orig_sr, target_sr):
    """Resample audio from one sample rate to another"""
    try:
        import librosa

        return librosa.resample(audio, orig_sr=orig_sr, target_sr=target_sr)
    except ImportError:
        print("Librosa not available for resampling")
        return audio
    except Exception as e:
        print(f"Resampling failed: {e}")
        return audio


async def text_to_speech_openai(
    client: AsyncOpenAI,
    text: str,
    speaker_id: int,
    voice_map: Dict[int, str] = None,
    model: str = TTS_MODEL,
) -> Optional[Tuple[np.ndarray, int]]:
    """Generate speech using OpenAI's text-to-speech API asynchronously."""
    if not text.strip():
        print("Empty text provided, skipping TTS generation")
        return None
    voice_map = voice_map or DEFAULT_VOICE_MAP
    voice = voice_map.get(speaker_id)
    if not voice:
        if speaker_id in OPENAI_VOICES:
            voice = OPENAI_VOICES[speaker_id]
        else:
            voice = next(iter(voice_map.values()), "alloy")
        print(f"No voice mapping for speaker {speaker_id}, using {voice}")
    try:
        print(f"Generating TTS for speaker {speaker_id} using voice '{voice}'")
        response = await client.audio.speech.create(
            model=model,
            voice=voice,
            input=text,
            response_format="mp3",
        )
        audio_data = response.content
        if not audio_data:
            print("OpenAI TTS returned empty response")
            return None

        print(f"Received {len(audio_data)} bytes from OpenAI TTS")
        temp_file = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
        temp_path = temp_file.name
        temp_file.close()
        async with aiofiles.open(temp_path, "wb") as f:
            await f.write(audio_data)
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as pool:
            try:
                return await loop.run_in_executor(pool, process_audio_file, temp_path)
            finally:
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
    except Exception as e:
        print(f"OpenAI TTS API error: {e}")
        import traceback

        traceback.print_exc()
        return None


async def create_podcast_async(
    script: Any,
    output_path: str,
    tts_engine: str = "openai",
    language_code: str = "en",
    silence_duration: float = 0.7,
    voice_map: Dict[int, str] = None,
    model: str = TTS_MODEL,
) -> Optional[str]:
    """
    Generate podcast audio asynchronously using OpenAI's TTS API.

    Args:
        script: Script object with entries (either iterable with speaker and text attributes or list of dicts)
        output_path: Path to save the output audio file
        tts_engine: TTS engine name (currently only 'openai' is supported in this standalone version)
        language_code: Language code for TTS (e.g., 'en' for English)
        silence_duration: Duration of silence between segments in seconds
        voice_map: Mapping from speaker IDs to voice names
        model: TTS model name

    Returns:
        Path to the generated audio file or None if generation failed
    """
    if tts_engine.lower() != "openai":
        print(f"Only OpenAI TTS engine is available in this standalone version. Requested: {tts_engine}")
        return None
    try:
        api_key = load_api_key("OPENAI_API_KEY")
        if not api_key:
            print("No OpenAI API key provided")
            return None
        client = AsyncOpenAI(api_key=api_key)
        print("OpenAI client initialized")
    except Exception as e:
        print(f"Failed to initialize OpenAI client: {e}")
        return None
    output_path = os.path.abspath(output_path)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    if voice_map is None:
        voice_map = DEFAULT_VOICE_MAP.copy()
    model_to_use = model
    if model == "tts-1" and language_code == "en":
        model_to_use = "tts-1-hd"
        print(f"Using high-definition TTS model for English: {model_to_use}")
    generated_segments = []
    sampling_rate_detected = None
    entries = script.entries if hasattr(script, "entries") else script
    print(f"Processing {len(entries)} script entries")
    for i, entry in enumerate(entries):
        if hasattr(entry, "speaker"):
            speaker_id = entry.speaker
            entry_text = entry.text
        else:
            speaker_id = entry["speaker"]
            entry_text = entry["text"]
        print(f"Processing entry {i + 1}/{len(entries)}: Speaker {speaker_id}")
        result = await text_to_speech_openai(
            client=client,
            text=entry_text,
            speaker_id=speaker_id,
            voice_map=voice_map,
            model=model_to_use,
        )
        if result:
            segment_audio, segment_rate = result
            if sampling_rate_detected is None:
                sampling_rate_detected = segment_rate
                print(f"Using sample rate: {sampling_rate_detected} Hz")
            elif sampling_rate_detected != segment_rate:
                print(f"Sample rate mismatch: {sampling_rate_detected} vs {segment_rate}")
                loop = asyncio.get_event_loop()
                with ThreadPoolExecutor() as pool:
                    try:
                        segment_audio = await loop.run_in_executor(pool, resample_audio, segment_audio, segment_rate, sampling_rate_detected)
                        print(f"Resampled to {sampling_rate_detected} Hz")
                    except Exception as e:
                        sampling_rate_detected = segment_rate
                        print(f"Resampling failed: {e}")
            generated_segments.append(segment_audio)
        else:
            print(f"Failed to generate audio for entry {i + 1}")
    if not generated_segments:
        print("No audio segments were generated")
        return None
    if sampling_rate_detected is None:
        print("Could not determine sample rate")
        return None
    print(f"Combining {len(generated_segments)} audio segments")
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor() as pool:
        full_audio = await loop.run_in_executor(pool, combine_audio_segments, generated_segments, silence_duration, sampling_rate_detected)
    if full_audio.size == 0:
        print("Combined audio is empty")
        return None
    print(f"Writing audio to {output_path}")
    try:
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as pool:
            await loop.run_in_executor(pool, sf.write, output_path, full_audio, sampling_rate_detected)
    except Exception as e:
        print(f"Failed to write audio file: {e}")
        return None
    if os.path.exists(output_path):
        file_size = os.path.getsize(output_path)
        print(f"Audio file created: {output_path} ({file_size / 1024:.1f} KB)")
        return output_path
    else:
        print(f"Failed to create audio file at {output_path}")
        return None


async def generate_audio(agent: Agent) -> str:
    """
    Generate an audio file for the podcast using the selected TTS engine.

    Args:
        agent: The agent instance

    Returns:
        A message with the result of audio generation
    """
    agent.session_state["show_banner_for_confirmation"] = False
    agent.session_state["stage"] = "audio"
    script_data = agent.session_state.get("generated_script", {})
    if not script_data or (isinstance(script_data, dict) and not script_data.get("sections")):
        error_msg = "Cannot generate audio: No podcast script data found. Please generate a script first."
        print(error_msg)
        return error_msg
    if isinstance(script_data, dict):
        podcast_title = script_data.get("title", "Your Podcast")
    else:
        podcast_title = "Your Podcast"
    audio_dir = PODCAST_AUDIO_FOLDER
    audio_filename = f"podcast_{datetime.now().strftime('%Y%m%d_%H%M%S')}.wav"
    audio_path = os.path.join(audio_dir, audio_filename)
    try:
        if isinstance(script_data, dict) and "sections" in script_data:
            speaker_map = {"ALEX": 1, "MORGAN": 2}
            dict_entries = []
            for section in script_data.get("sections", []):
                for dialog in section.get("dialog", []):
                    speaker = dialog.get("speaker", "ALEX")
                    text = dialog.get("text", "")

                    if text and speaker in speaker_map:
                        dict_entries.append({"text": text, "speaker": speaker_map[speaker]})
            if not dict_entries:
                error_msg = "Cannot generate audio: No dialog found in the script."
                print(error_msg)
                return error_msg
            script_obj = DictPodcastScript(dict_entries)
            selected_language = agent.session_state.get("selected_language", {"code": "en", "name": "English"})
            language_code = selected_language.get("code", "en")
            language_name = selected_language.get("name", "English")
            tts_engine = "openai"
            if tts_engine == "openai" and not load_api_key("OPENAI_API_KEY"):
                error_msg = "Cannot generate audio: OpenAI API key not found."
                print(error_msg)
                return error_msg
            print(f"Generating podcast audio using {tts_engine} TTS engine in {language_name} language")
            full_audio_path = await create_podcast_async(
                script=script_obj,
                output_path=audio_path,
                tts_engine=tts_engine,
                language_code=language_code,
            )
            if not full_audio_path:
                error_msg = f"Failed to generate podcast audio with {tts_engine} TTS engine."
                print(error_msg)
                return error_msg
            audio_url = f"{os.path.basename(full_audio_path)}"
            agent.session_state["audio_url"] = audio_url
            agent.session_state["show_audio_for_confirmation"] = True
            print(f"Successfully generated podcast audio: {full_audio_path}")
            return f"I've generated the audio for your '{podcast_title}' podcast using {tts_engine.capitalize()} voices in {language_name}. You can listen to it in the player below. What do you think? If it sounds good, click 'Sounds Great!' to complete your podcast."
        else:
            error_msg = "Cannot generate audio: Script is not in the expected format."
            print(error_msg)
            return error_msg
    except Exception as e:
        error_msg = f"Error generating podcast audio: {str(e)}"
        print(error_msg)
        return f"I encountered an error while generating the podcast audio: {str(e)}. Please try again or let me know if you'd like to proceed without audio."
