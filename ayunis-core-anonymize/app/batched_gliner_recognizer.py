from presidio_analyzer import AnalysisExplanation, RecognizerResult
from presidio_analyzer.predefined_recognizers import GLiNERRecognizer


class BatchedGLiNERRecognizer(GLiNERRecognizer):
    """Runs Presidio's existing text chunks through GLiNER in batches."""

    def __init__(self, batch_size: int, **kwargs):
        if batch_size < 1:
            raise ValueError("batch_size must be greater than zero")
        self.batch_size = batch_size
        super().__init__(**kwargs)

    def analyze(self, text: str, entities: list[str], nlp_artifacts=None):
        chunks = self.text_chunker.chunk(text)
        if not chunks:
            return []

        labels = self._input_labels(entities)
        predictions_by_chunk = self.gliner.inference(
            [chunk.text for chunk in chunks],
            labels,
            flat_ner=self.flat_ner,
            threshold=self.threshold,
            multi_label=self.multi_label,
            batch_size=self.batch_size,
        )
        predictions = [
            result
            for chunk, chunk_predictions in zip(
                chunks, predictions_by_chunk, strict=True
            )
            for result in self._results(chunk_predictions, chunk.start, entities)
        ]
        # Presidio dedups only after merging multiple chunks. A single chunk
        # has no overlap duplicates, and score-based dedup would drop a longer
        # lower-scoring span before the caller can keep the outermost one.
        if len(chunks) == 1:
            return predictions
        return self.text_chunker.deduplicate_overlapping_entities(predictions)

    def _input_labels(self, entities: list[str]) -> list[str]:
        labels = list(self.gliner_labels)
        mapped_entities = self.model_to_presidio_entity_mapping.values()
        labels.extend(
            entity
            for entity in entities
            if entity not in mapped_entities and entity not in labels
        )
        return labels

    def _results(self, predictions, offset: int, entities: list[str]):
        results = []
        for prediction in predictions:
            entity = self.model_to_presidio_entity_mapping.get(
                prediction["label"], prediction["label"]
            )
            if entities and entity not in entities:
                continue
            results.append(
                RecognizerResult(
                    entity_type=entity,
                    start=prediction["start"] + offset,
                    end=prediction["end"] + offset,
                    score=prediction["score"],
                    analysis_explanation=AnalysisExplanation(
                        recognizer=self.name,
                        original_score=prediction["score"],
                        textual_explanation=f"Identified as {entity} by GLiNER",
                    ),
                )
            )
        return results
