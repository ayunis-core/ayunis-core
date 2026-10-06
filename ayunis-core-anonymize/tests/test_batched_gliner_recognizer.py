import unittest
from types import SimpleNamespace
from unittest.mock import Mock

from presidio_analyzer.chunkers import CharacterBasedTextChunker

from app.batched_gliner_recognizer import BatchedGLiNERRecognizer
from app.presidio_service import GLINER_BATCH_SIZE


class BatchedGLiNERRecognizerTests(unittest.TestCase):
    def test_default_batch_size_uses_the_profiled_configuration(self):
        self.assertEqual(GLINER_BATCH_SIZE, 16)

    def test_rejects_an_invalid_batch_size_before_loading_the_model(self):
        with self.assertRaisesRegex(ValueError, "greater than zero"):
            BatchedGLiNERRecognizer(batch_size=0)

    def test_batches_chunks_and_preserves_global_offsets(self):
        recognizer = object.__new__(BatchedGLiNERRecognizer)
        recognizer.batch_size = 8
        recognizer.flat_ner = False
        recognizer.multi_label = True
        recognizer.threshold = 0.3
        recognizer.name = "GLiNERRecognizer"
        recognizer.gliner_labels = ["person", "email"]
        recognizer.model_to_presidio_entity_mapping = {
            "person": "PERSON",
            "email": "EMAIL_ADDRESS",
        }
        recognizer.gliner = Mock()
        recognizer.gliner.inference.return_value = [
            [{"label": "person", "start": 6, "end": 10, "score": 0.9}],
            [{"label": "email", "start": 5, "end": 18, "score": 0.8}],
        ]
        chunks = [
            SimpleNamespace(text="Hallo Anna", start=0),
            SimpleNamespace(text="Mail anna@test.de", start=11),
        ]
        recognizer.text_chunker = Mock()
        recognizer.text_chunker.chunk.return_value = chunks
        recognizer.text_chunker.deduplicate_overlapping_entities.side_effect = (
            lambda predictions: predictions
        )

        results = recognizer.analyze(
            "Hallo Anna Mail anna@test.de",
            ["PERSON", "EMAIL_ADDRESS"],
        )

        recognizer.gliner.inference.assert_called_once_with(
            ["Hallo Anna", "Mail anna@test.de"],
            ["person", "email"],
            flat_ner=False,
            threshold=0.3,
            multi_label=True,
            batch_size=8,
        )
        self.assertEqual(
            [(result.entity_type, result.start, result.end) for result in results],
            [("PERSON", 6, 10), ("EMAIL_ADDRESS", 16, 29)],
        )

    def test_filters_predictions_to_requested_entities(self):
        recognizer = object.__new__(BatchedGLiNERRecognizer)
        recognizer.batch_size = 4
        recognizer.flat_ner = False
        recognizer.multi_label = True
        recognizer.threshold = 0.3
        recognizer.name = "GLiNERRecognizer"
        recognizer.gliner_labels = ["person", "email"]
        recognizer.model_to_presidio_entity_mapping = {
            "person": "PERSON",
            "email": "EMAIL_ADDRESS",
        }
        recognizer.gliner = Mock()
        recognizer.gliner.inference.return_value = [
            [
                {"label": "person", "start": 0, "end": 4, "score": 0.9},
                {"label": "email", "start": 5, "end": 18, "score": 0.8},
            ]
        ]
        recognizer.text_chunker = Mock()
        recognizer.text_chunker.chunk.return_value = [
            SimpleNamespace(text="Anna anna@test.de", start=0)
        ]
        recognizer.text_chunker.deduplicate_overlapping_entities.side_effect = (
            lambda predictions: predictions
        )

        results = recognizer.analyze("Anna anna@test.de", ["PERSON"])

        self.assertEqual([result.entity_type for result in results], ["PERSON"])

    def test_keeps_nested_same_type_spans_when_the_text_is_one_chunk(self):
        recognizer = _recognizer_without_a_loaded_model()
        text = "der Dani wohnt hier"
        recognizer.text_chunker = CharacterBasedTextChunker()
        self.assertEqual(len(recognizer.text_chunker.chunk(text)), 1)
        recognizer.gliner.inference.return_value = [
            [
                {"label": "person", "start": 0, "end": 8, "score": 0.85},
                {"label": "person", "start": 4, "end": 8, "score": 0.9},
            ]
        ]

        results = recognizer.analyze(text, ["PERSON"])

        self.assertEqual(
            [(result.start, result.end, result.score) for result in results],
            [(0, 8, 0.85), (4, 8, 0.9)],
        )

    def test_drops_a_duplicate_span_produced_by_overlapping_chunks(self):
        recognizer = _recognizer_without_a_loaded_model()
        chunker = CharacterBasedTextChunker()
        recognizer.text_chunker = Mock()
        recognizer.text_chunker.chunk.return_value = [
            SimpleNamespace(text="x" * 20, start=0),
            SimpleNamespace(text="x" * 20, start=10),
        ]
        recognizer.text_chunker.deduplicate_overlapping_entities = (
            chunker.deduplicate_overlapping_entities
        )
        recognizer.gliner.inference.return_value = [
            [{"label": "person", "start": 10, "end": 20, "score": 0.9}],
            [{"label": "person", "start": 0, "end": 10, "score": 0.7}],
        ]

        results = recognizer.analyze("x" * 30, ["PERSON"])

        self.assertEqual(
            [(result.start, result.end, result.score) for result in results],
            [(10, 20, 0.9)],
        )


def _recognizer_without_a_loaded_model() -> BatchedGLiNERRecognizer:
    recognizer = object.__new__(BatchedGLiNERRecognizer)
    recognizer.batch_size = 16
    recognizer.flat_ner = False
    recognizer.multi_label = True
    recognizer.threshold = 0.3
    recognizer.name = "GLiNERRecognizer"
    recognizer.gliner_labels = ["person"]
    recognizer.model_to_presidio_entity_mapping = {"person": "PERSON"}
    recognizer.gliner = Mock()
    return recognizer


if __name__ == "__main__":
    unittest.main()
