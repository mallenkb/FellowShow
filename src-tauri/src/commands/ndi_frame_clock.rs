use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Duration;

use tauri::async_runtime::JoinHandle;
use tauri::Emitter;

/// Hidden `WebKit` pages throttle DOM timers independently of inactive scheduling.
/// Native ticks keep the output renderer paced without making its window visible.
#[derive(Default)]
pub struct NdiFrameClocks {
    tasks: Mutex<HashMap<String, JoinHandle<()>>>,
}

impl NdiFrameClocks {
    pub fn start(
        &self,
        output_id: &str,
        fps: u32,
        window: tauri::WebviewWindow,
    ) -> Result<(), String> {
        self.start_with(output_id, fps, move || {
            window
                .emit_to(
                    tauri::EventTarget::webview_window(window.label()),
                    "broadcast:ndi-frame",
                    (),
                )
                .map_err(|error| error.to_string())
        })
    }

    fn start_with(
        &self,
        output_id: &str,
        fps: u32,
        mut tick: impl FnMut() -> Result<(), String> + Send + 'static,
    ) -> Result<(), String> {
        let mut tasks = self.tasks.lock().map_err(|error| error.to_string())?;
        if let Some(previous) = tasks.remove(output_id) {
            previous.abort();
        }
        let label = output_id.to_owned();
        let period = Duration::from_nanos(1_000_000_000 / u64::from(fps.clamp(1, 60)));
        let task = tauri::async_runtime::spawn(async move {
            let mut interval = tokio::time::interval(period);
            interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
            loop {
                interval.tick().await;
                if let Err(error) = tick() {
                    log::warn!("NDI frame clock stopped for {label}: {error}");
                    break;
                }
            }
        });
        tasks.insert(output_id.to_owned(), task);
        Ok(())
    }

    pub fn stop(&self, output_id: &str) -> Result<(), String> {
        if let Some(task) = self
            .tasks
            .lock()
            .map_err(|error| error.to_string())?
            .remove(output_id)
        {
            task.abort();
        }
        Ok(())
    }

    pub fn stop_all(&self) -> Result<(), String> {
        for (_, task) in self
            .tasks
            .lock()
            .map_err(|error| error.to_string())?
            .drain()
        {
            task.abort();
        }
        Ok(())
    }
}

impl Drop for NdiFrameClocks {
    fn drop(&mut self) {
        let tasks = self
            .tasks
            .get_mut()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        for (_, task) in tasks.drain() {
            task.abort();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;
    use std::time::Instant;

    #[tokio::test]
    async fn native_clock_paces_frames_and_stop_cancels_it() {
        let clocks = NdiFrameClocks::default();
        let (send, mut receive) = tokio::sync::mpsc::unbounded_channel();
        clocks
            .start_with("main", 24, move || {
                send.send(Instant::now()).map_err(|error| error.to_string())
            })
            .unwrap();
        let times = tokio::time::timeout(Duration::from_millis(750), async {
            let mut times = Vec::new();
            for _ in 0..5 {
                times.push(receive.recv().await.unwrap());
            }
            times
        })
        .await
        .unwrap();
        assert!(times[4].duration_since(times[0]) >= Duration::from_millis(120));
        clocks.stop("main").unwrap();
        tokio::time::sleep(Duration::from_millis(100)).await;
        while receive.try_recv().is_ok() {}
        tokio::time::sleep(Duration::from_millis(100)).await;
        assert!(receive.try_recv().is_err());
    }

    #[tokio::test]
    async fn replacing_an_output_clock_cancels_its_previous_ticks() {
        let clocks = NdiFrameClocks::default();
        let old = Arc::new(AtomicUsize::new(0));
        let counter = Arc::clone(&old);
        clocks
            .start_with("main", 60, move || {
                counter.fetch_add(1, Ordering::SeqCst);
                Ok(())
            })
            .unwrap();
        tokio::time::sleep(Duration::from_millis(50)).await;
        let (send, mut receive) = tokio::sync::mpsc::unbounded_channel();
        clocks
            .start_with("main", 24, move || {
                send.send(()).map_err(|error| error.to_string())
            })
            .unwrap();
        tokio::time::timeout(Duration::from_millis(250), receive.recv())
            .await
            .unwrap()
            .unwrap();
        let stopped_count = old.load(Ordering::SeqCst);
        tokio::time::sleep(Duration::from_millis(100)).await;
        assert_eq!(old.load(Ordering::SeqCst), stopped_count);
        clocks.stop_all().unwrap();
    }

    #[tokio::test]
    async fn a_failed_frame_sink_does_not_keep_ticking() {
        let clocks = NdiFrameClocks::default();
        let attempts = Arc::new(AtomicUsize::new(0));
        let counter = Arc::clone(&attempts);
        clocks
            .start_with("main", 60, move || {
                counter.fetch_add(1, Ordering::SeqCst);
                Err("Output window closed".to_owned())
            })
            .unwrap();
        tokio::time::sleep(Duration::from_millis(100)).await;
        assert_eq!(attempts.load(Ordering::SeqCst), 1);
    }

    #[tokio::test]
    async fn stopping_one_output_keeps_the_other_clock_running() {
        let clocks = NdiFrameClocks::default();
        let first = Arc::new(AtomicUsize::new(0));
        let second = Arc::new(AtomicUsize::new(0));
        let counter = Arc::clone(&first);
        clocks
            .start_with("main", 24, move || {
                counter.fetch_add(1, Ordering::SeqCst);
                Ok(())
            })
            .unwrap();
        let counter = Arc::clone(&second);
        clocks
            .start_with("alt", 60, move || {
                counter.fetch_add(1, Ordering::SeqCst);
                Ok(())
            })
            .unwrap();
        tokio::time::sleep(Duration::from_millis(100)).await;
        assert!(first.load(Ordering::SeqCst) > 0);
        assert!(second.load(Ordering::SeqCst) > 0);
        clocks.stop("main").unwrap();
        tokio::time::sleep(Duration::from_millis(50)).await;
        let first_stopped = first.load(Ordering::SeqCst);
        let second_running = second.load(Ordering::SeqCst);
        tokio::time::sleep(Duration::from_millis(100)).await;
        assert_eq!(first.load(Ordering::SeqCst), first_stopped);
        assert!(second.load(Ordering::SeqCst) > second_running);
        clocks.stop_all().unwrap();
    }
}
