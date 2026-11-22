use std::path::{Path, PathBuf};

use fellowshow_detection::{
    semantic::{embedder::TextEmbedder, index::VectorIndex},
    DetectionError, HnswVectorIndex, OnnxEmbedder, SemanticDetector,
};

const INT8: &str = "models/qwen3-embedding-0.6b-int8/model_quantized.onnx";
const FP32: &str = "models/qwen3-embedding-0.6b/model.onnx";
const TOKENIZER: &str = "models/qwen3-embedding-0.6b/tokenizer.json";

pub fn development_root() -> Option<PathBuf> {
    #[cfg(debug_assertions)]
    {
        Path::new(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .map(Path::to_owned)
    }
    #[cfg(not(debug_assertions))]
    {
        None
    }
}

fn model_candidates(roots: &[PathBuf]) -> impl Iterator<Item = (&Path, PathBuf)> {
    roots
        .iter()
        .filter(|root| root.join(TOKENIZER).is_file())
        .flat_map(|root| {
            [INT8, FP32]
                .into_iter()
                .map(move |name| root.join(name))
                .filter(|model| model.is_file())
                .map(move |model| (root.as_path(), model))
        })
}

fn load(root: &Path, model: &Path) -> Result<SemanticDetector, DetectionError> {
    let embedder = OnnxEmbedder::load(model, &root.join(TOKENIZER))?;
    let index = HnswVectorIndex::load(
        &root.join("embeddings/kjv-qwen3-0.6b.bin"),
        &root.join("embeddings/kjv-qwen3-0.6b-ids.bin"),
        embedder.dimension(),
    )?;
    log::info!(
        "Loaded {} verse embeddings from {}",
        index.len(),
        root.display()
    );
    Ok(SemanticDetector::new(Box::new(embedder), Box::new(index)))
}

pub fn load_semantic(roots: &[PathBuf]) -> Option<SemanticDetector> {
    for (root, model) in model_candidates(roots) {
        match load(root, &model) {
            Ok(detector) => return Some(detector),
            Err(error) => log::warn!(
                "Could not load semantic search assets for {}: {error}",
                model.display()
            ),
        }
    }
    log::info!("Semantic search unavailable. Searched {roots:?}");
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{fs, io};

    fn asset(root: &Path, relative: &str) -> io::Result<()> {
        let path = root.join(relative);
        fs::create_dir_all(path.parent().expect("asset directory"))?;
        fs::write(path, [])
    }

    #[test]
    fn app_data_wins_even_when_only_resources_have_int8() -> io::Result<()> {
        let dir = tempfile::tempdir()?;
        let roots = [dir.path().join("app data"), dir.path().join("resources")];
        asset(&roots[0], FP32)?;
        asset(&roots[1], INT8)?;
        asset(&roots[1], TOKENIZER)?;
        assert_eq!(
            model_candidates(&roots).next(),
            Some((roots[1].as_path(), roots[1].join(INT8)))
        );
        asset(&roots[0], TOKENIZER)?;
        assert_eq!(
            model_candidates(&roots).next(),
            Some((roots[0].as_path(), roots[0].join(FP32)))
        );
        Ok(())
    }

    #[test]
    fn prefers_int8_within_a_root() -> io::Result<()> {
        let dir = tempfile::tempdir()?;
        let root = dir.path();
        for path in [FP32, INT8, TOKENIZER] {
            asset(root, path)?;
        }
        assert_eq!(
            model_candidates(&[root.to_owned()]).next(),
            Some((root, root.join(INT8)))
        );
        Ok(())
    }

    #[test]
    fn missing_installation_does_not_search_outside_supplied_roots() -> io::Result<()> {
        let dir = tempfile::tempdir()?;
        let dev = dir.path().join("source tree");
        asset(&dev, INT8)?;
        asset(&dev, TOKENIZER)?;
        assert_eq!(
            model_candidates(&[dir.path().join("app"), dir.path().join("resources")]).next(),
            None
        );
        #[cfg(not(debug_assertions))]
        assert_eq!(development_root(), None);
        Ok(())
    }
}
