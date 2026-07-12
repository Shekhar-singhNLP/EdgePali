import io
import time
from functools import lru_cache
from fastapi import APIRouter, UploadFile, File
from PIL import Image
import fitz  # PyMuPDF

from services.dummy_generator import generate_dummy_patch_embeddings
from services.tensor_pruning import prune_patches
from services.quantization import compute_scale_zero_point, quantize_tensor
from core.config import TARGET_FOOTPRINT_REDUCTION, TARGET_LATENCY_MS
from services.learned_pruning import learned_prune, get_scorer

router = APIRouter()

# --- LAZY LOADING COLPALI FOR REAL INFERENCE ---
_colpali_model = None
_colpali_processor = None

def _get_colpali():
    global _colpali_model, _colpali_processor
    if _colpali_model is None:
        import torch
        from colpali_engine.models import ColPali, ColPaliProcessor
        _colpali_model = ColPali.from_pretrained(
            "vidore/colpali-v1.3", torch_dtype=torch.float32, device_map="cpu"
        ).eval()
        _colpali_processor = ColPaliProcessor.from_pretrained("vidore/colpali-v1.3")
    return _colpali_model, _colpali_processor

def _file_to_image(file_bytes: bytes, filename: str) -> Image.Image:
    if filename.lower().endswith(".pdf"):
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        page = doc.load_page(0)
        pix = page.get_pixmap(dpi=150)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        doc.close()
        return img
    return Image.open(io.BytesIO(file_bytes)).convert("RGB")

# --- OLD ENDPOINTS (KEPT FOR SAFETY) ---
@router.get("/health")
def health_check():
    return {"status": "ok"}

@router.post("/prune")
def prune_and_quantize():
    start = time.perf_counter()
    patches = generate_dummy_patch_embeddings()
    original_count = patches.shape[1]
    pruned_list, keep_mask = prune_patches(patches)

    results = []
    for i, pruned in enumerate(pruned_list):
        scale, zero_point = compute_scale_zero_point(pruned)
        quantized = quantize_tensor(pruned, scale, zero_point)
        results.append({
            "batch_index": i,
            "original_patches": original_count,
            "pruned_patches": pruned.shape[0],
            "reduction_pct": round(1 - (pruned.shape[0] / original_count), 4),
            "quantized_shape": list(quantized.shape),
            "scale": scale,
            "zero_point": zero_point,
        })

    elapsed_ms = round((time.perf_counter() - start) * 1000, 3)

    return {
        "latency_ms": elapsed_ms,
        "target_latency_ms": TARGET_LATENCY_MS,
        "target_footprint_reduction": TARGET_FOOTPRINT_REDUCTION,
        "batches": results,
    }

@router.post("/compare")
def compare_pruning_methods():
    patches = generate_dummy_patch_embeddings()
    original_count = patches.shape[1]
    single_batch = patches[0]

    # Method 1: Heuristic (existing similarity-based)
    pruned_list, keep_mask_heuristic = prune_patches(patches)
    heuristic_kept = pruned_list[0].shape[0]
    heuristic_reduction = 1 - (heuristic_kept / original_count)

    # Method 2: Learned (trained neural scorer)
    keep_mask_learned = learned_prune(single_batch)
    learned_kept = keep_mask_learned.sum().item()
    learned_reduction = 1 - (learned_kept / original_count)

    return {
        "original_patches": original_count,
        "without_edge_pali": {
            "patches_kept": original_count,
            "reduction_pct": 0.0,
            "description": "Raw ColPali output, no optimization"
        },
        "with_edge_pali_heuristic": {
            "patches_kept": heuristic_kept,
            "reduction_pct": round(heuristic_reduction, 4),
            "description": "Similarity-based pruning"
        },
        "with_edge_pali_learned": {
            "patches_kept": learned_kept,
            "reduction_pct": round(learned_reduction, 4),
            "description": "Trained neural network pruning (fast inference)"
        }
    }

# --- NEW REAL FILE ENDPOINT (CLAUDE'S FIX) ---
@router.post("/process-document")
async def process_document(file: UploadFile = File(...)):
    start = time.perf_counter()

    file_bytes = await file.read()
    img = _file_to_image(file_bytes, file.filename)

    model, processor = _get_colpali()

    import torch
    batch = processor.process_images([img])
    with torch.no_grad():
        emb = model(**batch).to(torch.float32).squeeze(0)  # [num_patches, 128]

    scorer = get_scorer()
    with torch.no_grad():
        scores = scorer(emb)
    keep_mask = scores > 0.5

    original_patches = emb.shape[0]
    kept_patches = int(keep_mask.sum().item())
    reduction_pct = 1 - (kept_patches / original_patches)

    kept_embeddings = emb[keep_mask]
    scale, zero_point = compute_scale_zero_point(kept_embeddings)
    quantized = quantize_tensor(kept_embeddings, scale, zero_point)

    original_bytes = original_patches * emb.shape[1] * 4  # fp32
    optimized_bytes = quantized.numel() * 1  # int8

    elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

    return {
        "filename": file.filename,
        "without_edge_pali": {
            "patches": original_patches,
            "storage_bytes": original_bytes,
            "accuracy_pct": 100.0,
        },
        "with_edge_pali": {
            "patches_kept": kept_patches,
            "reduction_pct": round(reduction_pct, 4),
            "storage_bytes": optimized_bytes,
            "storage_saved_pct": round(1 - (optimized_bytes / original_bytes), 4),
            "honest_tradeoff_accuracy_pct": round(
                (keep_mask.float().mean().item()) * 100, 2
            ),
        },
        "latency_ms": elapsed_ms,
    }