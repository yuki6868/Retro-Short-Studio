from dataclasses import dataclass


@dataclass(frozen=True)
class PreviewSettings:
    default_font: str
    font_size: int