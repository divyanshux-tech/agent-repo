# services/pdf_service.py
import asyncio
from fpdf import FPDF
from typing import Optional

async def generate_itinerary_pdf(itinerary: dict) -> bytes:
    """Generate a clean PDF from itinerary JSON using fpdf2."""
    
    def _build():
        pdf = FPDF()
        pdf.add_page()
        pdf.set_auto_page_break(auto=True, margin=15)
        
        # Title
        pdf.set_font("Helvetica", "B", 20)
        pdf.set_text_color(233, 77, 77)  # brand red
        dest = itinerary.get("destination", "Your Trip")
        days = itinerary.get("total_days", "?")
        pdf.cell(0, 15, f"{dest} - {days} Day Itinerary", ln=True, align="C")
        
        pdf.set_font("Helvetica", "", 11)
        pdf.set_text_color(80, 80, 80)
        budget = itinerary.get("total_budget_inr", "")
        if budget:
            pdf.cell(0, 8, f"Total Budget: Rs. {budget:,}", ln=True, align="C")
        pdf.ln(5)

        # Days
        for day in itinerary.get("days", []):
            pdf.set_font("Helvetica", "B", 14)
            pdf.set_text_color(233, 77, 77)
            pdf.cell(0, 10, f"Day {day['day']}: {day.get('title', '')}", ln=True)
            
            pdf.set_font("Helvetica", "", 10)
            pdf.set_text_color(60, 60, 60)
            spend = day.get("estimated_spend_inr")
            if spend:
                pdf.cell(0, 7, f"Estimated spend: Rs. {spend:,}", ln=True)
            
            for slot in day.get("slots", []):
                pdf.set_font("Helvetica", "B", 10)
                pdf.set_text_color(40, 40, 40)
                time_str = slot.get("time", "")
                activity = slot.get("activity", "")
                cost = slot.get("estimated_cost_inr", 0)
                pdf.cell(0, 7, f"  {time_str}  {activity}  (Rs. {cost})", ln=True)
                
                desc = slot.get("description", "")
                if desc:
                    pdf.set_font("Helvetica", "", 9)
                    pdf.set_text_color(100, 100, 100)
                    pdf.multi_cell(0, 5, f"      {desc}")
            pdf.ln(4)
        
        # Tips
        tips = itinerary.get("tips", [])
        if tips:
            pdf.set_font("Helvetica", "B", 12)
            pdf.set_text_color(233, 77, 77)
            pdf.cell(0, 10, "Travel Tips", ln=True)
            pdf.set_font("Helvetica", "", 10)
            pdf.set_text_color(60, 60, 60)
            for tip in tips:
                pdf.cell(0, 7, f"  * {tip}", ln=True)

        return pdf.output()

    return await asyncio.to_thread(_build)
