class LocationResolver:
    def resolve_location(self, raw_location: str) -> dict:
        """
        Resolves a location name to coordinates and canonical name.
        """
        return {"raw": raw_location, "canonical": raw_location.title()}
