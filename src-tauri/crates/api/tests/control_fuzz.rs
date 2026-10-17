use fellowshow_api::{
    coerce_bool, coerce_f32_normalized, parse_osc, CommandDispatcher, CommandError, CommandSink,
};
use rosc::OscType;

struct JsonSink;
impl CommandSink for JsonSink {
    fn emit_event(&self, _event: &str, payload: &str) -> Result<(), CommandError> {
        let value: serde_json::Value = serde_json::from_str(payload).expect("valid dispatch JSON");
        if let Some(number) = value.get("value") {
            assert!(number
                .as_f64()
                .is_some_and(|v| v.is_finite() && (0.0..=1.0).contains(&v)));
        }
        Ok(())
    }
    fn invoke_backend(&self, action: &str, payload: &str) -> Result<(), CommandError> {
        self.emit_event(action, payload)
    }
}

#[test]
fn osc_numeric_controls_reject_nonfinite_values_and_dispatch_valid_json() {
    let mut seed = 0x5eed_2026_u32;
    for case in 0..10_000 {
        seed = seed.wrapping_mul(1_664_525).wrapping_add(1_013_904_223);
        let number = match case % 6 {
            0 => f32::NAN,
            1 => f32::INFINITY,
            2 => f32::NEG_INFINITY,
            _ => f32::from_bits(seed),
        };
        let arg = OscType::Float(number);
        let normalized = coerce_f32_normalized(&arg);
        if number.is_finite() {
            let normalized = normalized.expect("finite value accepted");
            assert!((0.0..=1.0).contains(&normalized));
        } else {
            assert!(
                normalized.is_err(),
                "seed=0x5eed2026 case={case} value={number}"
            );
            assert!(coerce_bool(&arg).is_err());
        }
        for address in [
            "/fellowshow/opacity",
            "/fellowshow/confidence",
            "/fellowshow/on_air",
        ] {
            if let Ok(command) = parse_osc(address, std::slice::from_ref(&arg)) {
                CommandDispatcher::dispatch(&command, &JsonSink).expect("dispatch succeeds");
            }
        }
        if let Ok(value) = coerce_f32_normalized(&OscType::Double(f64::from(number))) {
            assert!(value.is_finite() && (0.0..=1.0).contains(&value));
        }
    }
}

#[test]
fn osc_arbitrary_addresses_and_strings_do_not_panic_or_break_dispatch_json() {
    let pieces = [
        "🙂", "John", "\0", "\n", "\"", "\\", "ɔ", "中", "true", "OFF",
    ];
    let mut seed = 0x5eed_2027_u32;
    for case in 0..10_000 {
        seed = seed.wrapping_mul(1_664_525).wrapping_add(1_013_904_223);
        let text: String = (0..case % 20)
            .map(|i| pieces[(i + usize::try_from(seed % 10).unwrap()) % pieces.len()])
            .collect();
        let args = [OscType::String(text.clone())];
        assert!(parse_osc(&format!("/unknown/{text}"), &args).is_err());
        let command = parse_osc("/fellowshow/theme", &args).expect("theme string accepted");
        CommandDispatcher::dispatch(&command, &JsonSink).expect("dispatch succeeds");
        for address in [
            "/fellowshow/next",
            "/fellowshow/prev",
            "/fellowshow/show",
            "/fellowshow/hide",
            "/fellowshow/on_air",
        ] {
            if let Ok(command) = parse_osc(address, &args) {
                CommandDispatcher::dispatch(&command, &JsonSink).expect("dispatch succeeds");
            }
        }
    }
}
