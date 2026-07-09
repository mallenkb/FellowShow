use rosc::OscType;

use crate::command::RemoteCommand;
use crate::error::CommandError;

/// Coerce an OSC argument to a boolean value.
///
/// Handles real-world controller mismatches:
/// - `Bool(b)` -> direct passthrough
/// - `Int(0)` -> false, `Int(1)` -> true (other ints rejected)
/// - `Float(f)` -> true if >= 0.5, false otherwise
/// - `String(s)` -> "true"/"1"/"on" = true, "false"/"0"/"off" = false
pub fn coerce_bool(arg: &OscType) -> Result<bool, CommandError> {
    match arg {
        OscType::Bool(b) => Ok(*b),
        OscType::Int(0) => Ok(false),
        OscType::Int(1) => Ok(true),
        OscType::Int(i) => Err(CommandError::TypeCoercion {
            expected: "bool".into(),
            got: format!("Int({i})"),
        }),
        OscType::Float(f) => Ok(*f >= 0.5),
        OscType::String(s) => match s.to_lowercase().as_str() {
            "true" | "1" | "on" => Ok(true),
            "false" | "0" | "off" => Ok(false),
            _ => Err(CommandError::TypeCoercion {
                expected: "bool".into(),
                got: format!("String(\"{s}\")"),
            }),
        },
        other => Err(CommandError::TypeCoercion {
            expected: "bool".into(),
            got: format!("{other:?}"),
        }),
    }
}

/// Coerce an OSC argument to a normalized f32 in [0.0, 1.0].
///
/// Handles real-world controller mismatches:
/// - `Float(f)` -> clamped to [0.0, 1.0]
/// - `Double(d)` -> cast to f32, clamped
/// - `Int(i)` -> if > 1, treated as percentage (i / 100.0); if 0 or 1, literal
/// - `Long(l)` -> same as Int logic
pub fn coerce_f32_normalized(arg: &OscType) -> Result<f32, CommandError> {
    match arg {
        OscType::Float(f) => Ok(f.clamp(0.0, 1.0)),
        #[expect(
            clippy::cast_possible_truncation,
            reason = "OSC double values are small control values that fit in f32"
        )]
        OscType::Double(d) => Ok((*d as f32).clamp(0.0, 1.0)),
        #[expect(
            clippy::cast_precision_loss,
            reason = "OSC int values are small control values that fit in f32"
        )]
        OscType::Int(i) => {
            let val = if *i > 1 { *i as f32 / 100.0 } else { *i as f32 };
            Ok(val.clamp(0.0, 1.0))
        }
        #[expect(
            clippy::cast_precision_loss,
            reason = "OSC long values are small control values that fit in f32"
        )]
        OscType::Long(l) => {
            let val = if *l > 1 { *l as f32 / 100.0 } else { *l as f32 };
            Ok(val.clamp(0.0, 1.0))
        }
        other => Err(CommandError::TypeCoercion {
            expected: "float (0.0-1.0)".into(),
            got: format!("{other:?}"),
        }),
    }
}

/// Coerce an OSC argument to a String.
///
/// Accepts String directly, converts Int and Float to their string representation.
pub fn coerce_string(arg: &OscType) -> Result<String, CommandError> {
    match arg {
        OscType::String(s) => Ok(s.clone()),
        OscType::Int(i) => Ok(i.to_string()),
        OscType::Float(f) => Ok(f.to_string()),
        other => Err(CommandError::TypeCoercion {
            expected: "string".into(),
            got: format!("{other:?}"),
        }),
    }
}

/// Parse an OSC address + arguments into a `RemoteCommand`.
///
/// Handles all 8 `FellowShow` OSC addresses:
/// - `/fellowshow/next`, `/fellowshow/prev`, `/fellowshow/show`, `/fellowshow/hide` (no arguments)
/// - `/fellowshow/theme` (string argument)
/// - `/fellowshow/opacity`, `/fellowshow/confidence` (float argument, normalized to [0.0, 1.0])
/// - `/fellowshow/on_air` (bool argument)
pub fn parse_osc(address: &str, args: &[OscType]) -> Result<RemoteCommand, CommandError> {
    match address {
        "/fellowshow/next" => Ok(RemoteCommand::Next),
        "/fellowshow/prev" => Ok(RemoteCommand::Prev),
        "/fellowshow/show" => Ok(RemoteCommand::Show),
        "/fellowshow/hide" => Ok(RemoteCommand::Hide),
        "/fellowshow/theme" => {
            let arg = args.first().ok_or_else(|| CommandError::MissingArgument {
                address: address.into(),
            })?;
            let name = coerce_string(arg)?;
            Ok(RemoteCommand::Theme(name))
        }
        "/fellowshow/opacity" => {
            let arg = args.first().ok_or_else(|| CommandError::MissingArgument {
                address: address.into(),
            })?;
            let val = coerce_f32_normalized(arg)?;
            Ok(RemoteCommand::Opacity(val))
        }
        "/fellowshow/confidence" => {
            let arg = args.first().ok_or_else(|| CommandError::MissingArgument {
                address: address.into(),
            })?;
            let val = coerce_f32_normalized(arg)?;
            Ok(RemoteCommand::Confidence(val))
        }
        "/fellowshow/on_air" => {
            let arg = args.first().ok_or_else(|| CommandError::MissingArgument {
                address: address.into(),
            })?;
            let val = coerce_bool(arg)?;
            Ok(RemoteCommand::OnAir(val))
        }
        _ => Err(CommandError::UnknownAddress(address.into())),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rosc::OscType;

    // --- coerce_bool tests ---

    #[test]
    fn coerce_bool_from_true() {
        assert!(coerce_bool(&OscType::Bool(true)).unwrap());
    }

    #[test]
    fn coerce_bool_from_false() {
        assert!(!coerce_bool(&OscType::Bool(false)).unwrap());
    }

    #[test]
    fn coerce_bool_from_int_1() {
        assert!(coerce_bool(&OscType::Int(1)).unwrap());
    }

    #[test]
    fn coerce_bool_from_int_0() {
        assert!(!coerce_bool(&OscType::Int(0)).unwrap());
    }

    #[test]
    fn coerce_bool_from_int_42_errors() {
        assert!(coerce_bool(&OscType::Int(42)).is_err());
    }

    #[test]
    fn coerce_bool_from_float_1_0() {
        assert!(coerce_bool(&OscType::Float(1.0)).unwrap());
    }

    #[test]
    fn coerce_bool_from_float_0_0() {
        assert!(!coerce_bool(&OscType::Float(0.0)).unwrap());
    }

    #[test]
    fn coerce_bool_from_float_0_7() {
        assert!(coerce_bool(&OscType::Float(0.7)).unwrap());
    }

    #[test]
    fn coerce_bool_from_string_true() {
        assert!(coerce_bool(&OscType::String("true".into())).unwrap());
    }

    #[test]
    fn coerce_bool_from_string_false() {
        assert!(!coerce_bool(&OscType::String("false".into())).unwrap());
    }

    #[test]
    fn coerce_bool_from_string_on() {
        assert!(coerce_bool(&OscType::String("on".into())).unwrap());
    }

    #[test]
    fn coerce_bool_from_string_off() {
        assert!(!coerce_bool(&OscType::String("off".into())).unwrap());
    }

    // --- coerce_f32_normalized tests ---

    #[test]
    fn coerce_f32_from_float() {
        assert!(
            (coerce_f32_normalized(&OscType::Float(0.75)).unwrap() - 0.75).abs() < f32::EPSILON
        );
    }

    #[test]
    fn coerce_f32_from_int_percent() {
        assert!((coerce_f32_normalized(&OscType::Int(75)).unwrap() - 0.75).abs() < f32::EPSILON);
    }

    #[test]
    fn coerce_f32_from_int_0() {
        assert!(coerce_f32_normalized(&OscType::Int(0)).unwrap().abs() < f32::EPSILON);
    }

    #[test]
    fn coerce_f32_from_int_1_literal() {
        assert!((coerce_f32_normalized(&OscType::Int(1)).unwrap() - 1.0).abs() < f32::EPSILON);
    }

    #[test]
    fn coerce_f32_from_double() {
        let result = coerce_f32_normalized(&OscType::Double(0.8)).unwrap();
        assert!((result - 0.8).abs() < 0.001);
    }

    #[test]
    fn coerce_f32_clamps_high() {
        assert!((coerce_f32_normalized(&OscType::Float(1.5)).unwrap() - 1.0).abs() < f32::EPSILON);
    }

    #[test]
    fn coerce_f32_clamps_low() {
        assert!(coerce_f32_normalized(&OscType::Float(-0.5)).unwrap().abs() < f32::EPSILON);
    }

    // --- coerce_string tests ---

    #[test]
    fn coerce_string_from_string() {
        assert_eq!(
            coerce_string(&OscType::String("Dark".into())).unwrap(),
            "Dark"
        );
    }

    #[test]
    fn coerce_string_from_int() {
        assert_eq!(coerce_string(&OscType::Int(2)).unwrap(), "2");
    }

    // --- parse_osc tests ---

    #[test]
    fn parse_osc_next() {
        assert_eq!(
            parse_osc("/fellowshow/next", &[]).unwrap(),
            RemoteCommand::Next
        );
    }

    #[test]
    fn parse_osc_prev() {
        assert_eq!(
            parse_osc("/fellowshow/prev", &[]).unwrap(),
            RemoteCommand::Prev
        );
    }

    #[test]
    fn parse_osc_show() {
        assert_eq!(
            parse_osc("/fellowshow/show", &[]).unwrap(),
            RemoteCommand::Show
        );
    }

    #[test]
    fn parse_osc_hide() {
        assert_eq!(
            parse_osc("/fellowshow/hide", &[]).unwrap(),
            RemoteCommand::Hide
        );
    }

    #[test]
    fn parse_osc_theme() {
        assert_eq!(
            parse_osc("/fellowshow/theme", &[OscType::String("Minimal".into())]).unwrap(),
            RemoteCommand::Theme("Minimal".into())
        );
    }

    #[test]
    fn parse_osc_opacity() {
        assert_eq!(
            parse_osc("/fellowshow/opacity", &[OscType::Float(0.5)]).unwrap(),
            RemoteCommand::Opacity(0.5)
        );
    }

    #[test]
    fn parse_osc_confidence_from_int_percent() {
        let result = parse_osc("/fellowshow/confidence", &[OscType::Int(80)]).unwrap();
        assert_eq!(result, RemoteCommand::Confidence(0.8));
    }

    #[test]
    fn parse_osc_on_air_from_int() {
        assert_eq!(
            parse_osc("/fellowshow/on_air", &[OscType::Int(1)]).unwrap(),
            RemoteCommand::OnAir(true)
        );
    }

    #[test]
    fn parse_osc_unknown_address_errors() {
        let result = parse_osc("/fellowshow/unknown", &[]);
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Unknown OSC address"));
    }

    #[test]
    fn parse_osc_opacity_missing_arg_errors() {
        let result = parse_osc("/fellowshow/opacity", &[]);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Missing argument"));
    }

    #[test]
    fn parse_osc_theme_missing_arg_errors() {
        let result = parse_osc("/fellowshow/theme", &[]);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Missing argument"));
    }

    #[test]
    fn parse_osc_on_air_missing_arg_errors() {
        let result = parse_osc("/fellowshow/on_air", &[]);
        assert!(result.is_err());
    }

    #[test]
    fn parse_osc_confidence_missing_arg_errors() {
        let result = parse_osc("/fellowshow/confidence", &[]);
        assert!(result.is_err());
    }

    // --- Cross-controller scenario tests ---

    #[test]
    fn parse_osc_on_air_from_float() {
        // TouchOSC sends Float for toggles
        assert_eq!(
            parse_osc("/fellowshow/on_air", &[OscType::Float(1.0)]).unwrap(),
            RemoteCommand::OnAir(true)
        );
        assert_eq!(
            parse_osc("/fellowshow/on_air", &[OscType::Float(0.0)]).unwrap(),
            RemoteCommand::OnAir(false)
        );
    }

    #[test]
    fn parse_osc_opacity_from_int_percent() {
        // Companion sends Int 0-100
        assert_eq!(
            parse_osc("/fellowshow/opacity", &[OscType::Int(50)]).unwrap(),
            RemoteCommand::Opacity(0.5)
        );
    }

    #[test]
    fn parse_osc_on_air_from_string() {
        // Some controllers send String "true"/"false"
        assert_eq!(
            parse_osc("/fellowshow/on_air", &[OscType::String("on".into())]).unwrap(),
            RemoteCommand::OnAir(true)
        );
    }
}
