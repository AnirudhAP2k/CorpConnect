"""
prompts/loader.py — YAML Prompt Template Loader & Manager

Loads prompt templates from app/prompts/templates/ with in-memory caching.
Supports variable interpolation, few-shot examples, and hyper-parameter defaults.
"""

from functools import lru_cache
from pathlib import Path
from typing import Any
import yaml
from pydantic import BaseModel

TEMPLATES_DIR = Path(__file__).parent / "templates"

class PromptTemplate(BaseModel):
    name: str
    description: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    system_prompt: str | None = None
    user_prompt: str | None = None
    few_shot_examples: list[dict[str, str]] | None = None

    def format_system(self, **kwargs: Any) -> str:
        if not self.system_prompt:
            return ""
        return self.system_prompt.format(**kwargs)

    def format_user(self, **kwargs: Any) -> str:
        if not self.user_prompt:
            return ""
        return self.user_prompt.format(**kwargs)


@lru_cache(maxsize=32)
def load_prompt(template_name: str) -> PromptTemplate:
    """
    Load a PromptTemplate from app/prompts/templates/{template_name}.yaml.
    Cached in memory via lru_cache for high-performance reuse.
    """
    file_path = TEMPLATES_DIR / f"{template_name}.yaml"
    if not file_path.exists():
        raise FileNotFoundError(f"Prompt template '{template_name}.yaml' not found at {file_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    return PromptTemplate(**data)
