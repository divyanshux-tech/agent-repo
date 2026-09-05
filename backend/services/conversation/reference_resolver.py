import re
from typing import Any, Optional


class ReferenceResolver:
    def resolve(self, transcript: str, current_state: Optional[dict[str, Any]] = None) -> Optional[str]:
        text = transcript.lower()
        state = current_state or {}

        if any(token in text for token in ["last wala", "last one", "previous", "pehle suggest"]):
            return state.get("last_candidate_reference") or "last"

        indexed = [
            (r"\b(pehla|first|1st)\b", "1"),
            (r"\b(doosra|dusra|second|2nd)\b", "2"),
            (r"\b(teesra|third|3rd)\b", "3"),
        ]
        index = None
        for pattern, value in indexed:
            if re.search(pattern, text):
                index = value
                break

        if not index:
            return None

        if "hotel" in text or "stay" in text:
            return f"H{index}"
        if "activity" in text or "rafting" in text or "adventure" in text:
            return f"A{index}"
        if "flight" in text or "train" in text or "travel" in text:
            return f"T{index}"
        return index
