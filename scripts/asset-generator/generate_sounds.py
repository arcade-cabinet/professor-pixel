#!/usr/bin/env python3
"""
Generate CC0 sound effects and music for Pixel's PyGame Palace
Creates WAV files for various game sounds
"""

import numpy as np
import wave
import struct
import os

def create_sine_wave(frequency, duration, sample_rate=44100, amplitude=0.5):
    """Generate a sine wave"""
    t = np.linspace(0, duration, int(sample_rate * duration))
    wave_data = amplitude * np.sin(2 * np.pi * frequency * t)
    return wave_data

def create_square_wave(frequency, duration, sample_rate=44100, amplitude=0.5):
    """Generate a square wave"""
    t = np.linspace(0, duration, int(sample_rate * duration))
    wave_data = amplitude * np.sign(np.sin(2 * np.pi * frequency * t))
    return wave_data

def create_sawtooth_wave(frequency, duration, sample_rate=44100, amplitude=0.5):
    """Generate a sawtooth wave"""
    t = np.linspace(0, duration, int(sample_rate * duration))
    wave_data = amplitude * (2 * (t * frequency - np.floor(t * frequency + 0.5)))
    return wave_data

def create_noise(duration, sample_rate=44100, amplitude=0.3):
    """Generate white noise"""
    samples = int(sample_rate * duration)
    noise = amplitude * (np.random.random(samples) * 2 - 1)
    return noise

def apply_envelope(wave_data, attack=0.01, decay=0.1, sustain=0.7, release=0.2):
    """Apply ADSR envelope to wave"""
    total_samples = len(wave_data)
    sample_rate = 44100
    
    attack_samples = int(attack * sample_rate)
    decay_samples = int(decay * sample_rate)
    release_samples = int(release * sample_rate)
    sustain_samples = total_samples - attack_samples - decay_samples - release_samples
    
    envelope = np.ones(total_samples)
    
    # Attack
    for i in range(attack_samples):
        envelope[i] = i / attack_samples
    
    # Decay
    for i in range(decay_samples):
        envelope[attack_samples + i] = 1.0 - (1.0 - sustain) * (i / decay_samples)
    
    # Sustain
    for i in range(sustain_samples):
        envelope[attack_samples + decay_samples + i] = sustain
    
    # Release
    for i in range(release_samples):
        envelope[attack_samples + decay_samples + sustain_samples + i] = sustain * (1.0 - i / release_samples)
    
    return wave_data * envelope

def save_wave(filename, wave_data, sample_rate=44100):
    """Save wave data to WAV file"""
    # Normalize and convert to 16-bit integer
    wave_data = np.int16(wave_data / np.max(np.abs(wave_data)) * 32767)
    
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 2 bytes = 16 bit
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(wave_data.tobytes())

def create_jump_sound():
    """Create a jump sound effect"""
    # Rising frequency sweep
    duration = 0.2
    sample_rate = 44100
    t = np.linspace(0, duration, int(sample_rate * duration))
    frequency = 200 + 800 * t / duration  # Sweep from 200Hz to 1000Hz
    wave = 0.5 * np.sin(2 * np.pi * frequency * t)
    return apply_envelope(wave, attack=0.01, decay=0.05, sustain=0.3, release=0.14)

def create_coin_sound():
    """Create a coin collection sound"""
    # Two quick high-pitched tones
    tone1 = create_sine_wave(800, 0.1) * 0.5
    tone2 = create_sine_wave(1200, 0.1) * 0.5
    silence = np.zeros(int(44100 * 0.05))
    
    wave = np.concatenate([tone1, silence, tone2])
    return apply_envelope(wave, attack=0.001, decay=0.01, sustain=0.5, release=0.05)

def create_explosion_sound():
    """Create an explosion sound"""
    # Low frequency burst with noise
    low_freq = create_sine_wave(50, 0.5) * 0.3
    noise = create_noise(0.5) * 0.7
    combined = low_freq + noise
    
    # Apply heavy envelope for explosion effect
    return apply_envelope(combined, attack=0.001, decay=0.1, sustain=0.2, release=0.4)

def create_laser_sound():
    """Create a laser/shoot sound"""
    duration = 0.2
    sample_rate = 44100
    t = np.linspace(0, duration, int(sample_rate * duration))
    # Descending frequency sweep
    frequency = 1000 - 800 * t / duration
    wave = 0.5 * create_sawtooth_wave(1, duration) * np.sin(2 * np.pi * frequency * t)
    return apply_envelope(wave, attack=0.001, decay=0.01, sustain=0.3, release=0.05)

def create_powerup_sound():
    """Create a powerup collection sound"""
    # Ascending arpeggio
    notes = [261.63, 329.63, 392.00, 523.25]  # C, E, G, C (C major)
    wave = np.array([])
    
    for freq in notes:
        tone = create_sine_wave(freq, 0.1) * 0.4
        wave = np.concatenate([wave, tone])
    
    return apply_envelope(wave, attack=0.01, decay=0.05, sustain=0.6, release=0.1)

def create_hit_sound():
    """Create a hit/damage sound"""
    # Short burst of noise with low frequency
    noise = create_noise(0.1) * 0.5
    low_tone = create_square_wave(100, 0.1) * 0.5
    combined = noise + low_tone
    return apply_envelope(combined, attack=0.001, decay=0.02, sustain=0.3, release=0.05)

def create_menu_select_sound():
    """Create a menu selection sound"""
    # Quick click sound
    click = create_sine_wave(600, 0.05) * 0.3
    return apply_envelope(click, attack=0.001, decay=0.01, sustain=0.5, release=0.02)

def create_footstep_sound():
    """Create a footstep sound"""
    # Short low frequency thud
    thud = create_sine_wave(80, 0.05) * 0.2
    noise = create_noise(0.05) * 0.1
    combined = thud + noise
    return apply_envelope(combined, attack=0.001, decay=0.01, sustain=0.2, release=0.02)

def create_door_sound():
    """Create a door opening sound"""
    # Creaking sound
    duration = 0.3
    sample_rate = 44100
    t = np.linspace(0, duration, int(sample_rate * duration))
    frequency = 150 + 50 * np.sin(20 * t)
    wave = 0.3 * np.sin(2 * np.pi * frequency * t)
    return apply_envelope(wave, attack=0.05, decay=0.1, sustain=0.5, release=0.1)

def create_splash_sound():
    """Create a water splash sound"""
    # Filtered noise
    noise = create_noise(0.3) * 0.4
    # Simple low-pass filter effect (averaging)
    filtered = np.convolve(noise, np.ones(5)/5, mode='same')
    return apply_envelope(filtered, attack=0.01, decay=0.05, sustain=0.3, release=0.2)

def create_ambient_music(duration=30):
    """Create simple ambient background music"""
    sample_rate = 44100
    samples = int(sample_rate * duration)
    music = np.zeros(samples)
    
    # Create chord progression
    chords = [
        [130.81, 164.81, 196.00],  # C major
        [146.83, 174.61, 220.00],  # D minor
        [164.81, 196.00, 246.94],  # E minor
        [130.81, 164.81, 196.00],  # C major
    ]
    
    chord_duration = duration / len(chords)
    chord_samples = int(sample_rate * chord_duration)
    
    for i, chord in enumerate(chords):
        start = i * chord_samples
        end = min(start + chord_samples, samples)
        chord_wave = np.zeros(end - start)
        
        for freq in chord:
            tone = create_sine_wave(freq, chord_duration)[:end-start] * 0.2
            chord_wave += tone
        
        # Add some movement with LFO
        lfo = 1 + 0.1 * np.sin(2 * np.pi * 0.5 * np.arange(end-start) / sample_rate)
        music[start:end] = chord_wave * lfo
    
    return music * 0.3

def generate_all_sounds():
    """Generate all sound effects"""
    print("Generating sound effects...")
    os.makedirs('assets/sounds', exist_ok=True)
    
    sound_generators = {
        'jump': create_jump_sound,
        'coin': create_coin_sound,
        'explosion': create_explosion_sound,
        'laser': create_laser_sound,
        'powerup': create_powerup_sound,
        'hit': create_hit_sound,
        'menu_select': create_menu_select_sound,
        'footstep': create_footstep_sound,
        'door': create_door_sound,
        'splash': create_splash_sound,
    }
    
    # Generate base sounds
    for name, generator in sound_generators.items():
        wave_data = generator()
        save_wave(f'assets/sounds/{name}.wav', wave_data)
        print(f"  Created {name}.wav")
    
    # Generate variations of some sounds
    for i in range(3):
        # Jump variations
        jump_var = create_jump_sound()
        jump_var = jump_var * (0.8 + 0.4 * np.random.random())  # Vary amplitude
        save_wave(f'assets/sounds/jump_{i+1}.wav', jump_var)
        print(f"  Created jump_{i+1}.wav")
        
        # Footstep variations
        step_var = create_footstep_sound()
        step_var = step_var * (0.7 + 0.6 * np.random.random())
        save_wave(f'assets/sounds/footstep_{i+1}.wav', step_var)
        print(f"  Created footstep_{i+1}.wav")
        
        # Hit variations
        hit_var = create_hit_sound()
        save_wave(f'assets/sounds/hit_{i+1}.wav', hit_var)
        print(f"  Created hit_{i+1}.wav")
    
    # Generate UI sounds
    ui_sounds = ['click', 'hover', 'error', 'success', 'notification']
    for sound in ui_sounds:
        freq = 400 + np.random.randint(0, 400)
        duration = 0.05 + np.random.random() * 0.05
        wave = create_sine_wave(freq, duration) * 0.3
        wave = apply_envelope(wave, attack=0.001, decay=0.01, sustain=0.3, release=0.02)
        save_wave(f'assets/sounds/ui_{sound}.wav', wave)
        print(f"  Created ui_{sound}.wav")
    
    # Generate music tracks
    print("\nGenerating music tracks...")
    os.makedirs('assets/music', exist_ok=True)
    
    # Create simple background music loops
    music_styles = ['ambient', 'action', 'peaceful', 'mysterious', 'victory']
    
    for style in music_styles:
        if style == 'ambient':
            music = create_ambient_music(30)
        elif style == 'action':
            # Fast-paced music
            music = create_ambient_music(20)
            # Add drums (simple beat)
            beat = create_square_wave(2, 20) * 0.1
            music += beat
        elif style == 'peaceful':
            # Slow, calm music
            music = create_ambient_music(40) * 0.5
        elif style == 'mysterious':
            # Minor key, slower
            music = create_ambient_music(35)
            # Add some dissonance
            dissonance = create_sine_wave(139, 35) * 0.05
            music += dissonance
        else:  # victory
            # Major key, upbeat
            music = create_ambient_music(15)
            # Add higher frequencies
            high = create_sine_wave(523.25, 15) * 0.1
            music += high
        
        save_wave(f'assets/music/{style}_theme.wav', music)
        print(f"  Created {style}_theme.wav")

if __name__ == "__main__":
    generate_all_sounds()
    print("\nSound generation complete!")
    print("Total sounds created: 24")
    print("Total music tracks created: 5")