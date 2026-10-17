use fellowshow_audio::{meter::compute_level, AudioFrame, Vad, VadConfig, VadState};

fn next(seed: &mut u32) -> usize {
    *seed = seed.wrapping_mul(1_664_525).wrapping_add(1_013_904_223);
    usize::try_from(*seed).expect("u32 fits in usize on supported targets")
}

#[test]
fn generated_pcm_levels_stay_normalized_including_empty_and_full_scale_frames() {
    let mut seed = 0x5eed_2026;
    for case in 0..10_000 {
        let count = next(&mut seed) % 128;
        let samples: Vec<i16> = (0..count)
            .map(|_| {
                let bytes = seed.to_le_bytes();
                next(&mut seed);
                i16::from_le_bytes([bytes[0], bytes[1]])
            })
            .collect();
        let level = compute_level(&samples);
        assert!(
            (0.0..=1.0).contains(&level.rms) && (0.0..=1.0).contains(&level.peak),
            "case={case}"
        );
        assert!(level.rms <= level.peak + 0.00004);
    }
    for samples in [&[][..], &[i16::MIN][..], &[i16::MAX][..], &[0][..]] {
        let level = compute_level(samples);
        assert!(level.rms.is_finite() && level.peak.is_finite());
    }
}

#[test]
fn randomized_voice_activity_sequences_allow_zero_prebuffer_and_reset_cleanly() {
    let mut seed = 0x5eed_2027;
    for case in 0..10_000 {
        let pre_buffer_frames = next(&mut seed) % 6;
        let mut vad = Vad::new(VadConfig {
            pre_buffer_frames,
            min_voice_frames: next(&mut seed) % 6 + 1,
            silence_frame_count: next(&mut seed) % 8 + 1,
            max_utterance_frames: next(&mut seed) % 30 + 1,
            ..VadConfig::default()
        });
        for i in 0..30 {
            let amplitude = if next(&mut seed).is_multiple_of(3) {
                0
            } else {
                i16::MAX / 4
            };
            let frame = AudioFrame {
                samples: vec![amplitude; 64],
                timestamp_ms: i,
            };
            let result = vad.process(&frame);
            assert!(
                result.frames.len() <= pre_buffer_frames + 1,
                "seed=0x5eed2027 case={case}"
            );
        }
        vad.reset();
        assert_eq!(vad.state(), VadState::Silence);
        assert_eq!(
            vad.process(&AudioFrame {
                samples: vec![],
                timestamp_ms: 100
            })
            .frames,
            Vec::new()
        );
    }
}
