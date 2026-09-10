"""
PDF Service — Itinerary PDF Generator
Uses fpdf2 (lightweight, no system dependencies) to produce a beautiful
A4 PDF with day-by-day itinerary, spend breakdown, and tips.
Falls back gracefully if fpdf2 is not installed.
"""
import base64
import io
import logging
from typing import Any

logger = logging.getLogger(__name__)

# Slot type → emoji label
SLOT_ICONS = {
    "travel":   "🚌 Travel",
    "train":    "🚂 Train",
    "flight":   "✈️  Flight",
    "checkin":  "🏨 Check-in",
    "checkout": "🏨 Check-out",
    "explore":  "📍 Explore",
    "activity": "🎯 Activity",
    "food":     "🍽️  Food",
    "rest":     "😴 Rest",
}


def generate_itinerary_pdf(itinerary: dict[str, Any]) -> str | None:
    """
    Generate a PDF from an itinerary dict and return as base64 string.
    Returns None if fpdf2 is unavailable.
    """
    try:
        from fpdf import FPDF, XPos, YPos
    except ImportError:
        logger.warning("fpdf2 not installed — PDF generation unavailable. Run: pip install fpdf2")
        return None

    dest        = itinerary.get("destination", "Trip")
    origin      = itinerary.get("origin", "")
    total_days  = itinerary.get("total_days", len(itinerary.get("days", [])))
    budget      = itinerary.get("total_budget_inr", 0)
    spend       = itinerary.get("estimated_total_spend_inr", budget)
    tips        = itinerary.get("tips", [])
    how_to      = itinerary.get("how_to_reach", "")
    stay_rec    = itinerary.get("stay_recommendation", "")
    season      = itinerary.get("best_season", "")
    days        = itinerary.get("days", [])

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # ── Cover / Header ───────────────────────────────────────────────────────
    pdf.set_fill_color(255, 77, 121)   # #FF4D79 brand pink
    pdf.rect(0, 0, 210, 42, style="F")

    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_xy(10, 8)
    pdf.cell(190, 10, f"{dest} Trip Itinerary", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.set_font("Helvetica", "", 11)
    subtitle = f"{total_days} Days  |  Budget: Rs.{budget:,}  |  From: {origin}"
    pdf.set_xy(10, 22)
    pdf.cell(190, 8, subtitle, align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.set_text_color(30, 30, 30)
    pdf.set_xy(10, 48)

    # ── Meta section ─────────────────────────────────────────────────────────
    def section_header(text: str):
        pdf.set_fill_color(252, 235, 240)
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(200, 0, 80)
        pdf.cell(190, 7, f"  {text}", fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_text_color(30, 30, 30)
        pdf.ln(1)

    def body_text(text: str, indent: int = 5):
        pdf.set_font("Helvetica", "", 9)
        pdf.set_x(10 + indent)
        pdf.multi_cell(185 - indent, 5, text)
        pdf.ln(1)

    if how_to:
        section_header("How to Reach")
        body_text(how_to)

    if stay_rec:
        section_header("Recommended Stay")
        body_text(stay_rec)

    if season:
        section_header("Best Season")
        body_text(season)

    # ── Day Cards ────────────────────────────────────────────────────────────
    for day in days:
        pdf.ln(3)
        day_num   = day.get("day", "?")
        day_title = day.get("title", f"Day {day_num}")
        day_spend = day.get("estimated_spend_inr", 0)

        # Day header bar
        pdf.set_fill_color(255, 107, 74)   # #FF6B4A orange
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(190, 7, f"  DAY {day_num} — {day_title.upper()}", fill=True,
                 new_x=XPos.LMARGIN, new_y=YPos.NEXT)

        pdf.set_text_color(30, 30, 30)
        pdf.set_font("Helvetica", "I", 8)
        pdf.set_x(10)
        pdf.cell(190, 5, f"  Estimated spend: Rs.{day_spend:,}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.ln(1)

        for slot in day.get("slots", []):
            time     = slot.get("time", "")
            stype    = slot.get("type", "explore")
            activity = slot.get("activity", "")
            desc     = slot.get("description", "")
            cost     = slot.get("estimated_cost_inr", 0)
            tips_sl  = slot.get("tips", "")
            icon     = SLOT_ICONS.get(stype, "📍 Activity")

            # Time + activity
            pdf.set_font("Helvetica", "B", 9)
            pdf.set_x(12)
            cost_str = f"  Rs.{cost:,}" if cost else ""
            pdf.cell(190, 5, f"{time}  {icon}: {activity}{cost_str}",
                     new_x=XPos.LMARGIN, new_y=YPos.NEXT)

            # Description
            if desc:
                pdf.set_font("Helvetica", "", 8)
                pdf.set_text_color(90, 90, 90)
                pdf.set_x(20)
                pdf.multi_cell(178, 4, desc)
                pdf.set_text_color(30, 30, 30)

            # Tip
            if tips_sl:
                pdf.set_font("Helvetica", "I", 7.5)
                pdf.set_text_color(160, 80, 0)
                pdf.set_x(20)
                pdf.multi_cell(178, 4, f"Tip: {tips_sl}")
                pdf.set_text_color(30, 30, 30)

            pdf.ln(1)

    # ── Budget Summary ───────────────────────────────────────────────────────
    pdf.ln(3)
    section_header("Budget Summary")
    for day in days:
        pdf.set_font("Helvetica", "", 9)
        pdf.set_x(15)
        pdf.cell(100, 5, f"Day {day.get('day')}: {day.get('title', '')}")
        pdf.cell(80, 5, f"Rs.{day.get('estimated_spend_inr', 0):,}", align="R",
                 new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.set_font("Helvetica", "B", 9)
    pdf.set_x(15)
    pdf.cell(100, 6, "Total Estimated Spend")
    pdf.cell(80, 6, f"Rs.{spend:,}", align="R", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    savings = budget - spend
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(16, 185, 129)
    pdf.set_x(15)
    if savings >= 0:
        pdf.cell(190, 5, f"You're saving Rs.{savings:,} within budget!")
    else:
        pdf.set_text_color(200, 0, 50)
        pdf.cell(190, 5, f"Over budget by Rs.{abs(savings):,} — consider trimming activities.")
    pdf.set_text_color(30, 30, 30)

    # ── Tips ─────────────────────────────────────────────────────────────────
    if tips:
        pdf.ln(3)
        section_header("Travel Tips")
        for tip in tips:
            pdf.set_font("Helvetica", "", 9)
            pdf.set_x(14)
            pdf.multi_cell(184, 5, f"• {tip}")

    # ── Footer ───────────────────────────────────────────────────────────────
    pdf.set_y(-15)
    pdf.set_font("Helvetica", "I", 7)
    pdf.set_text_color(150, 150, 150)
    pdf.cell(0, 5, "Generated by Nura AI Travel Agent | Plan through us", align="C")

    # ── Output as base64 ─────────────────────────────────────────────────────
    raw_bytes = pdf.output()
    return base64.b64encode(raw_bytes).decode("utf-8")
