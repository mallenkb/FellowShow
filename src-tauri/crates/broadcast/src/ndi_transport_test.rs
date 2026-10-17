//! Opt-in test against the installed NDI runtime, constrained to loopback.
use super::*;
use std::ffi::CStr;
use std::time::{Duration, Instant};

#[repr(C)]
struct NdiSource {
    name: *const i8,
    address: *const i8,
}

#[repr(C)]
struct NdiReceiveCreate {
    source: NdiSource,
    color_format: i32,
    bandwidth: i32,
    allow_video_fields: bool,
    name: *const i8,
}

type ReceiverCreate = unsafe extern "C" fn(*const NdiReceiveCreate) -> *mut c_void;
type ReceiverDestroy = unsafe extern "C" fn(*mut c_void);
type ReceiverCapture =
    unsafe extern "C" fn(*mut c_void, *mut NdiVideoFrameV2, *mut c_void, *mut c_void, u32) -> i32;
type ReceiverFree = unsafe extern "C" fn(*mut c_void, *const NdiVideoFrameV2);
type SenderSource = unsafe extern "C" fn(NdiSendInstance) -> *const NdiSource;

fn require_loopback_configuration() {
    let path = PathBuf::from(std::env::var_os("NDI_CONFIG_DIR").expect("set NDI_CONFIG_DIR"))
        .join("ndi-config.v1.json");
    let config: serde_json::Value = serde_json::from_slice(&std::fs::read(path).unwrap()).unwrap();
    assert_eq!(
        config["ndi"]["adapters"]["allowed"],
        serde_json::json!(["127.0.0.1"])
    );
    assert_eq!(config["ndi"]["networks"]["discovery"], "127.0.0.1");
    assert_eq!(config["ndi"]["multicast"]["send"]["enable"], false);
}

struct CapturedVideo {
    dimensions: (i32, i32),
    rate: (i32, i32),
    pixel: Vec<u8>,
}

struct NativeReceiver {
    _library: Library,
    instance: *mut c_void,
    destroy: ReceiverDestroy,
    capture: ReceiverCapture,
    free: ReceiverFree,
}

impl NativeReceiver {
    fn new(session: &ActiveNdiSession) -> Self {
        // SAFETY: resolve_library_path returns the same installed NDI library used by sender.
        let library = unsafe { Library::new(resolve_library_path().unwrap()) }.unwrap();
        let source_fn = *load_symbol::<SenderSource>(
            &library,
            b"NDIlib_send_get_source_name\0",
            "NDIlib_send_get_source_name",
        )
        .unwrap();
        let create_fn = *load_symbol::<ReceiverCreate>(
            &library,
            b"NDIlib_recv_create_v3\0",
            "NDIlib_recv_create_v3",
        )
        .unwrap();
        let destroy = *load_symbol::<ReceiverDestroy>(
            &library,
            b"NDIlib_recv_destroy\0",
            "NDIlib_recv_destroy",
        )
        .unwrap();
        let capture = *load_symbol::<ReceiverCapture>(
            &library,
            b"NDIlib_recv_capture_v2\0",
            "NDIlib_recv_capture_v2",
        )
        .unwrap();
        let free = *load_symbol::<ReceiverFree>(
            &library,
            b"NDIlib_recv_free_video_v2\0",
            "NDIlib_recv_free_video_v2",
        )
        .unwrap();
        // SAFETY: function pointer and sender are valid for the live session.
        let source = unsafe { source_fn(session.sender).as_ref() }.unwrap();
        // The sender API can return a name-only source for its local process.
        if !source.address.is_null() {
            // SAFETY: a non-null SDK source URL is null-terminated and owned by sender.
            let address = unsafe { CStr::from_ptr(source.address) }.to_str().unwrap();
            assert!(
                address.starts_with("127.0.0.1:"),
                "NDI test must stay on loopback: {address}"
            );
        }
        let create = NdiReceiveCreate {
            source: NdiSource {
                name: source.name,
                address: source.address,
            },
            color_format: 0, // BGRX/BGRA, as defined by the NDI receive API.
            bandwidth: 100,
            allow_video_fields: false,
            name: std::ptr::null(),
        };
        // SAFETY: source belongs to live sender; creation data lasts through this call.
        let instance = unsafe { create_fn(std::ptr::from_ref(&create)) };
        assert!(!instance.is_null());
        Self {
            _library: library,
            instance,
            destroy,
            capture,
            free,
        }
    }

    fn capture_video(&self) -> Option<CapturedVideo> {
        // SAFETY: all-zero frame is an empty output descriptor, initialized by capture.
        let mut frame: NdiVideoFrameV2 = unsafe { std::mem::zeroed() };
        // SAFETY: receiver valid; only video requested, SDK fills frame descriptor.
        if unsafe {
            (self.capture)(
                self.instance,
                std::ptr::from_mut(&mut frame),
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                100,
            )
        } != 1
        {
            return None;
        }
        // SAFETY: captured video has at least one pixel; SDK owns it until free.
        let pixel = unsafe { std::slice::from_raw_parts(frame.p_data, 4) }.to_vec();
        let video = CapturedVideo {
            dimensions: (frame.xres, frame.yres),
            rate: (frame.frame_rate_n, frame.frame_rate_d),
            pixel,
        };
        // SAFETY: captured frame belongs to receiver, and is freed exactly once.
        unsafe { (self.free)(self.instance, std::ptr::from_ref(&frame)) };
        Some(video)
    }
}

impl Drop for NativeReceiver {
    fn drop(&mut self) {
        // SAFETY: receiver is valid and capture_video frees every captured frame.
        unsafe { (self.destroy)(self.instance) };
    }
}

#[test]
#[ignore = "requires installed NDI runtime and a loopback-only NDI_CONFIG_DIR"]
fn installed_runtime_transports_video_with_configured_rate_and_alpha() {
    require_loopback_configuration();
    for (mode, expected) in [
        (NdiAlphaMode::NoneOpaque, [40_u8, 80, 240, 255]),
        (NdiAlphaMode::StraightAlpha, [40, 80, 240, 128]),
        (NdiAlphaMode::PremultipliedAlpha, [20, 40, 120, 128]),
    ] {
        for rate in [
            NdiFrameRate::Fps24,
            NdiFrameRate::Fps30,
            NdiFrameRate::Fps60,
        ] {
            let mut session = ActiveNdiSession::create(NdiStartRequest {
                source_name: format!("FellowShow transport verification {mode:?}"),
                resolution: NdiResolution::R720p,
                frame_rate: rate,
                alpha_mode: mode,
            })
            .expect("installed NDI runtime must create a sender");
            let receiver = NativeReceiver::new(&session);
            let rgba = [
                240_u8,
                80,
                40,
                if mode == NdiAlphaMode::NoneOpaque {
                    0
                } else {
                    128
                },
            ]
            .repeat(1280 * 720);
            assert!(matches!(
                session.send_frame_rgba(1280, 720, &[]),
                Err(NdiError::InvalidFrameBufferSize { .. })
            ));
            assert!(matches!(
                session.send_frame_rgba(1, 1, &[0; 4]),
                Err(NdiError::FrameDimensionsMismatch { .. })
            ));
            let deadline = Instant::now() + Duration::from_secs(8);
            let video = loop {
                assert!(
                    Instant::now() < deadline,
                    "NDI sender did not deliver a local frame"
                );
                session.send_frame_rgba(1280, 720, &rgba).unwrap();
                if let Some(video) = receiver.capture_video() {
                    break video;
                }
            };
            assert_eq!(video.dimensions, (1280, 720));
            assert_eq!(
                video.rate.0,
                i32::try_from(rate.fps()).unwrap() * video.rate.1,
                "selected fps must arrive unchanged"
            );
            for (actual, expected) in video.pixel.into_iter().zip(expected) {
                assert!(
                    actual.abs_diff(expected) <= 3,
                    "NDI {mode:?} pixel channel {actual} != {expected}"
                );
            }
        }
    }
}

#[test]
#[ignore = "requires installed NDI runtime and a loopback-only NDI_CONFIG_DIR"]
fn installed_runtime_keeps_second_output_running_when_first_stops() {
    require_loopback_configuration();
    let mut runtime = NdiRuntime::default();
    for id in ["first", "second"] {
        runtime
            .start(
                id.to_owned(),
                NdiStartRequest {
                    source_name: format!("FellowShow independent output {id}"),
                    resolution: NdiResolution::R720p,
                    frame_rate: NdiFrameRate::Fps24,
                    alpha_mode: NdiAlphaMode::StraightAlpha,
                },
            )
            .unwrap();
    }
    let receiver = NativeReceiver::new(runtime.sessions.get("second").unwrap());
    runtime.stop("first");
    assert!(!runtime.is_active("first"));
    assert!(runtime.is_active("second"));
    let rgba = [200_u8, 100, 50, 255].repeat(1280 * 720);
    let deadline = Instant::now() + Duration::from_secs(8);
    loop {
        assert!(
            Instant::now() < deadline,
            "Stopping one output interrupted another output"
        );
        runtime.send_frame_rgba("second", 1280, 720, &rgba).unwrap();
        if let Some(video) = receiver.capture_video() {
            assert_eq!(video.dimensions, (1280, 720));
            break;
        }
    }
    drop(receiver);
    runtime.stop_all();
    assert!(!runtime.any_active());
}
