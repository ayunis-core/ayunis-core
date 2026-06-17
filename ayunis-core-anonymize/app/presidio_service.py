from typing import List, Optional
from presidio_analyzer import AnalyzerEngine
from presidio_analyzer.nlp_engine import NlpEngineProvider
from presidio_analyzer.predefined_recognizers import GLiNERRecognizer

GLINER_ENTITY_MAPPING = {
    "person": "PERSON",
    "organization": "ORGANIZATION",
    "location": "LOCATION",
    "phone number": "PHONE_NUMBER",
    "email": "EMAIL_ADDRESS",
    "credit card number": "CREDIT_CARD",
    "date of birth": "DATE_TIME",
    "date": "DATE_TIME",
    "ip address": "IP_ADDRESS",
    "passport number": "PASSPORT",
    "iban": "IBAN_CODE",
    "social security number": "US_SSN",
    "driver license": "US_DRIVER_LICENSE",
    "url": "URL",
    "bank account number": "US_BANK_NUMBER",
    "medical record number": "MEDICAL_LICENSE",
}


class PresidioService:
    """Service for PII detection using Microsoft Presidio with GLiNER"""

    def __init__(self, config_path: str = "config/languages-config.yml"):
        """
        Initialize Presidio analyzer with GLiNER-based NER and multi-language support.

        Args:
            config_path: Path to the languages configuration YAML file
        """
        # Small spaCy models for tokenization only
        provider = NlpEngineProvider(conf_file=config_path)
        nlp_engine = provider.create_engine()

        self.analyzer = AnalyzerEngine(
            nlp_engine=nlp_engine,
            supported_languages=["de"],
        )

        # GLiNER for NER (replaces spaCy NER). The model is multilingual,
        # so German-only registration still detects PII in any language.
        gliner_recognizer = GLiNERRecognizer(
            model_name="urchade/gliner_multi_pii-v1",
            supported_language="de",
            entity_mapping=GLINER_ENTITY_MAPPING,
            flat_ner=False,
            multi_label=True,
            map_location="cpu",
        )
        self.analyzer.registry.add_recognizer(gliner_recognizer)

        # Remove spaCy NER if registered (GLiNER replaces it)
        try:
            self.analyzer.registry.remove_recognizer("SpacyRecognizer")
        except ValueError:
            pass

    def analyze(
        self,
        text: str,
        entities: Optional[List[str]] = None,
    ) -> List[dict]:
        """
        Analyze text for PII entities.

        Args:
            text: Text to analyze
            entities: Optional list of specific entity types to detect

        Returns:
            List of detected PII entities with type, position, and confidence score
        """
        results = self.analyzer.analyze(
            text=text,
            language="de",
            entities=entities,
        )

        return [
            {
                "entity_type": result.entity_type,
                "start": result.start,
                "end": result.end,
                "score": result.score,
            }
            for result in results
        ]


presidio_service: Optional[PresidioService] = None


def get_presidio_service() -> PresidioService:
    """
    Get or create the global PresidioService instance.

    Returns:
        Singleton PresidioService instance
    """
    global presidio_service
    if presidio_service is None:
        presidio_service = PresidioService()
    return presidio_service
