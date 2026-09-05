import logging
from typing import Dict, Any, List
from models.trip import VoiceTripState

logger = logging.getLogger(__name__)

class AmbiguityManager:
    def __init__(self):
        self.location_mapping = {
            "bombay": "Mumbai",
            "madras": "Chennai",
            "poona": "Pune",
            "dilli": "Delhi"
        }
        
    def evaluate_entities(self, entities: Dict[str, Any], context: Dict[str, Any] = None) -> List[str]:
        """
        Evaluates structured entities and returns progressive clarification questions.
        Uses confidence thresholds:
        < 0.70: Ask clarification
        0.70 - 0.90: Contextual verification
        > 0.90: Accept silently
        Only returns ONE question at a time.
        """
        clarifications = []
        context = context or {}
        
        # 1. Check Location Ambiguity (Destination & Origin)
        for loc_key in ["destination", "origin"]:
            loc = entities.get(loc_key)
            if loc:
                confidence = loc.get("confidence", 1.0)
                raw = loc.get("raw", "")
                canonical = loc.get("canonical", raw)
                
                if confidence < 0.70:
                    clarifications.append(f"Aap {raw} mein specific kis jagah ke baare mein baat kar rahe hain?")
                elif 0.70 <= confidence <= 0.90:
                    clarifications.append(f"Aap {canonical} ki baat kar rahe hain na?")
        
        # 2. Check Date Ambiguity
        temporal = entities.get("temporal")
        if temporal and temporal.get("is_ambiguous"):
            month = temporal.get("month")
            if month:
                clarifications.append(f"Aap {temporal.get('raw_utterance', 'is mahine')} mein exactly kis date ke aas-paas soch rahe hain?")
            else:
                clarifications.append(f"Aap exactly kaunsi date ya month ke aas-paas soch rahe hain?")
                
        # 3. Check Budget Ambiguity
        budget = entities.get("budget")
        if budget and budget.get("amount"):
            if budget.get("scope") not in ["per_person", "total", "per_night"]:
                clarifications.append(f"Jo budget aapne bataya (₹{budget['amount']}), yeh per person hai ya total?")
        
        # Assumption Engine Check
        if not clarifications:
            dest = entities.get("destination")
            orig = entities.get("origin")
            if dest and not orig:
                # We assume Delhi for now instead of asking "kaha se?". We can clarify if they want to book.
                pass
                
        # Return only the most important clarification
        if clarifications:
            return [clarifications[0]]
            
        return []
        
    def resolve_geocoding(self, raw_location: str) -> Dict[str, Any]:
        """
        Mock geocoding to resolve canonical locations.
        """
        clean_raw = raw_location.lower().strip()
        canonical = self.location_mapping.get(clean_raw, raw_location.title())
        # Simulate different confidence levels
        if clean_raw in self.location_mapping:
            confidence = 0.95
        elif len(clean_raw) < 4:
            confidence = 0.6 # Low confidence for very short abbreviations
        else:
            confidence = 0.8 # Contextual verification band
            
        return {
            "raw": raw_location,
            "canonical": canonical,
            "type": "city",
            "confidence": confidence,
            "is_ambiguous": False
        }

