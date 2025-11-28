from typing import List, Optional
from pathlib import Path
from presidio_analyzer import AnalyzerEngine
from presidio_analyzer.nlp_engine import NlpEngineProvider


class PresidioService:
    """Service for PII detection using Microsoft Presidio"""

    def __init__(self, config_path: str = "config/languages-config.yml"):
        """
        Initialize Presidio analyzer with multi-language support

        Args:
            config_path: Path to the languages configuration YAML file
        """
        # Create NLP engine with multi-language support
        provider = NlpEngineProvider(conf_file=config_path)
        nlp_engine = provider.create_engine()

        # Initialize analyzer with English and German support
        self.analyzer = AnalyzerEngine(
            nlp_engine=nlp_engine,
            supported_languages=["en", "de"]
        )

    def analyze(
        self,
        text: str,
        language: str,
        entities: Optional[List[str]] = None
    ) -> List[dict]:
        """
        Analyze text for PII entities

        Args:
            text: Text to analyze
            language: Language code (en or de)
            entities: Optional list of specific entity types to detect

        Returns:
            List of detected PII entities with type, position, and confidence score
        """
        # Perform analysis
        results = self.analyzer.analyze(
            text=text,
            language=language,
            entities=entities
        )

        # Convert results to dict format
        return [
            {
                "entity_type": result.entity_type,
                "start": result.start,
                "end": result.end,
                "score": result.score
            }
            for result in results
        ]

    def get_supported_languages(self) -> List[str]:
        """Get list of supported languages"""
        return ["en", "de"]


# Global instance (initialized on first import)
presidio_service: Optional[PresidioService] = None


def get_presidio_service() -> PresidioService:
    """
    Get or create the global PresidioService instance

    Returns:
        Singleton PresidioService instance
    """
    global presidio_service
    if presidio_service is None:
        presidio_service = PresidioService()
    return presidio_service
