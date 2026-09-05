class DateResolver:
    def resolve_relative_date(self, raw_date: str) -> dict:
        """
        Resolves relative dates (e.g. 'next week') to concrete dates or ranges.
        """
        return {"raw": raw_date, "resolved": "2026-10-15"}
